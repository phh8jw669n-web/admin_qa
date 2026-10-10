import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AssignTestGroupsDto {
  @IsUUID()
  testId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  groupIds!: string[];
}
