import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let dbInstance: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sahara.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const buffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(buffer);
    } catch (err) {
      console.error('Failed reading existing SQLite file, creating fresh DB', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initTables(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

function initTables(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      district TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      docket_number TEXT UNIQUE NOT NULL,
      citizen_name TEXT NOT NULL,
      phone_encrypted TEXT NOT NULL,
      phone_masked TEXT NOT NULL,
      district TEXT NOT NULL,
      language TEXT NOT NULL,
      channel TEXT NOT NULL,
      intent TEXT NOT NULL,
      consent_given INTEGER NOT NULL,
      opted_out_of_ai INTEGER NOT NULL,
      svi_score INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      confidence REAL NOT NULL,
      sub_scores_json TEXT NOT NULL,
      explanation_json TEXT NOT NULL,
      recommended_actions_json TEXT NOT NULL,
      voice_features_json TEXT,
      raw_audio_stored INTEGER NOT NULL,
      transcript TEXT,
      messages_json TEXT NOT NULL,
      status TEXT NOT NULL,
      counsellor_decision_json TEXT,
      pattern_flags_json TEXT NOT NULL,
      is_flagged_for_review INTEGER NOT NULL,
      repeat_caller INTEGER NOT NULL,
      prior_case_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      question TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      completed_date TEXT,
      status TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      response TEXT,
      response_score INTEGER,
      response_risk TEXT,
      safety_rating INTEGER,
      FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      case_id TEXT,
      details TEXT NOT NULL,
      ip_address TEXT
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      channel TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// Helper to run query with params
export function queryAll<T = any>(db: Database, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(db: Database, sql: string, params: any[] = []): T | null {
  const all = queryAll<T>(db, sql, params);
  return all.length > 0 ? all[0] : null;
}

export function execute(db: Database, sql: string, params: any[] = []): void {
  db.run(sql, params);
  saveDb();
}
