export function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export function timeToSeconds(time: string): number {
  const match = TIME_PATTERN.exec(time);

  if (!match) {
    return NaN;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);

  return hours * 3600 + minutes * 60 + seconds;
}

export function isEndTimeAfterStartTime(
  startTime: string,
  endTime: string,
): boolean {
  const startSeconds = timeToSeconds(startTime);
  const endSeconds = timeToSeconds(endTime);

  if (Number.isNaN(startSeconds) || Number.isNaN(endSeconds)) {
    return true;
  }

  return endSeconds > startSeconds;
}

export function isEndDateOnOrAfterStartDate(
  startDate: string,
  endDate: string,
): boolean {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return true;
  }

  return end >= start;
}
