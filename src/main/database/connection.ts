import Database from "better-sqlite3"
import { app } from "electron"
import { join } from "path"
import { mkdirSync } from "fs"

// Crear base de datos y habilitar el modo WAL para mejorar el manejo de transacciones

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const dataPath = join(app.getPath("userData"), "data")

  mkdirSync(dataPath, { recursive: true })

  const dbPath = join(dataPath, "farmacontrol.db")

  db = new Database(dbPath)

  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")

  console.log("Base de datos conectada: ", dbPath)

  return db
}

export function closeDatabase(): void {
  db?.close()
  db = null
}
