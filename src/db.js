const BASE  = import.meta.env.VITE_TURSO_URL;
const TOKEN = import.meta.env.VITE_TURSO_TOKEN;

function arg(v) {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'number')         return { type: 'float', value: String(v) };
  return { type: 'text', value: String(v) };
}

// Single HTTP round trip for multiple statements
async function pipeline(stmts) {
  const res = await fetch(`${BASE}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        ...stmts.map(s =>
          typeof s === 'string'
            ? { type: 'execute', stmt: { sql: s } }
            : { type: 'execute', stmt: { sql: s.sql, args: (s.args ?? []).map(arg) } }
        ),
        { type: 'close' },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Turso ${res.status}`);
  const data = await res.json();
  return data.results.slice(0, -1).map(r => {
    if (r.type === 'error') throw new Error(r.error.message);
    return r.response.result;
  });
}

async function exec(sql, args = []) {
  const [result] = await pipeline([{ sql, args }]);
  return result;
}

function parseRows(result) {
  const cols = result.cols.map(c => c.name);
  return result.rows.map(row =>
    Object.fromEntries(
      cols.map((col, i) => {
        const cell = row[i];
        const v = cell.type === 'null'    ? null
                : cell.type === 'integer' ? Number(cell.value)
                : cell.type === 'float'   ? Number(cell.value)
                : cell.value;
        return [col, v];
      })
    )
  );
}

export async function initDB() {
  // All 3 DDL statements in one round trip
  await pipeline([
    `CREATE TABLE IF NOT EXISTS daily_logs (
      date        TEXT PRIMARY KEY,
      office      INTEGER,
      satisfied   INTEGER,
      studied     INTEGER,
      pmo_count   INTEGER,
      pmo_support INTEGER,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      amount     REAL NOT NULL,
      note       TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`,
  ]);
}

export async function loadAll() {
  // Both SELECTs in one round trip
  const [logsResult, expsResult] = await pipeline([
    'SELECT * FROM daily_logs ORDER BY date DESC',
    'SELECT * FROM expenses ORDER BY date DESC, created_at ASC',
  ]);

  const days = {};
  for (const r of parseRows(logsResult)) {
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
  for (const r of parseRows(expsResult)) {
    if (!expenses[r.date]) expenses[r.date] = [];
    expenses[r.date].push({ id: r.id, date: r.date, amount: r.amount, note: r.note });
  }

  return { days, expenses };
}

export async function upsertDay(day) {
  await exec(
    `INSERT INTO daily_logs (date, office, satisfied, studied, pmo_count, pmo_support, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(date) DO UPDATE SET
       office = excluded.office, satisfied = excluded.satisfied,
       studied = excluded.studied, pmo_count = excluded.pmo_count,
       pmo_support = excluded.pmo_support, updated_at = datetime('now')`,
    [day.date, day.office ?? null, day.satisfied ?? null, day.studied ?? null, day.pmo_count ?? null, day.pmo_support ?? null]
  );
}

export async function insertExpense(date, amount, note) {
  const result = await exec(
    `INSERT INTO expenses (date, amount, note) VALUES (?, ?, ?)`,
    [date, amount, note]
  );
  return Number(result.last_insert_rowid);
}

export async function removeExpense(id) {
  await exec(`DELETE FROM expenses WHERE id = ?`, [id]);
}
