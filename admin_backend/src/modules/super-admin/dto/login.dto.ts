import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { trimLowercase } from '../../../common/utils/string.util';

export class SuperAdminLoginDto {
  @Transform(({ value }) => trimLowercase(value))
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
