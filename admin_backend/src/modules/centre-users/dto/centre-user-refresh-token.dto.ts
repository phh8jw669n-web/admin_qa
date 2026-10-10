import { IsNotEmpty, IsString } from 'class-validator';

export class CentreUserRefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
