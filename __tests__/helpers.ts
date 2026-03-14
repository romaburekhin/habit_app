import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  const schema = fs.readFileSync(path.join(process.cwd(), 'db/schema.sql'), 'utf-8')
  db.exec(schema)
  return db
}

export function createTestUser(): string {
  return '00000000-0000-0000-0000-000000000001'
}
