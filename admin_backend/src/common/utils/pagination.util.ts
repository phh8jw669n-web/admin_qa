import {
  FindManyOptions,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { PAGINATION } from '../constants/pagination.constants';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import {
  PaginatedData,
  toPaginatedData,
} from '../types/paginated-response.type';

export function getPaginationParams(query: PaginationQueryDto) {
  const page = Math.max(1, Number(query.page ?? PAGINATION.DEFAULT_PAGE));
  const limit = Math.max(
    1,
    Math.min(
      PAGINATION.MAX_LIMIT,
      Number(query.limit ?? PAGINATION.DEFAULT_LIMIT),
    ),
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export async function paginateRepository<T extends ObjectLiteral>(
  repository: Repository<T>,
  query: PaginationQueryDto,
  options: Omit<FindManyOptions<T>, 'skip' | 'take'>,
): Promise<PaginatedData<T>> {
  const { page, limit, skip } = getPaginationParams(query);
  const [items, total] = await repository.findAndCount({
    ...options,
    skip,
    take: limit,
  });

  return toPaginatedData(items, total, page, limit);
}

export async function paginateQueryBuilder<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  query: PaginationQueryDto,
): Promise<PaginatedData<T>> {
  const { page, limit, skip } = getPaginationParams(query);
  const [items, total] = await queryBuilder
    .skip(skip)
    .take(limit)
    .getManyAndCount();

  return toPaginatedData(items, total, page, limit);
}
