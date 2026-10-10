import { QueryEventDto } from './dto/query-event.dto';

/**
 * Event list pages and one event by id.
 * Change ttlSeconds to use a different lifetime for this module.
 */
export const eventsCache = {
  description:
    'Paginated event lists and a single event for one company. A name search is not stored. A create, update, or delete removes the stored list pages.',
  ttlSeconds: 3 * 60 * 60,
  listKeysKey(companyId: string): string {
    return `cache:events:${companyId}:keys`;
  },
  listKey(companyId: string, query: QueryEventDto): string {
    return [
      'cache:events',
      companyId,
      `p${query.page}`,
      `l${query.limit}`,
      `code${query.eventCode ?? ''}`,
      `exam${query.examType ?? ''}`,
      `type${query.eventType ?? ''}`,
      `pub${query.isPublish ?? ''}`,
      `a${query.isActive ?? ''}`,
    ].join(':');
  },
  itemKey(companyId: string, id: string): string {
    return `cache:events:${companyId}:id:${id}`;
  },
};
