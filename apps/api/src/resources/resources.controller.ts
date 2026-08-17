import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Role } from "@prisma/client";
import { Request } from "express";
import { memoryStorage } from "multer";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { RejectResourceDto } from "./dto/review-resource.dto";
import { CreateResourceDto, UpdateResourceDto } from "./dto/resource.dto";
import { SearchResourcesDto } from "./dto/search-resources.dto";
import { ResourcesService } from "./resources.service";

const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
};

@Controller("resources")
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Public()
  @Get()
  search(@Query() query: SearchResourcesDto) {
    return this.resources.search(query);
  }

  @Roles(Role.STAFF, Role.LIBRARIAN, Role.ADMIN)
  @Get("review-queue")
  queue(
    @CurrentUser() user: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return this.resources.reviewQueue(user, page, limit);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Get("mine")
  mine(
    @CurrentUser() user: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("limit") limit = 30,
  ) {
    return this.resources.mine(user.id, page, limit);
  }

  @Get("saved")
  saved(@CurrentUser() user: AuthenticatedUser) {
    return this.resources.saved(user.id);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateResourceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.resources.create(user, dto, file);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.resources.getApproved(id, user.id);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.resources.update(user, id, dto);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Post(":id/version")
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  replace(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.resources.replaceFile(user, id, file);
  }

  @Roles(Role.LIBRARIAN, Role.ADMIN)
  @Post(":id/approve")
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() request: Request,
  ) {
    return this.resources.approve(user, id, request.ip);
  }

  @Roles(Role.LIBRARIAN, Role.ADMIN)
  @Post(":id/reject")
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RejectResourceDto,
    @Req() request: Request,
  ) {
    return this.resources.reject(user, id, dto.reason, request.ip);
  }

  @Post(":id/access")
  access(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query("preview") preview = false,
  ) {
    return this.resources.access(user.id, id, preview);
  }

  @Post(":id/saved")
  toggleSaved(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.resources.toggleSaved(user.id, id);
  }

  @Delete(":id")
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() request: Request,
  ) {
    return this.resources.archive(user, id, request.ip);
  }
}
