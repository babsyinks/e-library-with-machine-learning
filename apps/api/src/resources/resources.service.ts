import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventType, Prisma, ResourceStatus, Role } from "@prisma/client";
import { randomUUID } from "crypto";
import sanitizeHtml from "sanitize-html";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma.module";
import { StorageService } from "../storage/storage.service";
import { CreateResourceDto, UpdateResourceDto } from "./dto/resource.dto";
import { ResourceSort, SearchResourcesDto } from "./dto/search-resources.dto";

const cardInclude = {
  category: { select: { id: true, name: true, slug: true } },
  uploadedBy: { select: { id: true, name: true } },
} satisfies Prisma.ResourceInclude;

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async search(dto: SearchResourcesDto, userId?: string) {
    const query = dto.q?.trim();
    const take = dto.limit;
    const skip = (dto.page - 1) * take;

    if (query) {
      const clauses: Prisma.Sql[] = [
        Prisma.sql`r."status" = 'APPROVED'::"ResourceStatus"`,
      ];
      if (dto.categoryId)
        clauses.push(Prisma.sql`r."categoryId" = ${dto.categoryId}::uuid`);
      if (dto.resourceType)
        clauses.push(
          Prisma.sql`r."resourceType" = ${dto.resourceType}::"ResourceType"`,
        );
      if (dto.year) clauses.push(Prisma.sql`r."publicationYear" = ${dto.year}`);
      if (dto.department)
        clauses.push(Prisma.sql`r."department" ILIKE ${`%${dto.department}%`}`);
      const vector = Prisma.sql`to_tsvector('english', coalesce(r."title", '') || ' ' || coalesce(r."author", '') || ' ' || coalesce(r."abstract", '') || ' ' || coalesce(public.immutable_text_array_to_string(r."tags", ' '), ''))`;
      clauses.push(
        Prisma.sql`${vector} @@ websearch_to_tsquery('english', ${query})`,
      );
      const where = Prisma.join(clauses, " AND ");
      const order =
        dto.sort === ResourceSort.NEWEST
          ? Prisma.sql`r."createdAt" DESC`
          : dto.sort === ResourceSort.POPULAR
            ? Prisma.sql`(r."viewCount" + r."downloadCount" * 2) DESC`
            : Prisma.sql`ts_rank(${vector}, websearch_to_tsquery('english', ${query})) DESC, r."createdAt" DESC`;
      const ids = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT r.id FROM "Resource" r
        WHERE ${where}
        ORDER BY ${order}
        LIMIT ${take} OFFSET ${skip}
      `);
      const countRows = await this.prisma.$queryRaw<
        { count: bigint }[]
      >(Prisma.sql`
        SELECT count(*)::bigint AS count FROM "Resource" r WHERE ${where}
      `);
      const resources = ids.length
        ? await this.prisma.resource.findMany({
            where: { id: { in: ids.map((row) => row.id) } },
            include: cardInclude,
          })
        : [];
      const byId = new Map(
        resources.map((resource) => [resource.id, resource]),
      );
      const items = ids.map((row) => byId.get(row.id)).filter(Boolean);
      const total = Number(countRows[0]?.count ?? 0);
      await this.prisma.searchLog.create({
        data: { userId, query, resultCount: total },
      });
      return {
        items,
        pagination: {
          page: dto.page,
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      };
    }

    const where: Prisma.ResourceWhereInput = {
      status: ResourceStatus.APPROVED,
      ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
      ...(dto.resourceType ? { resourceType: dto.resourceType } : {}),
      ...(dto.year ? { publicationYear: dto.year } : {}),
      ...(dto.department
        ? { department: { contains: dto.department, mode: "insensitive" } }
        : {}),
    };
    const orderBy: Prisma.ResourceOrderByWithRelationInput[] =
      dto.sort === ResourceSort.POPULAR
        ? [{ downloadCount: "desc" }, { viewCount: "desc" }]
        : [{ createdAt: "desc" }];
    const [items, total] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where,
        include: cardInclude,
        orderBy,
        skip,
        take,
      }),
      this.prisma.resource.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: dto.page,
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    };
  }

  async getApproved(id: string, userId: string) {
    const resource = await this.prisma.resource.findFirst({
      where: { id, status: ResourceStatus.APPROVED },
      include: {
        ...cardInclude,
        versions: {
          select: {
            id: true,
            version: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            checksum: true,
            uploadedAt: true,
          },
          orderBy: { version: "desc" },
        },
      },
    });
    if (!resource) throw new NotFoundException("Resource not found");
    await this.prisma.$transaction([
      this.prisma.interactionLog.create({
        data: { userId, resourceId: id, eventType: EventType.VIEW },
      }),
      this.prisma.resource.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      }),
    ]);
    const saved = await this.prisma.savedResource.findUnique({
      where: { userId_resourceId: { userId, resourceId: id } },
    });
    return { ...resource, saved: Boolean(saved) };
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateResourceDto,
    file: Express.Multer.File,
  ) {
    const id = randomUUID();
    const stored = await this.storage.store(file, id, 1);
    const clean = this.clean(dto);
    const resource = await this.prisma.resource.create({
      data: {
        id,
        ...clean,
        uploadedById: user.id,
        versions: { create: { version: 1, ...stored } },
      },
      include: cardInclude,
    });
    await this.audit.record({
      actorId: user.id,
      action: "RESOURCE_UPLOADED",
      entityType: "Resource",
      entityId: id,
    });
    return resource;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateResourceDto) {
    const resource = await this.findEditable(user, id, true);
    const clean = this.cleanPartial(dto);
    const updated = await this.prisma.resource.update({
      where: { id },
      data: clean,
      include: cardInclude,
    });
    await this.audit.record({
      actorId: user.id,
      action: "RESOURCE_METADATA_UPDATED",
      entityType: "Resource",
      entityId: resource.id,
    });
    return updated;
  }

  async replaceFile(
    user: AuthenticatedUser,
    id: string,
    file: Express.Multer.File,
  ) {
    const resource = await this.findEditable(user, id, false);
    const version = resource.currentVersion + 1;
    const stored = await this.storage.store(file, id, version);
    const updated = await this.prisma.resource.update({
      where: { id },
      data: {
        currentVersion: version,
        status: ResourceStatus.PENDING,
        rejectionReason: null,
        reviewedAt: null,
        reviewedById: null,
        versions: { create: { version, ...stored } },
      },
      include: { ...cardInclude, versions: { orderBy: { version: "desc" } } },
    });
    await this.audit.record({
      actorId: user.id,
      action: "RESOURCE_VERSION_UPLOADED",
      entityType: "Resource",
      entityId: id,
      metadata: { version },
    });
    return updated;
  }

  async reviewQueue(user: AuthenticatedUser, page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const where: Prisma.ResourceWhereInput = {
      status:
        user.role === Role.STAFF
          ? { in: [ResourceStatus.PENDING, ResourceStatus.REJECTED] }
          : ResourceStatus.PENDING,
      ...(user.role === Role.STAFF ? { uploadedById: user.id } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where,
        include: cardInclude,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.resource.count({ where }),
    ]);
    return {
      items,
      pagination: { page, limit: take, total, pages: Math.ceil(total / take) },
    };
  }

  async mine(userId: string, page = 1, limit = 30) {
    const take = Math.min(Math.max(limit, 1), 50);
    const where: Prisma.ResourceWhereInput = {
      uploadedById: userId,
      status: { not: ResourceStatus.ARCHIVED },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where,
        include: cardInclude,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.resource.count({ where }),
    ]);
    return {
      items,
      pagination: { page, limit: take, total, pages: Math.ceil(total / take) },
    };
  }

  async approve(reviewer: AuthenticatedUser, id: string, ipAddress?: string) {
    const existing = await this.prisma.resource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Resource not found");
    if (existing.status !== ResourceStatus.PENDING)
      throw new BadRequestException("Only pending resources can be approved");
    const resource = await this.prisma.resource.update({
      where: { id },
      data: {
        status: ResourceStatus.APPROVED,
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
      include: cardInclude,
    });
    await this.audit.record({
      actorId: reviewer.id,
      action: "RESOURCE_APPROVED",
      entityType: "Resource",
      entityId: id,
      ipAddress,
    });
    return resource;
  }

  async reject(
    reviewer: AuthenticatedUser,
    id: string,
    reason: string,
    ipAddress?: string,
  ) {
    const existing = await this.prisma.resource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Resource not found");
    if (existing.status !== ResourceStatus.PENDING)
      throw new BadRequestException("Only pending resources can be rejected");
    const resource = await this.prisma.resource.update({
      where: { id },
      data: {
        status: ResourceStatus.REJECTED,
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
        rejectionReason: reason.trim(),
      },
      include: cardInclude,
    });
    await this.audit.record({
      actorId: reviewer.id,
      action: "RESOURCE_REJECTED",
      entityType: "Resource",
      entityId: id,
      metadata: { reason },
      ipAddress,
    });
    return resource;
  }

  async archive(user: AuthenticatedUser, id: string, ipAddress?: string) {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException("Resource not found");
    const allowed =
      user.role === Role.ADMIN ||
      (resource.uploadedById === user.id &&
        resource.status === ResourceStatus.PENDING);
    if (!allowed)
      throw new ForbiddenException("You cannot remove this resource");
    await this.prisma.resource.update({
      where: { id },
      data: { status: ResourceStatus.ARCHIVED },
    });
    await this.audit.record({
      actorId: user.id,
      action: "RESOURCE_ARCHIVED",
      entityType: "Resource",
      entityId: id,
      ipAddress,
    });
    return { message: "Resource archived" };
  }

  async access(userId: string, id: string, preview: boolean) {
    const resource = await this.prisma.resource.findFirst({
      where: { id, status: ResourceStatus.APPROVED },
    });
    if (!resource) throw new NotFoundException("Resource not found");
    const current = await this.prisma.resourceVersion.findUnique({
      where: {
        resourceId_version: {
          resourceId: id,
          version: resource.currentVersion,
        },
      },
    });
    if (!current)
      throw new NotFoundException(
        "No file has been attached to this demonstration record",
      );
    if (!preview) {
      await this.prisma.$transaction([
        this.prisma.interactionLog.create({
          data: { userId, resourceId: id, eventType: EventType.DOWNLOAD },
        }),
        this.prisma.resource.update({
          where: { id },
          data: { downloadCount: { increment: 1 } },
        }),
      ]);
    }
    return {
      url: await this.storage.signedReadUrl(
        current.objectKey,
        current.originalName,
        preview,
      ),
      expiresInSeconds: 300,
    };
  }

  async toggleSaved(userId: string, resourceId: string) {
    const resource = await this.prisma.resource.findFirst({
      where: { id: resourceId, status: ResourceStatus.APPROVED },
    });
    if (!resource) throw new NotFoundException("Resource not found");
    const key = { userId_resourceId: { userId, resourceId } };
    const existing = await this.prisma.savedResource.findUnique({ where: key });
    if (existing) {
      await this.prisma.savedResource.delete({ where: key });
      return { saved: false };
    }
    await this.prisma.savedResource.create({ data: { userId, resourceId } });
    return { saved: true };
  }

  async saved(userId: string) {
    const rows = await this.prisma.savedResource.findMany({
      where: { userId, resource: { status: ResourceStatus.APPROVED } },
      include: { resource: { include: cardInclude } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({ ...row.resource, savedAt: row.createdAt }));
  }

  private async findEditable(
    user: AuthenticatedUser,
    id: string,
    pendingOnly: boolean,
  ) {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException("Resource not found");
    if (user.role === Role.ADMIN) return resource;
    if (
      resource.uploadedById !== user.id ||
      (pendingOnly && resource.status !== ResourceStatus.PENDING)
    ) {
      throw new ForbiddenException(
        "You may only edit your own pending uploads",
      );
    }
    return resource;
  }

  private clean(dto: CreateResourceDto) {
    return {
      title: this.text(dto.title),
      author: this.text(dto.author),
      abstract: this.text(dto.abstract),
      tags: dto.tags.map((tag) => this.text(tag).toLowerCase()).filter(Boolean),
      publicationYear: dto.publicationYear,
      resourceType: dto.resourceType,
      categoryId: dto.categoryId,
      department: dto.department ? this.text(dto.department) : null,
    };
  }

  private cleanPartial(dto: UpdateResourceDto) {
    return {
      ...(dto.title ? { title: this.text(dto.title) } : {}),
      ...(dto.author ? { author: this.text(dto.author) } : {}),
      ...(dto.abstract ? { abstract: this.text(dto.abstract) } : {}),
      ...(dto.tags
        ? {
            tags: dto.tags
              .map((tag) => this.text(tag).toLowerCase())
              .filter(Boolean),
          }
        : {}),
      ...(dto.publicationYear ? { publicationYear: dto.publicationYear } : {}),
      ...(dto.resourceType ? { resourceType: dto.resourceType } : {}),
      ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
      ...(dto.department !== undefined
        ? { department: dto.department ? this.text(dto.department) : null }
        : {}),
    };
  }

  private text(value: string) {
    return sanitizeHtml(value.trim(), {
      allowedTags: [],
      allowedAttributes: {},
    });
  }
}
