import { Transform } from 'class-transformer';
import { IsJWT, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { trimString } from '../../../common/utils/string.util';

export class CandidateLoginDto {
  @IsJWT()
  companyToken!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  enrollmentNumber!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  centreCode!: string;
}
