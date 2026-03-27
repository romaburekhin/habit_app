import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'habits.sqlite')
const SCHEMA_PATH = path.join(process.cwd(), 'db', 'schema.sql')

declare global {
  // eslint-disable-next-line no-var
  var _db: Database.Database | undefined
}

export function getDb(): Database.Database {
  if (!global._db) {
    global._db = new Database(DB_PATH)
    global._db.pragma('journal_mode = WAL')
    global._db.pragma('foreign_keys = ON')
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
    global._db.exec(schema)
    migrate(global._db)
  }
  return global._db
}

function migrate(db: Database.Database) {
  const habitCols = db.pragma('table_info(habits)') as Array<{ name: string }>
  if (!habitCols.find(c => c.name === 'goal')) {
    db.exec('ALTER TABLE habits ADD COLUMN goal INTEGER NOT NULL DEFAULT 10')
  }
  if (!habitCols.find(c => c.name === 'completed_days')) {
    db.exec('ALTER TABLE habits ADD COLUMN completed_days INTEGER NOT NULL DEFAULT 0')
  }
  if (!habitCols.find(c => c.name === 'color')) {
    db.exec('ALTER TABLE habits ADD COLUMN color TEXT')
  }
  if (!habitCols.find(c => c.name === 'sort_order')) {
    db.exec('ALTER TABLE habits ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
    db.exec('UPDATE habits SET sort_order = id')
  }

  const tables = (db.pragma('table_list') as Array<{ name: string }>).map(t => t.name)
  if (!tables.includes('profiles')) {
    db.exec(`CREATE TABLE profiles (
      user_id TEXT PRIMARY KEY,
      email   TEXT NOT NULL,
      name    TEXT
    )`)
  }
  if (!tables.includes('challenges')) {
    db.exec(`CREATE TABLE challenges (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      inviter_id       TEXT    NOT NULL,
      invitee_email    TEXT    NOT NULL,
      invitee_id       TEXT,
      inviter_habit_id INTEGER NOT NULL,
      invitee_habit_id INTEGER,
      status           TEXT    NOT NULL DEFAULT 'pending',
      created_at       TEXT    NOT NULL,
      FOREIGN KEY (inviter_habit_id) REFERENCES habits(id) ON DELETE CASCADE
    )`)
  }
}
