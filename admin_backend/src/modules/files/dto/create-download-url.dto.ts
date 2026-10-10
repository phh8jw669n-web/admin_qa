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
import { IsSafeStoragePath } from '../validators/safe-storage-path.validator';

export class CreateDownloadUrlDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @IsSafeStoragePath()
  key!: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresIn?: number;
}
