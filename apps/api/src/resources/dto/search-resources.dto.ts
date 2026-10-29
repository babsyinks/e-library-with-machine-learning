import { ResourceType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export enum ResourceSort {
  RELEVANCE = "relevance",
  NEWEST = "newest",
  POPULAR = "popular",
}

export class SearchResourcesDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  q?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ResourceType)
  resourceType?: ResourceType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1400)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsEnum(ResourceSort)
  sort: ResourceSort = ResourceSort.RELEVANCE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 12;
}
