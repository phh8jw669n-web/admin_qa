import { IsNotEmpty, IsString } from 'class-validator';

export class CandidateRefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
