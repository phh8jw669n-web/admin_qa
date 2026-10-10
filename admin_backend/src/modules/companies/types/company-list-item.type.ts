import { PaginatedData } from '../../../common/types/paginated-response.type';

export type CompanyListItem = {
  id: string;
  name: string;
  city: string;
  companyCode: string;
  workspaceUrl: string;
  isActive: boolean;
};

export type PaginatedCompanies = PaginatedData<CompanyListItem>;
