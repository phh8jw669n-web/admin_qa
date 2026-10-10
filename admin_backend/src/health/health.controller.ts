import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { apiSuccess } from '../common/utils/api-response.util';
import { HealthService } from './health.service';

@Public()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HealthCheck()
  async check() {
    return apiSuccess(
      'Health check passed successfully',
      await this.healthService.check(),
    );
  }
}
