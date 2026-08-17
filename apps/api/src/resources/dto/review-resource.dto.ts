import { IsString, Length } from "class-validator";

export class RejectResourceDto {
  @IsString()
  @Length(5, 500)
  reason: string;
}
