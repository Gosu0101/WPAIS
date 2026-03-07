import { ColumnType } from 'typeorm';

export const DATETIME_COLUMN_TYPE: ColumnType =
  process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamp';
