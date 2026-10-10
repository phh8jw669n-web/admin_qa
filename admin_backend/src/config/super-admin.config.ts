import { registerAs } from '@nestjs/config';

export default registerAs('superAdmin', () => ({
  email: process.env.SUPER_ADMIN_EMAIL,
  password: process.env.SUPER_ADMIN_PASSWORD,
  firstName: process.env.SUPER_ADMIN_FIRST_NAME,
  lastName: process.env.SUPER_ADMIN_LAST_NAME,
  mobile: process.env.SUPER_ADMIN_MOBILE,
  countryCode: process.env.SUPER_ADMIN_COUNTRY_CODE ?? '91',
}));
