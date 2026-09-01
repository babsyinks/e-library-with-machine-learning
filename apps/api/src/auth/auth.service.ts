import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { TokenType, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma.module";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const domain = this.config
      .getOrThrow<string>("INSTITUTION_EMAIL_DOMAIN")
      .toLowerCase();
    if (!email.endsWith(`@${domain}`)) {
      throw new BadRequestException(
        `Use your institutional @${domain} email address`,
      );
    }
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException("An account already exists for this email");
    }
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        department: dto.department?.trim() || null,
      },
      select: { id: true, name: true, email: true },
    });
    const token = await this.issueOneTimeToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      24 * 60,
    );
    await this.mail.sendVerification(user.email, user.name, token);
    return {
      message:
        "Registration successful. Check your institutional email to verify your account.",
    };
  }

  async verifyEmail(rawToken: string) {
    const token = await this.consumeOneTimeToken(
      rawToken,
      TokenType.EMAIL_VERIFICATION,
    );
    await this.prisma.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: new Date() },
    });
    return { message: "Email verified. You may now sign in." };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException("This account is not active");
    if (!user.emailVerifiedAt)
      throw new UnauthorizedException("Verify your email before signing in");
    const tokens = await this.issueSession(user.id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return { ...tokens, user: this.publicUser(user) };
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) throw new UnauthorizedException("Refresh token missing");
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Refresh token is invalid or expired");
    }
    if (payload.type !== "refresh")
      throw new UnauthorizedException("Invalid token type");
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user?.refreshTokenHash || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Session is no longer valid");
    }
    if (!(await bcrypt.compare(refreshToken, user.refreshTokenHash))) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException("Session reuse detected; sign in again");
    }
    const tokens = await this.issueSession(user.id);
    return { ...tokens, user: this.publicUser(user) };
  }

  async logout(userId?: string) {
    if (userId)
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
    return { message: "Signed out" };
  }

  async forgotPassword(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.status === UserStatus.ACTIVE) {
      await this.prisma.authToken.updateMany({
        where: {
          userId: user.id,
          type: TokenType.PASSWORD_RESET,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });
      const token = await this.issueOneTimeToken(
        user.id,
        TokenType.PASSWORD_RESET,
        30,
      );
      await this.mail.sendPasswordReset(user.email, user.name, token);
    }
    return {
      message:
        "If that account exists, a password reset message has been sent.",
    };
  }

  async resetPassword(rawToken: string, password: string) {
    const token = await this.consumeOneTimeToken(
      rawToken,
      TokenType.PASSWORD_RESET,
    );
    await this.prisma.user.update({
      where: { id: token.userId },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        refreshTokenHash: null,
      },
    });
    return { message: "Password reset. Sign in with your new password." };
  }

  private async issueSession(userId: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, type: "access" },
      {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.config.get<string>(
          "JWT_ACCESS_TTL",
          "15m",
        ) as JwtSignOptions["expiresIn"],
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, type: "refresh", nonce: randomBytes(12).toString("hex") },
      {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get<string>(
          "JWT_REFRESH_TTL",
          "7d",
        ) as JwtSignOptions["expiresIn"],
      },
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 10) },
    });
    return { accessToken, refreshToken };
  }

  private async issueOneTimeToken(
    userId: string,
    type: TokenType,
    minutes: number,
  ) {
    const raw = randomBytes(32).toString("base64url");
    await this.prisma.authToken.create({
      data: {
        userId,
        type,
        tokenHash: this.hashToken(raw),
        expiresAt: new Date(Date.now() + minutes * 60_000),
      },
    });
    return raw;
  }

  private async consumeOneTimeToken(raw: string, type: TokenType) {
    const token = await this.prisma.authToken.findUnique({
      where: { tokenHash: this.hashToken(raw) },
    });
    if (
      !token ||
      token.type !== type ||
      token.usedAt ||
      token.expiresAt <= new Date()
    ) {
      throw new BadRequestException("This link is invalid or has expired");
    }
    return this.prisma.authToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
  }

  private hashToken(raw: string) {
    return createHash("sha256")
      .update(`${raw}${this.config.getOrThrow<string>("TOKEN_PEPPER")}`)
      .digest("hex");
  }

  private publicUser(user: {
    id: string;
    name: string;
    email: string;
    role: unknown;
    department: string | null;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    };
  }
}
