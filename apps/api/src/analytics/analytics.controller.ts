import { Controller, Get, Param, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Roles(Role.LIBRARIAN, Role.ADMIN)
  @Get("overview")
  overview(@Query("days") days = 30) {
    return this.analytics.overview(days);
  }

  @Get("me")
  personal(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.personal(user.id);
  }

  @Roles(Role.STAFF, Role.LIBRARIAN, Role.ADMIN)
  @Get("resources/:id")
  resource(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query("days") days = 30,
  ) {
    return this.analytics.resource(user, id, days);
  }
}
