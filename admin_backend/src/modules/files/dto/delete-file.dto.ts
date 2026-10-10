import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { trimString } from '../../../common/utils/string.util';
import { IsSafeStoragePath } from '../validators/safe-storage-path.validator';

export class DeleteFileDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @IsSafeStoragePath()
  key!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsSafeStoragePath()
  previousKey?: string;
}
