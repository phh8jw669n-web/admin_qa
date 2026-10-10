import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTestSettingDto } from './create-test-setting.dto';

export class UpdateTestSettingDto extends PartialType(
  OmitType(CreateTestSettingDto, ['testId'] as const),
) {}
