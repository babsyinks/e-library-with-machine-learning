import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash, randomUUID } from "crypto";
import { execFile as execFileCallback } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { extname, join } from "path";
import { promisify } from "util";
import { MalwareScannerService } from "./malware-scanner.service";

const ALLOWED: Record<
  string,
  { extensions: string[]; magic: (buffer: Buffer) => boolean }
> = {
  "application/pdf": {
    extensions: [".pdf"],
    magic: (b) => b.subarray(0, 5).toString() === "%PDF-",
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extensions: [".docx"],
    magic: (b) =>
      b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
  },
  "application/epub+zip": {
    extensions: [".epub"],
    magic: (b) =>
      b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
  },
};
const execFile = promisify(execFileCallback);

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly publicClient: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly config: ConfigService,
    private readonly scanner: MalwareScannerService,
  ) {
    const shared = {
      region: config.get<string>("S3_REGION", "us-east-1"),
      forcePathStyle: config.get("S3_FORCE_PATH_STYLE", "true") === "true",
      credentials: {
        accessKeyId: config.getOrThrow<string>("S3_ACCESS_KEY"),
        secretAccessKey: config.getOrThrow<string>("S3_SECRET_KEY"),
      },
    };
    this.client = new S3Client({
      ...shared,
      endpoint: config.getOrThrow("S3_ENDPOINT"),
    });
    this.publicClient = new S3Client({
      ...shared,
      endpoint: config.get(
        "S3_PUBLIC_ENDPOINT",
        config.getOrThrow("S3_ENDPOINT"),
      ),
    });
    this.bucket = config.getOrThrow("S3_BUCKET");
  }

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
      } catch (error) {
        this.logger.error(
          `Could not initialize object storage bucket: ${String(error)}`,
        );
      }
    }
  }

  async store(file: Express.Multer.File, resourceId: string, version: number) {
    this.validate(file);
    await this.scanner.assertClean(file.buffer);
    const safeExtension = extname(file.originalname).toLowerCase();
    const objectKey = `resources/${resourceId}/v${version}-${randomUUID()}${safeExtension}`;
    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          checksum,
          originalName: encodeURIComponent(file.originalname),
        },
      }),
    );
    const storedObject = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
    if (storedObject.ContentLength !== file.size) {
      throw new Error(
        `Stored resource size mismatch: expected ${file.size} bytes, received ${storedObject.ContentLength ?? "unknown"}`,
      );
    }
    return {
      objectKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      checksum,
    };
  }

  async signedReadUrl(
    objectKey: string,
    originalName: string,
    preview: boolean,
  ) {
    return getSignedUrl(
      this.publicClient,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ResponseContentDisposition: `${preview ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(originalName)}`,
      }),
      { expiresIn: 5 * 60 },
    );
  }

  async signedPdfPreviewUrl(
    objectKey: string,
    resourceId: string,
    version: number,
    originalName: string,
  ) {
    const previewKey = `previews/${resourceId}/v${version}.pdf`;
    const source = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
    if (!source.Body) throw new Error("Stored PDF has no content");
    const sourceBytes = await source.Body.transformToByteArray();
    const directory = await mkdtemp(join(tmpdir(), "scholarshelf-preview-"));
    const inputPath = join(directory, "source.pdf");
    const outputPath = join(directory, "preview.pdf");
    try {
      await writeFile(inputPath, sourceBytes);
      const { stdout } = await execFile("qpdf", ["--show-npages", inputPath]);
      const pageCount = Number.parseInt(stdout.trim(), 10);
      if (!Number.isInteger(pageCount) || pageCount < 1) {
        throw new Error("Could not determine the PDF page count");
      }
      const previewPages = Math.min(pageCount, 5);
      await execFile("qpdf", [
        inputPath,
        "--pages",
        ".",
        `1-${previewPages}`,
        "--",
        outputPath,
      ]);
      const previewBytes = await readFile(outputPath);
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: previewKey,
          Body: previewBytes,
          ContentType: "application/pdf",
          Metadata: { originalName: encodeURIComponent(originalName) },
        }),
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
    return this.signedReadUrl(previewKey, originalName, true);
  }

  private validate(file: Express.Multer.File) {
    if (!file?.buffer?.length)
      throw new BadRequestException("A resource file is required");
    const maxBytes = this.config.get<number>("MAX_UPLOAD_MB", 25) * 1024 * 1024;
    if (file.size > maxBytes)
      throw new BadRequestException(
        `File must not exceed ${this.config.get("MAX_UPLOAD_MB", 25)} MB`,
      );
    const rule = ALLOWED[file.mimetype];
    const extension = extname(file.originalname).toLowerCase();
    if (
      !rule ||
      !rule.extensions.includes(extension) ||
      !rule.magic(file.buffer)
    ) {
      throw new BadRequestException(
        "Only valid PDF, DOCX and EPUB files are accepted",
      );
    }
  }
}
