import { SetMetadata } from '@nestjs/common';

export const IS_CANDIDATE_AUTH_KEY = 'isCandidateAuth';

export const CandidateAuth = () => SetMetadata(IS_CANDIDATE_AUTH_KEY, true);
