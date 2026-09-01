import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventType, ResourceStatus, Role } from "@prisma/client";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma.module";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(days = 30) {
    const safeDays = Math.min(Math.max(days, 7), 365);
    const since = new Date(Date.now() - safeDays * 86_400_000);
    const [
      users,
      approvedResources,
      pendingResources,
      views,
      downloads,
      topViewed,
      topDownloaded,
      noResults,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.resource.count({
        where: { status: ResourceStatus.APPROVED },
      }),
      this.prisma.resource.count({ where: { status: ResourceStatus.PENDING } }),
      this.prisma.interactionLog.count({
        where: { eventType: EventType.VIEW, createdAt: { gte: since } },
      }),
      this.prisma.interactionLog.count({
        where: { eventType: EventType.DOWNLOAD, createdAt: { gte: since } },
      }),
      this.prisma.resource.findMany({
        where: { status: ResourceStatus.APPROVED },
        select: {
          id: true,
          title: true,
          author: true,
          viewCount: true,
          downloadCount: true,
        },
        orderBy: { viewCount: "desc" },
        take: 8,
      }),
      this.prisma.resource.findMany({
        where: { status: ResourceStatus.APPROVED },
        select: {
          id: true,
          title: true,
          author: true,
          viewCount: true,
          downloadCount: true,
        },
        orderBy: { downloadCount: "desc" },
        take: 8,
      }),
      this.prisma.searchLog.groupBy({
        by: ["query"],
        where: { resultCount: 0, createdAt: { gte: since } },
        _count: { query: true },
        orderBy: { _count: { query: "desc" } },
        take: 10,
      }),
    ]);

    const engagement = await this.prisma.$queryRaw<
      { category: string; views: bigint; downloads: bigint }[]
    >`
      SELECT c.name AS category,
        count(*) FILTER (WHERE i."eventType" = 'VIEW')::bigint AS views,
        count(*) FILTER (WHERE i."eventType" = 'DOWNLOAD')::bigint AS downloads
      FROM "InteractionLog" i
      JOIN "Resource" r ON r.id = i."resourceId"
      JOIN "Category" c ON c.id = r."categoryId"
      WHERE i."createdAt" >= ${since}
      GROUP BY c.id, c.name
      ORDER BY (count(*) FILTER (WHERE i."eventType" = 'VIEW') + count(*) FILTER (WHERE i."eventType" = 'DOWNLOAD') * 2) DESC
      LIMIT 12
    `;
    const trend = await this.prisma.$queryRaw<
      { day: Date; views: bigint; downloads: bigint }[]
    >`
      SELECT date_trunc('day', "createdAt") AS day,
        count(*) FILTER (WHERE "eventType" = 'VIEW')::bigint AS views,
        count(*) FILTER (WHERE "eventType" = 'DOWNLOAD')::bigint AS downloads
      FROM "InteractionLog"
      WHERE "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1 ASC
    `;

    return {
      periodDays: safeDays,
      summary: { users, approvedResources, pendingResources, views, downloads },
      topViewed,
      topDownloaded,
      noResultSearches: noResults.map((row) => ({
        query: row.query,
        count: row._count.query,
      })),
      categoryEngagement: engagement.map((row) => ({
        category: row.category,
        views: Number(row.views),
        downloads: Number(row.downloads),
      })),
      trend: trend.map((row) => ({
        day: row.day,
        views: Number(row.views),
        downloads: Number(row.downloads),
      })),
    };
  }

  async resource(user: AuthenticatedUser, resourceId: string, days = 30) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        title: true,
        uploadedById: true,
        viewCount: true,
        downloadCount: true,
      },
    });
    if (!resource) throw new NotFoundException("Resource not found");
    if (
      user.role !== Role.ADMIN &&
      user.role !== Role.LIBRARIAN &&
      resource.uploadedById !== user.id
    ) {
      throw new ForbiddenException(
        "Analytics are available only for your own uploads",
      );
    }
    const since = new Date(
      Date.now() - Math.min(Math.max(days, 7), 365) * 86_400_000,
    );
    const trend = await this.prisma.$queryRaw<
      { day: Date; views: bigint; downloads: bigint }[]
    >`
      SELECT date_trunc('day', "createdAt") AS day,
        count(*) FILTER (WHERE "eventType" = 'VIEW')::bigint AS views,
        count(*) FILTER (WHERE "eventType" = 'DOWNLOAD')::bigint AS downloads
      FROM "InteractionLog"
      WHERE "resourceId" = ${resourceId}::uuid AND "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1 ASC
    `;
    return {
      resource,
      trend: trend.map((row) => ({
        day: row.day,
        views: Number(row.views),
        downloads: Number(row.downloads),
      })),
    };
  }

  async personal(userId: string) {
    const [views, downloads, saved, recent] = await Promise.all([
      this.prisma.interactionLog.count({
        where: { userId, eventType: EventType.VIEW },
      }),
      this.prisma.interactionLog.count({
        where: { userId, eventType: EventType.DOWNLOAD },
      }),
      this.prisma.savedResource.count({ where: { userId } }),
      this.prisma.interactionLog.findMany({
        where: { userId },
        distinct: ["resourceId"],
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          resource: {
            select: { id: true, title: true, author: true, resourceType: true },
          },
        },
      }),
    ]);
    return {
      summary: { views, downloads, saved },
      recent: recent.map((row) => ({
        ...row.resource,
        lastAccessedAt: row.createdAt,
      })),
    };
  }
}
