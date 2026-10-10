import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { trimString } from '../../../common/utils/string.util';
import { normalizeUploadContentType } from '../utils/upload-file-type.util';
import {
  IsAllowedUploadContentType,
  IsAllowedUploadFileName,
} from '../validators/allowed-upload-file-type.validator';
import { IsSafeStoragePath } from '../validators/safe-storage-path.validator';

export class CreateUploadUrlDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @IsAllowedUploadFileName()
  fileName!: string;

  @Transform(({ value }) => normalizeUploadContentType(value))
  @IsString()
  @IsNotEmpty()
  @IsAllowedUploadContentType()
  contentType!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsSafeStoragePath()
  folder?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsSafeStoragePath()
  key?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresIn?: number;
}
