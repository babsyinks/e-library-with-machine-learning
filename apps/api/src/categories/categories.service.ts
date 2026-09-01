import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma.module";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: { orderBy: { name: "asc" } },
        _count: { select: { resources: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async create(actorId: string, dto: CreateCategoryDto, ipAddress?: string) {
    const category = await this.prisma.category.create({
      data: { name: dto.name.trim(), slug: dto.slug, parentId: dto.parentId },
    });
    await this.audit.record({
      actorId,
      action: "CATEGORY_CREATED",
      entityType: "Category",
      entityId: category.id,
      ipAddress,
    });
    return category;
  }

  async update(
    actorId: string,
    id: string,
    dto: UpdateCategoryDto,
    ipAddress?: string,
  ) {
    if (dto.parentId === id)
      throw new BadRequestException("A category cannot be its own parent");
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found");
    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.slug ? { slug: dto.slug } : {}),
        ...(dto.parentId !== undefined
          ? { parentId: dto.parentId || null }
          : {}),
      },
    });
    await this.audit.record({
      actorId,
      action: "CATEGORY_UPDATED",
      entityType: "Category",
      entityId: id,
      ipAddress,
    });
    return category;
  }

  async remove(actorId: string, id: string, ipAddress?: string) {
    const count = await this.prisma.resource.count({
      where: { categoryId: id },
    });
    if (count)
      throw new BadRequestException(
        "Move or remove resources in this category first",
      );
    await this.prisma.category.delete({ where: { id } });
    await this.audit.record({
      actorId,
      action: "CATEGORY_DELETED",
      entityType: "Category",
      entityId: id,
      ipAddress,
    });
    return { message: "Category removed" };
  }
}
