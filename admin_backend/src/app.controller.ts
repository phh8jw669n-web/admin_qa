import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { apiSuccessMessage } from './common/utils/api-response.util';
import { AppService } from './app.service';

@Public()
@ApiExcludeController()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return apiSuccessMessage(this.appService.getHello().message);
  }
}
