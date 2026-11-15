import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * Creates a Drizzle client for Supabase Postgres.
 * Shared Postgres client factory for the backend's primary data store.
 */
export const createPostgresClient = (connectionString = process.env.DATABASE_URL) => {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to connect to Supabase Postgres.");
  }

  const client = postgres(connectionString, { prepare: false });
  return { db: drizzle(client), client };
};
