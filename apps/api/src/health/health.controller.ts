import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma.module";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async status() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: "ok",
      service: "scholarshelf-api",
      timestamp: new Date().toISOString(),
    };
  }
}
