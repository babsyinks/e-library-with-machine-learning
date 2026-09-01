import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { RecommendationsService } from "./recommendations.service";

@Controller("recommendations")
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get("for-me")
  mine(@CurrentUser() user: AuthenticatedUser, @Query("limit") limit = 8) {
    return this.recommendations.forUser(user.id, limit);
  }

  @Get("similar/:resourceId")
  similar(@Param("resourceId") id: string, @Query("limit") limit = 4) {
    return this.recommendations.similar(id, limit);
  }

  @Roles(Role.ADMIN)
  @Post("evaluate")
  evaluate() {
    return this.recommendations.evaluate();
  }
}
