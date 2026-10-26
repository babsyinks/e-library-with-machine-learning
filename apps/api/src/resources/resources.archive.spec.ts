import { ForbiddenException } from "@nestjs/common";
import { ResourceStatus, Role } from "@prisma/client";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { ResourcesService } from "./resources.service";

jest.mock("sanitize-html", () => jest.fn());

describe("ResourcesService archive authorization", () => {
  const resource = {
    id: "resource-id",
    uploadedById: "owner-id",
    status: ResourceStatus.APPROVED,
  };
  const prisma = {
    resource: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  const audit = { record: jest.fn() };
  const service = new ResourcesService(
    prisma as never,
    {} as never,
    audit as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.resource.findUnique.mockResolvedValue(resource);
    prisma.resource.update.mockResolvedValue({});
    prisma.resource.findMany.mockResolvedValue([]);
    prisma.resource.count.mockResolvedValue(0);
    audit.record.mockResolvedValue({});
  });

  it("lists all non-archived resources for management", async () => {
    await service.manage();

    expect(prisma.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { not: ResourceStatus.ARCHIVED } },
        take: 50,
      }),
    );
  });

  it.each([
    ["the uploader", { id: "owner-id", role: Role.STAFF }],
    ["a librarian", { id: "librarian-id", role: Role.LIBRARIAN }],
    ["an admin", { id: "admin-id", role: Role.ADMIN }],
  ])("allows %s to archive the resource", async (_actor, actor) => {
    await service.archive(actor as AuthenticatedUser, resource.id);

    expect(prisma.resource.update).toHaveBeenCalledWith({
      where: { id: resource.id },
      data: { status: ResourceStatus.ARCHIVED },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "RESOURCE_ARCHIVED",
        entityId: resource.id,
      }),
    );
  });

  it("denies another staff member from archiving the resource", async () => {
    await expect(
      service.archive(
        { id: "other-staff-id", role: Role.STAFF } as AuthenticatedUser,
        resource.id,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.resource.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
