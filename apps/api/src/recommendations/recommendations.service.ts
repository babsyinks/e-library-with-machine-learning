import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { ResourceStatus } from "@prisma/client";
import { firstValueFrom } from "rxjs";
import { PrismaService } from "../prisma.module";

interface MlRecommendation {
  resource_id: string;
  score: number;
  explanation: string;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async forUser(userId: string, limit = 8) {
    const safeLimit = Math.min(Math.max(limit, 1), 20);
    try {
      const response = await firstValueFrom(
        this.http.get<{ recommendations: MlRecommendation[] }>(
          `${this.config.getOrThrow("ML_SERVICE_URL")}/recommendations/users/${userId}`,
          {
            params: { limit: safeLimit },
            headers: this.headers(),
            timeout: 5000,
          },
        ),
      );
      return this.hydrate(response.data.recommendations, userId);
    } catch (error) {
      this.logger.warn(
        `ML service unavailable; using department/popularity fallback: ${String(error)}`,
      );
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      });
      return this.prisma.resource.findMany({
        where: {
          status: ResourceStatus.APPROVED,
          ...(user?.department
            ? { OR: [{ department: user.department }, { department: null }] }
            : {}),
        },
        include: { category: true },
        orderBy: [{ downloadCount: "desc" }, { viewCount: "desc" }],
        take: safeLimit,
      });
    }
  }

  async similar(resourceId: string, limit = 4) {
    const exists = await this.prisma.resource.findFirst({
      where: { id: resourceId, status: ResourceStatus.APPROVED },
    });
    if (!exists) throw new NotFoundException("Resource not found");
    try {
      const response = await firstValueFrom(
        this.http.get<{ recommendations: MlRecommendation[] }>(
          `${this.config.getOrThrow("ML_SERVICE_URL")}/recommendations/resources/${resourceId}/similar`,
          {
            params: { limit: Math.min(Math.max(limit, 1), 12) },
            headers: this.headers(),
            timeout: 5000,
          },
        ),
      );
      return this.hydrate(response.data.recommendations);
    } catch {
      return this.prisma.resource.findMany({
        where: {
          status: ResourceStatus.APPROVED,
          categoryId: exists.categoryId,
          id: { not: resourceId },
        },
        include: { category: true },
        orderBy: { viewCount: "desc" },
        take: limit,
      });
    }
  }

  async evaluate() {
    const response = await firstValueFrom(
      this.http.post<Record<string, unknown>>(
        `${this.config.getOrThrow("ML_SERVICE_URL")}/evaluation/run`,
        {},
        { headers: this.headers(), timeout: 120_000 },
      ),
    );
    return response.data;
  }

  private async hydrate(recommendations: MlRecommendation[], userId?: string) {
    const ids = recommendations.map((item) => item.resource_id);
    if (!ids.length) return [];
    const resources = await this.prisma.resource.findMany({
      where: { id: { in: ids }, status: ResourceStatus.APPROVED },
      include: { category: true },
    });
    const resourceMap = new Map(
      resources.map((resource) => [resource.id, resource]),
    );
    const result = recommendations
      .map((item) => {
        const resource = resourceMap.get(item.resource_id);
        return resource
          ? {
              ...resource,
              recommendationScore: item.score,
              recommendationExplanation: item.explanation,
            }
          : null;
      })
      .filter(Boolean);
    if (userId) {
      await this.prisma.$transaction([
        this.prisma.recommendationCache.deleteMany({ where: { userId } }),
        ...recommendations
          .filter((item) => resourceMap.has(item.resource_id))
          .map((item) =>
            this.prisma.recommendationCache.create({
              data: {
                userId,
                resourceId: item.resource_id,
                score: item.score,
                explanation: item.explanation,
              },
            }),
          ),
      ]);
    }
    return result;
  }

  private headers() {
    return {
      "x-internal-token": this.config.getOrThrow<string>("ML_INTERNAL_TOKEN"),
    };
  }
}
