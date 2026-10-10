import { ILike, type FindOperator } from 'typeorm';

export function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function ilikePrefix(value: string): FindOperator<string> {
  return ILike(`${escapeIlike(value)}%`);
}
