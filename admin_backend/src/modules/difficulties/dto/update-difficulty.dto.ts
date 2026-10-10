import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateDifficultyDto } from './create-difficulty.dto';

export class UpdateDifficultyDto extends PartialType(CreateDifficultyDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
