import { PrismaPg } from '@prisma/adapter-pg';
import type { SqlDriverAdapterFactory } from '@prisma/driver-adapter-utils';

export function createPgAdapter(
  connectionString: string,
): SqlDriverAdapterFactory {
  return new PrismaPg({ connectionString });
}
