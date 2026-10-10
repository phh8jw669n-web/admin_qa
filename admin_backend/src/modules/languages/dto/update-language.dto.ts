import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { trimString } from '../../../common/utils/string.util';

export class UpdateLanguageDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
