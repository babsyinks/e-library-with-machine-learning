import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  list() {
    return this.categories.list();
  }

  @Roles(Role.LIBRARIAN, Role.ADMIN)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
    @Req() request: Request,
  ) {
    return this.categories.create(user.id, dto, request.ip);
  }

  @Roles(Role.LIBRARIAN, Role.ADMIN)
  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() request: Request,
  ) {
    return this.categories.update(user.id, id, dto, request.ip);
  }

  @Roles(Role.LIBRARIAN, Role.ADMIN)
  @Delete(":id")
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() request: Request,
  ) {
    return this.categories.remove(user.id, id, request.ip);
  }
}
