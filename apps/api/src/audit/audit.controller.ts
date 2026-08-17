import { Controller, Get, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../common/decorators/roles.decorator";
import { AuditService } from "./audit.service";

@Roles(Role.ADMIN)
@Controller("audit-logs")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query("page") page = 1, @Query("limit") limit = 30) {
    return this.audit.list(page, limit);
  }
}
