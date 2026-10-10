import {
  IsBoolean,
  IsDateString,
  Matches,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/** Swagger-only body. Not used for request validation. */
export class PublishTestScheduleDto {
  @IsBoolean()
  isPublished!: boolean;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @Matches(TIME_PATTERN)
  startTime!: string;

  @Matches(TIME_PATTERN)
  endTime!: string;

  @Matches(TIME_PATTERN)
  startBufferTime!: string;
}

export const updateTestExamples = {
  update: {
    summary: 'Update test',
    description: 'Any subset of the test fields.',
    value: {
      name: 'Sample test',
    },
  },
  publishSchedule: {
    summary: 'Publish schedule',
    description:
      'isPublished, startDate, endDate, startTime, endTime, and startBufferTime are required in this body.',
    value: {
      isPublished: true,
      startDate: '2026-10-07',
      endDate: '2026-10-08',
      startTime: '09:00:00',
      endTime: '12:00:00',
      startBufferTime: '00:15:00',
    },
  },
};
