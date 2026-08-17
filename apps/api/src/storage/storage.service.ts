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
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash, randomUUID } from "crypto";
import { extname } from "path";
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
