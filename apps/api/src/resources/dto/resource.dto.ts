import { Transform } from "class-transformer";
import { ResourceType } from "@prisma/client";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";

function parseTags({ value }: { value: unknown }) {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return value;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : value.split(",");
  } catch {
    return value.split(",");
  }
}

export class CreateResourceDto {
  @IsString()
  @Length(3, 300)
  title: string;

  @IsString()
  @Length(2, 220)
  author: string;

  @IsString()
  @Length(20, 10_000)
  abstract: string;

  @Transform(parseTags)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags: string[];

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1400)
  @Max(new Date().getFullYear() + 1)
  publicationYear: number;

  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;
}

export class UpdateResourceDto {
  @IsOptional()
  @IsString()
  @Length(3, 300)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(2, 220)
  author?: string;

  @IsOptional()
  @IsString()
  @Length(20, 10_000)
  abstract?: string;

  @IsOptional()
  @Transform(parseTags)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1400)
  @Max(new Date().getFullYear() + 1)
  publicationYear?: number;

  @IsOptional()
  @IsEnum(ResourceType)
  resourceType?: ResourceType;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;
}
