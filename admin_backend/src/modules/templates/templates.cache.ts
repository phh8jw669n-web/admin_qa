import { QueryTemplateDto } from './dto/query-template.dto';

/**
 * Template list pages and one template by id.
 * Templates are global. Change ttlSeconds to use a different lifetime.
 */
export const templatesCache = {
  description:
    'Paginated global template lists and a single template. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(): string {
    return 'cache:templates:keys';
  },
  listKey(query: QueryTemplateDto): string {
    return [
      'cache:templates',
      `p${query.page}`,
      `l${query.limit}`,
      `r${query.ranking ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(id: string): string {
    return `cache:templates:id:${id}`;
  },
};
