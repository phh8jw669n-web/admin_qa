import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { trimString } from '../../../../common/utils/string.util';

export class UpdateInstructionLanguageDto {
  @IsOptional()
  @IsUUID()
  languageId?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
