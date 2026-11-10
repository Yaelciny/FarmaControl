import { ipcMain } from "electron"
import { getDatabase } from "../database/connection"

interface CrearProducto {
  codigo_barras: string | null
  nombre: string
  categoria: string | null
  presentacion: string | null
  precio_venta_centavos: number
  stock_minimo: number
}

interface Producto extends CrearProducto {
  id: number
  activo: number
  fecha_creacion: string
}

export function registerProductosIpc(): void {
  const db = getDatabase()

  // Obtener productos registrados
  ipcMain.handle("productos:listar", () => {
    return db
      .prepare(
        `
      SELECT *
      FROM productos
      WHERE activo = 1
      ORDER BY nombre ASC
    `
      )
      .all() as Producto[]
  })

  // Registrar un medicamento
  ipcMain.handle("productos:crear", (_event, datos: CrearProducto) => {
    if (!datos || typeof datos !== "object") {
      throw new Error("Datos del producto inválidos")
    }

    const nombre = datos.nombre?.trim()

    if (!nombre) {
      throw new Error("El nombre es obligatorio")
    }

    if (
      !Number.isSafeInteger(datos.precio_venta_centavos) ||
      datos.precio_venta_centavos < 0
    ) {
      throw new Error("El precio debe ser válido")
    }

    if (!Number.isSafeInteger(datos.stock_minimo) || datos.stock_minimo < 0) {
      throw new Error("El stock mínimo debe ser válido")
    }

    const codigo = datos.codigo_barras?.trim() || null

    const stmt = db.prepare(`
        INSERT INTO productos (
          codigo_barras,
          nombre,
          categoria,
          presentacion,
          precio_venta_centavos,
          stock_minimo
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `)

    const result = stmt.run(
      codigo,
      nombre,
      datos.categoria?.trim() || null,
      datos.presentacion?.trim() || null,
      datos.precio_venta_centavos,
      datos.stock_minimo
    )

    return db
      .prepare(
        `
        SELECT *
        FROM productos
        WHERE id = ?
      `
      )
      .get(result.lastInsertRowid) as Producto
  })
}
