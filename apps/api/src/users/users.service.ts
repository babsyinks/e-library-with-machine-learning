import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role, UserStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma.module";
import { UpdateProfileDto } from "./dto/update-profile.dto";

const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  department: true,
  emailVerifiedAt: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async me(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: profileSelect,
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  updateProfile(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.department !== undefined
          ? { department: dto.department.trim() || null }
          : {}),
      },
      select: profileSelect,
    });
  }

  async list(page = 1, limit = 25, search?: string) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const where = search?.trim()
      ? {
          OR: [
            { name: { contains: search.trim(), mode: "insensitive" as const } },
            {
              email: { contains: search.trim(), mode: "insensitive" as const },
            },
            {
              department: {
                contains: search.trim(),
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: profileSelect,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items,
      pagination: { page, limit: take, total, pages: Math.ceil(total / take) },
    };
  }

  async changeRole(
    actorId: string,
    userId: string,
    role: Role,
    ipAddress?: string,
  ) {
    if (actorId === userId)
      throw new BadRequestException("You cannot change your own role");
    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) throw new NotFoundException("User not found");
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: profileSelect,
    });
    await this.audit.record({
      actorId,
      action: "USER_ROLE_CHANGED",
      entityType: "User",
      entityId: userId,
      metadata: { from: before.role, to: role },
      ipAddress,
    });
    return user;
  }

  async changeStatus(
    actorId: string,
    userId: string,
    status: UserStatus,
    ipAddress?: string,
  ) {
    if (actorId === userId)
      throw new BadRequestException(
        "You cannot suspend or deactivate your own account",
      );
    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) throw new NotFoundException("User not found");
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status,
        ...(status !== UserStatus.ACTIVE ? { refreshTokenHash: null } : {}),
      },
      select: profileSelect,
    });
    await this.audit.record({
      actorId,
      action: "USER_STATUS_CHANGED",
      entityType: "User",
      entityId: userId,
      metadata: { from: before.status, to: status },
      ipAddress,
    });
    return user;
  }
}
