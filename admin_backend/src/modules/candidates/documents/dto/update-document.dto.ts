import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { trimString } from '../../../../common/utils/string.util';
import { CandidateDocumentType } from '../enums/document-type.enum';

export class UpdateDocumentDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(500)
  fileUrl?: string | null;

  @IsOptional()
  @IsEnum(CandidateDocumentType)
  documentType?: CandidateDocumentType | null;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(255)
  documentName?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
