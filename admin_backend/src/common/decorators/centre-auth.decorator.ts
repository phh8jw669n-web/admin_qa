import { SetMetadata } from '@nestjs/common';

export const IS_CENTRE_AUTH_KEY = 'isCentreAuth';

export const CentreAuth = () => SetMetadata(IS_CENTRE_AUTH_KEY, true);
