import * as SQLite from 'expo-sqlite'

const DB_NAME = 'parkclear_offline.db'

let db: SQLite.SQLiteDatabase | null = null

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        type        TEXT NOT NULL,
        payload     TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        attempts    INTEGER NOT NULL DEFAULT 0,
        last_error  TEXT
      );
    `)
  }
  return db
}

export interface QueuedDossier {
  vehicleType: string
  plate: string | null
  noPlate: boolean
  siteId: string
  locationSpot: string | null
  vehicleBrand: string | null
  vehicleColor: string | null
  notes: string | null
  photoUris: string[]
}

export async function enqueueDossier(dossier: QueuedDossier): Promise<number> {
  const database = await getDb()
  const result = await database.runAsync(
    `INSERT INTO offline_queue (type, payload) VALUES (?, ?)`,
    ['create_dossier', JSON.stringify(dossier)]
  )
  return result.lastInsertRowId
}

export interface QueueItem {
  id: number
  type: string
  payload: string
  created_at: string
  attempts: number
  last_error: string | null
}

export async function getPendingItems(): Promise<QueueItem[]> {
  const database = await getDb()
  return database.getAllAsync<QueueItem>(
    `SELECT * FROM offline_queue WHERE attempts < 3 ORDER BY created_at ASC`
  )
}

export async function markSuccess(id: number): Promise<void> {
  const database = await getDb()
  await database.runAsync(`DELETE FROM offline_queue WHERE id = ?`, [id])
}

export async function markFailed(id: number, error: string): Promise<void> {
  const database = await getDb()
  await database.runAsync(
    `UPDATE offline_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
    [error, id]
  )
}

export async function getPendingCount(): Promise<number> {
  const database = await getDb()
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM offline_queue`
  )
  return row?.count ?? 0
}
