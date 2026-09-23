import { getDb } from './db';

/** Records that a currency was chosen, for usage-based sorting in the picker. */
export async function recordUsage(code: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO currency_usage (code, uses, last_used) VALUES (?, 1, ?)
     ON CONFLICT(code) DO UPDATE SET uses = uses + 1, last_used = excluded.last_used`,
    [code, Date.now()],
  );
}

/** Usage counts keyed by currency code. Missing codes simply have no entry. */
export async function loadUsage(): Promise<Readonly<Record<string, number>>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ code: string; uses: number }>(
    'SELECT code, uses FROM currency_usage',
  );
  const out: Record<string, number> = {};
  for (const row of rows) out[row.code] = row.uses;
  return out;
}

/** Clears usage history (Settings → Clear usage data). */
export async function clearUsage(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM currency_usage');
}
