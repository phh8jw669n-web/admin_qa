import { registerAs } from '@nestjs/config';

export default registerAs('admin', () => ({
  defaultPassword: process.env.DEFAULT_ADMIN_PASSWORD,
}));
