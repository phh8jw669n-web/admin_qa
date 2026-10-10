import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  companySecret: process.env.JWT_COMPANY_SECRET,
  centreSecret: process.env.JWT_CENTRE_SECRET,
  centreRefreshSecret: process.env.JWT_CENTRE_REFRESH_SECRET,
  candidateSecret: process.env.JWT_CANDIDATE_SECRET,
  candidateRefreshSecret: process.env.JWT_CANDIDATE_REFRESH_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));
