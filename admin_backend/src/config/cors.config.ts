import { registerAs } from '@nestjs/config';
import { parseCommaSeparated } from '../common/utils/string.util';

export default registerAs('cors', () => ({
  origins: parseCommaSeparated(process.env.CORS_ORIGINS),
  credentials: process.env.CORS_CREDENTIALS === 'true',
}));
