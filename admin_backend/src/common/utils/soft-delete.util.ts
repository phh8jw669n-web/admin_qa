import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, QueryDeepPartialEntity, Repository } from 'typeorm';
import { apiError } from './api-response.util';

type SoftDeleteOptions<Entity extends ObjectLiteral> = {
  set?: QueryDeepPartialEntity<Entity>;
  andWhere?: string;
  andWhereParams?: ObjectLiteral;
};

export async function softDeleteIfExists<Entity extends ObjectLiteral>(
  repository: Repository<Entity>,
  where: Record<string, string>,
  notFoundMessage: string,
  options: SoftDeleteOptions<Entity> = {},
): Promise<void> {
  const metadata = repository.metadata;
  const qb = repository
    .createQueryBuilder()
    .update()
    .set(
      options.set ??
        ({
          isActive: false,
          deletedAt: new Date(),
        } as unknown as QueryDeepPartialEntity<Entity>),
    );

  Object.entries(where).forEach(([propertyName, value], index) => {
    const column = metadata.findColumnWithPropertyName(propertyName);
    const dbName = column?.databaseName ?? propertyName;
    const clause = `${dbName} = :${propertyName}`;

    if (index === 0) {
      qb.where(clause, { [propertyName]: value });
      return;
    }

    qb.andWhere(clause, { [propertyName]: value });
  });

  const deletedColumn = metadata.deleteDateColumn?.databaseName ?? 'deleted_at';
  qb.andWhere(`${deletedColumn} IS NULL`);

  if (options.andWhere) {
    qb.andWhere(options.andWhere, options.andWhereParams);
  }

  const result = await qb.execute();

  if (!result.affected) {
    throw new NotFoundException(apiError(notFoundMessage));
  }
}
