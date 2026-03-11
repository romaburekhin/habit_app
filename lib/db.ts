import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'habits.sqlite')
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
  const cols = db.pragma('table_info(habits)') as Array<{ name: string }>
  if (!cols.find(c => c.name === 'goal')) {
    db.exec('ALTER TABLE habits ADD COLUMN goal INTEGER NOT NULL DEFAULT 10')
  }
  if (!cols.find(c => c.name === 'completed_days')) {
    db.exec('ALTER TABLE habits ADD COLUMN completed_days INTEGER NOT NULL DEFAULT 0')
  }
  if (!cols.find(c => c.name === 'color')) {
    db.exec('ALTER TABLE habits ADD COLUMN color TEXT')
  }
}
