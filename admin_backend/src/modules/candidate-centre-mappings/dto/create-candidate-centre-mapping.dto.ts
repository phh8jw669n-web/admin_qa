import { IsDateString, IsUUID } from 'class-validator';

export class CreateCandidateCentreMappingDto {
  @IsUUID()
  candidateId!: string;

  @IsUUID()
  centreId!: string;

  @IsDateString({ strict: true })
  examDate!: string;
}
