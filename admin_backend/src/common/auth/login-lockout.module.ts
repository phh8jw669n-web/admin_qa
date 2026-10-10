import { Global, Module } from '@nestjs/common';
import { LoginLockoutService } from './login-lockout.service';

@Global()
@Module({
  providers: [LoginLockoutService],
  exports: [LoginLockoutService],
})
export class LoginLockoutModule {}
