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

export class CreateDocumentDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(500)
  fileUrl?: string;

  @IsOptional()
  @IsEnum(CandidateDocumentType)
  documentType?: CandidateDocumentType;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(255)
  documentName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
