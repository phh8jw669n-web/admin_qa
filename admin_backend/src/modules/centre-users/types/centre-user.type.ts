import { FindOptionsSelect } from 'typeorm';
import { PaginatedData } from '../../../common/types/paginated-response.type';
import { AuthUserType } from '../../../common/constants/auth-user-type';
import { CentreUser } from '../entities/centre-user.entity';

export const CENTRE_USER_LIST_SELECT = {
  id: true,
  companyId: true,
  centreId: true,
  name: true,
  email: true,
  isActive: true,
  enableMail: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies FindOptionsSelect<CentreUser>;

export type CentreUserListItem = Pick<
  CentreUser,
  keyof typeof CENTRE_USER_LIST_SELECT
>;

export type PaginatedCentreUsers = PaginatedData<CentreUserListItem>;

export type AuthCentreUser = {
  id: string;
  companyId: string;
  centreId: string;
  name: string | null;
  email: string | null;
  isActive: boolean;
  enableMail: boolean;
};

export type CentreUserAuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  userType: AuthUserType.CENTRE_USER;
  centreUser: AuthCentreUser;
};
