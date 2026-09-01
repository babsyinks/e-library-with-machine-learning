import { BadRequestException, ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";

describe("AuthService registration safeguards", () => {
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    authToken: { create: jest.fn() },
  };
  const config = {
    getOrThrow: jest.fn((key: string) => {
      if (key === "INSTITUTION_EMAIL_DOMAIN") return "example.edu";
      if (key === "TOKEN_PEPPER") return "pepper";
      return "test";
    }),
  };
  const mail = { sendVerification: jest.fn() };
  const service = new AuthService(
    prisma as never,
    {} as JwtService,
    config as unknown as ConfigService,
    mail as never,
  );
  const registration = {
    name: "Ada Student",
    email: "ada@example.edu",
    password: "StrongPassword1!",
    department: "Computer Science",
  };

  beforeEach(() => jest.clearAllMocks());

  it("rejects non-institutional email addresses before creating a user", async () => {
    await expect(
      service.register({ ...registration, email: "ada@outside.test" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("does not reveal a second account for a duplicate institutional email", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: "existing" });
    await expect(service.register(registration)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
