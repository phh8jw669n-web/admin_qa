import { AuthUserType } from '../../../common/constants/auth-user-type';

export type CandidateExamDesk = {
  centreId: string;
  centreCode: string;
  centreName: string;
  examDate: string;
};

export type AuthCandidate = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  enrollmentNumber: string;
  isActive: boolean;
  exam: CandidateExamDesk;
};

export type CandidateAuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  userType: AuthUserType.CANDIDATE;
  candidate: AuthCandidate;
};
