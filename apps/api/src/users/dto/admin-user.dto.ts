import { Role, UserStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class ChangeRoleDto {
  @IsEnum(Role)
  role: Role;
}

export class ChangeStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}
