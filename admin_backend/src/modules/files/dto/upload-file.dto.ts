import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { trimString } from '../../../common/utils/string.util';

export class UploadFileDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  folderType?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  filename?: string;
}
