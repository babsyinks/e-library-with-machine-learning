import { ResourceStatus } from "@prisma/client";
import { throwError } from "rxjs";
import { RecommendationsService } from "./recommendations.service";

describe("RecommendationsService similar fallback", () => {
  const source = {
    id: "source-id",
    author: "A. Researcher",
    categoryId: "category-id",
    resourceType: "EBOOK",
    tags: ["machine learning", "artificial intelligence"],
  };
  const http = { get: jest.fn() };
  const config = {
    getOrThrow: jest.fn((key: string) =>
      key === "ML_SERVICE_URL" ? "http://recommendations" : "internal-token",
    ),
  };
  const prisma = {
    resource: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const service = new RecommendationsService(
    http as never,
    config as never,
    prisma as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.resource.findFirst.mockResolvedValue(source);
    prisma.resource.findMany.mockResolvedValue([]);
    http.get.mockReturnValue(throwError(() => new Error("ML unavailable")));
  });

  it("limits fallback recommendations to resources sharing a topic tag", async () => {
    await service.similar(source.id);

    expect(prisma.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ResourceStatus.APPROVED,
          id: { not: source.id },
          OR: [
            { tags: { hasSome: source.tags } },
            { author: { equals: source.author, mode: "insensitive" } },
            {
              AND: [
                { categoryId: source.categoryId },
                { resourceType: source.resourceType },
              ],
            },
          ],
        },
      }),
    );
  });
});
