import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string } {
    return {
      message: 'Hello, welcome to the CBT admin backend',
    };
  }
}
