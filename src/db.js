import { createClient } from '@libsql/client/web';

const client = createClient({
  url: import.meta.env.VITE_TURSO_URL,
  authToken: import.meta.env.VITE_TURSO_TOKEN,
});

export async function initDB() {
  await client.execute(`CREATE TABLE IF NOT EXISTS daily_logs (
    date        TEXT PRIMARY KEY,
    office      INTEGER,
    satisfied   INTEGER,
    studied     INTEGER,
    pmo_count   INTEGER,
    pmo_support INTEGER,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  await client.execute(`CREATE TABLE IF NOT EXISTS expenses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT NOT NULL,
    amount     REAL NOT NULL,
    note       TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`
  );
}

export async function loadAll() {
  const [logs, exps] = await Promise.all([
    client.execute('SELECT * FROM daily_logs ORDER BY date DESC'),
    client.execute('SELECT * FROM expenses ORDER BY date DESC, created_at ASC'),
  ]);

  const days = {};
  for (const r of logs.rows) {
    days[r.date] = {
      date: r.date,
      office: r.office,
      satisfied: r.satisfied,
      studied: r.studied,
      pmo_count: r.pmo_count,
      pmo_support: r.pmo_support,
    };
  }

  const expenses = {};
  for (const r of exps.rows) {
    if (!expenses[r.date]) expenses[r.date] = [];
    expenses[r.date].push({
      id: Number(r.id),
      date: r.date,
      amount: Number(r.amount),
      note: r.note,
    });
  }

  return { days, expenses };
}

export async function upsertDay(day) {
  await client.execute({
    sql: `INSERT INTO daily_logs (date, office, satisfied, studied, pmo_count, pmo_support, updated_at)
          VALUES (:date, :office, :satisfied, :studied, :pmo_count, :pmo_support, datetime('now'))
          ON CONFLICT(date) DO UPDATE SET
            office      = :office,
            satisfied   = :satisfied,
            studied     = :studied,
            pmo_count   = :pmo_count,
            pmo_support = :pmo_support,
            updated_at  = datetime('now')`,
    args: {
      date:        day.date,
      office:      day.office      ?? null,
      satisfied:   day.satisfied   ?? null,
      studied:     day.studied     ?? null,
      pmo_count:   day.pmo_count   ?? null,
      pmo_support: day.pmo_support ?? null,
    },
  });
}

export async function insertExpense(date, amount, note) {
  const res = await client.execute({
    sql:  `INSERT INTO expenses (date, amount, note) VALUES (?, ?, ?)`,
    args: [date, amount, note],
  });
  return Number(res.lastInsertRowid);
}

export async function removeExpense(id) {
  await client.execute({ sql: `DELETE FROM expenses WHERE id = ?`, args: [id] });
}
