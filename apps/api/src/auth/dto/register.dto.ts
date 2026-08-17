import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from "class-validator";

export class RegisterDto {
  @IsString()
  @Length(2, 120)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @Length(12, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: "password must contain uppercase, lowercase, number and symbol",
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;
}
