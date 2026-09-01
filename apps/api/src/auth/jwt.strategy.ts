import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { UserStatus } from "@prisma/client";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma.module";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: { sub: string; type: string }) {
    if (payload.type !== "access")
      throw new UnauthorizedException("Invalid token type");
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        department: true,
        status: true,
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException("Account unavailable");
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
    };
  }
}
