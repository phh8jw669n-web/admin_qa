import { applyDecorators, UseGuards } from '@nestjs/common';
import { LoginThrottlerGuard } from '../guards/login-throttler.guard';

export function LoginRateLimit() {
  return applyDecorators(UseGuards(LoginThrottlerGuard));
}
