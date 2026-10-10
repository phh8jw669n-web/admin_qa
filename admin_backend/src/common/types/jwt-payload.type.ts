import { AdminRole } from '../../modules/admins/enums/admin-role.enum';

export type JwtPayload = {
  sub: string;
  email: string;
  role: AdminRole;
  companyId: string | null;
  isSuperAdmin: boolean;
  tv: number;
};

export type CompanyTokenPayload = {
  sub: string;
  type: 'company';
};

export type JwtRefreshPayload = {
  sub: string;
  type: 'refresh';
  jti: string;
};

export type CentreUserJwtPayload = {
  sub: string;
  email: string;
  type: 'centre-user';
  companyId: string;
  centreId: string;
  tv: number;
};

export type CentreUserRefreshPayload = {
  sub: string;
  type: 'centre-refresh';
  jti: string;
};

export type CandidateJwtPayload = {
  sub: string;
  enrollmentNumber: string;
  type: 'candidate';
  companyId: string;
  centreId: string;
  examDate: string;
  tv: number;
};

export type CandidateRefreshPayload = {
  sub: string;
  type: 'candidate-refresh';
  jti: string;
};
