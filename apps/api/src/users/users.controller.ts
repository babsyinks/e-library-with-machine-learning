import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { ChangeRoleDto, ChangeStatusDto } from "./dto/admin-user.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.me(user.id);
  }

  @Patch("me")
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Get()
  list(
    @Query("page") page = 1,
    @Query("limit") limit = 25,
    @Query("search") search?: string,
  ) {
    return this.users.list(page, limit, search);
  }

  @Roles(Role.ADMIN)
  @Patch(":id/role")
  role(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ChangeRoleDto,
    @Req() request: Request,
  ) {
    return this.users.changeRole(actor.id, id, dto.role, request.ip);
  }

  @Roles(Role.ADMIN)
  @Patch(":id/status")
  status(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ChangeStatusDto,
    @Req() request: Request,
  ) {
    return this.users.changeStatus(actor.id, id, dto.status, request.ip);
  }
}
