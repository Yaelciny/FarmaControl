import { getDatabase } from "./connection"

export function initializeDatabase(): void {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_barras TEXT UNIQUE,
        nombre TEXT NOT NULL,
        categoria TEXT,
        presentacion TEXT,
        precio_venta_centavos INTEGER NOT NULL DEFAULT 0
        CHECK (precio_venta_centavos >= 0),
        stock_minimo INTEGER NOT NULL DEFAULT 5
        CHECK (stock_minimo >= 0),
        activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),
        fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  console.log("Tabla productos creada correctamente")
}
