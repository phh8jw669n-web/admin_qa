import { PartialType } from '@nestjs/swagger';
import { CreateCandidateCentreMappingDto } from './create-candidate-centre-mapping.dto';

export class UpdateCandidateCentreMappingDto extends PartialType(
  CreateCandidateCentreMappingDto,
) {}
