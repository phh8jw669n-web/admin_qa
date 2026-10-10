import { AdminRole } from '../../admins/enums/admin-role.enum';
import { AuthUserType } from '../../../common/constants/auth-user-type';

export type AuthAdmin = {
  id: string;
  companyId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: AdminRole;
  isMfaEnabled: boolean;
  isActive: boolean;
  profileImageUrl: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  userType: AuthUserType.ADMIN;
  admin: AuthAdmin;
};
