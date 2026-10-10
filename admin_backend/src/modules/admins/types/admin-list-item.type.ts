import { FindOptionsSelect } from 'typeorm';
import { PaginatedData } from '../../../common/types/paginated-response.type';
import { Admin } from '../entities/admin.entity';

export const ADMIN_LIST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  isActive: true,
} as const satisfies FindOptionsSelect<Admin>;

export type AdminListItem = Pick<Admin, keyof typeof ADMIN_LIST_SELECT>;

export type PaginatedAdmins = PaginatedData<AdminListItem>;
