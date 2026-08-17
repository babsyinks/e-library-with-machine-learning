import { IsEmail, IsString, Length, Matches, MaxLength } from "class-validator";

export class TokenDto {
  @IsString()
  @Length(32, 256)
  token: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsString()
  @Length(12, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
  password: string;
}
