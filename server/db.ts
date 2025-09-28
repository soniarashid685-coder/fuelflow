import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// This function is used to migrate the database schema.
// It will create tables if they don't exist.
export async function migrate() {
  // Using a transaction to ensure all operations are atomic.
  await db.transaction(async (tx) => {
    const sql = (await import('drizzle-orm/sql')).sql;

    // Create tables if they don't exist
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        station_id VARCHAR,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS stations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        address TEXT,
        gst_number TEXT,
        license_number TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        default_currency TEXT NOT NULL DEFAULT 'PKR',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create pumps table
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS pumps (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id VARCHAR NOT NULL REFERENCES stations(id),
        name TEXT NOT NULL,
        pump_number TEXT NOT NULL,
        product_id VARCHAR NOT NULL REFERENCES products(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create pump_readings table
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS pump_readings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        pump_id VARCHAR NOT NULL REFERENCES pumps(id),
        station_id VARCHAR NOT NULL REFERENCES stations(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        product_id VARCHAR NOT NULL REFERENCES products(id),
        reading_date DATE NOT NULL,
        opening_reading DECIMAL(10,3) NOT NULL,
        closing_reading DECIMAL(10,3) NOT NULL,
        total_sale DECIMAL(10,3) NOT NULL,
        shift_number TEXT NOT NULL,
        operator_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  });
}