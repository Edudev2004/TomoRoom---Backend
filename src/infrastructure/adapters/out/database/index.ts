import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL no está definido en el archivo .env');
}

// Disable prefetch as it is not supported for "Transaction" pool mode in Supabase/PgBouncer
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
