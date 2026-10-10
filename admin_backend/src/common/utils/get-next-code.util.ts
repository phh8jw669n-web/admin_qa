import { ObjectLiteral, Repository } from 'typeorm';

export interface GetNextCodeOptions {
  codeField?: string;
  withDeleted?: boolean;
}

export async function getNextGlobalCode<T extends ObjectLiteral>(
  repository: Repository<T>,
  prefix: string,
  padLength = 2,
  options?: GetNextCodeOptions,
): Promise<string> {
  const codeField = options?.codeField ?? 'code';

  const qb = repository
    .createQueryBuilder('entity')
    .select(
      `
      COALESCE(
        MAX(
          CAST(
            SUBSTRING(entity.${codeField} FROM '[0-9]+$')
            AS INTEGER
          )
        ),
        0
      )
      `,
      'maxSequence',
    )
    .where(`entity.${codeField} LIKE :pattern`, {
      pattern: `${prefix}-%`,
    });

  if (options?.withDeleted) {
    qb.withDeleted();
  }

  const result = await qb.getRawOne<{ maxSequence: string }>();
  const nextSequence = Number(result?.maxSequence ?? 0) + 1;

  return `${prefix}-${String(nextSequence).padStart(padLength, '0')}`;
}
