import { CompanyStatus } from '../enums/company.enum';

type CompanyStatusFields = {
  status?: CompanyStatus;
  isActive?: boolean;
};

export function syncStatusAndActive<T extends CompanyStatusFields>(dto: T): T {
  if (dto.status !== undefined) {
    dto.isActive = dto.status === CompanyStatus.ACTIVE;
    return dto;
  }

  if (dto.isActive !== undefined) {
    dto.status = dto.isActive ? CompanyStatus.ACTIVE : CompanyStatus.INACTIVE;
  }

  return dto;
}
