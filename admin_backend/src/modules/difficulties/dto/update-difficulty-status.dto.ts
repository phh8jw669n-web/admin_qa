import { IsBoolean } from 'class-validator';

export class UpdateDifficultyStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
