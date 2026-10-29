import { Prisma, ResourceStatus } from "@prisma/client";
import { ResourcesService } from "./resources.service";
import { ResourceSort } from "./dto/search-resources.dto";

jest.mock("sanitize-html", () => jest.fn());

describe("ResourcesService catalog search", () => {
  const matchingResource = {
    id: "resource-id",
    title: "Introduction to Machine Learning for Education",
  };
  const prisma = {
    resource: {
      findMany: jest.fn((args: Prisma.ResourceFindManyArgs) => {
        expect(args.where?.status).toBe(ResourceStatus.APPROVED);
        expect(args.where?.OR).toContainEqual({
          title: { contains: "machine learning", mode: "insensitive" },
        });
        return Promise.resolve([matchingResource]);
      }),
      count: jest.fn(),
    },
    searchLog: { create: jest.fn() },
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  const service = new ResourcesService(
    prisma as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.resource.count.mockResolvedValue(1);
    prisma.searchLog.create.mockResolvedValue({});
  });

  it("returns an approved resource whose title contains the search phrase", async () => {
    const result = await service.search({
      q: "machine learning",
      page: 1,
      limit: 12,
      sort: ResourceSort.RELEVANCE,
    });

    expect(result).toMatchObject({
      items: [matchingResource],
      pagination: { page: 1, limit: 12, total: 1, pages: 1 },
    });
    expect(prisma.resource.findMany).toHaveBeenCalled();
    expect(prisma.searchLog.create).toHaveBeenCalledWith({
      data: { userId: undefined, query: "machine learning", resultCount: 1 },
    });
  });
});
