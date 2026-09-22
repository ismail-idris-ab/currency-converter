import * as SQLite from 'expo-sqlite';

const DB_NAME = 'converter.db';
const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Applies pending migrations. Uses PRAGMA user_version as the migration
 * marker so no bookkeeping table is needed.
 */
async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS rates (
        code       TEXT    NOT NULL,
        source     TEXT    NOT NULL,
        rate       REAL    NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (code, source)
      );

      CREATE TABLE IF NOT EXISTS custom_rates (
        base       TEXT    NOT NULL,
        quote      TEXT    NOT NULL,
        rate       REAL    NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (base, quote)
      );

      CREATE TABLE IF NOT EXISTS currency_usage (
        code      TEXT    PRIMARY KEY NOT NULL,
        uses      INTEGER NOT NULL DEFAULT 0,
        last_used INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      PRAGMA user_version = ${SCHEMA_VERSION};
    `);
  }
}

/** Opens (once) and migrates the database. Safe to call from anywhere. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      return db;
    })().catch((error: unknown) => {
      // Reset so a later call can retry instead of caching a failed open.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}
