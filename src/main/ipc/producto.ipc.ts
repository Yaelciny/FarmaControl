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
  stock_actual: number
  fecha_creacion: string
}

interface ActualizarProducto extends CrearProducto {
  id: number
}

function validarProducto(datos: CrearProducto): CrearProducto {
  if (!datos || typeof datos !== "object") {
    throw new Error("Datos del producto inválidos")
  }

  const nombre = datos.nombre?.trim()
  const codigo = datos.codigo_barras?.trim()
  const categoria = datos.categoria?.trim()
  const presentacion = datos.presentacion?.trim()

  if (!nombre) {
    throw new Error("El nombre es obligatorio")
  }

  if (!codigo) {
    throw new Error("El código de barras es obligatorio")
  }

  if (!categoria) {
    throw new Error("La categoría es obligatoria")
  }

  if (!presentacion) {
    throw new Error("La presentación es obligatoria")
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

  return {
    ...datos,
    codigo_barras: codigo || null,
    nombre,
    categoria: categoria || null,
    presentacion: presentacion || null
  }
}

const consultaProducto = `
  SELECT p.*, COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual
  FROM productos p
  LEFT JOIN lotes l ON l.producto_id = p.id
`

export function registerProductosIpc(): void {
  const db = getDatabase()

  // Obtener productos registrados
  ipcMain.handle("productos:listar", () => {
    return db
      .prepare(
        `${consultaProducto}
         GROUP BY p.id
         ORDER BY p.nombre ASC`
      )
      .all() as Producto[]
  })

  // Registrar un medicamento
  ipcMain.handle("productos:crear", (_event, datos: CrearProducto) => {
    const producto = validarProducto(datos)

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
      producto.codigo_barras,
      producto.nombre,
      producto.categoria,
      producto.presentacion,
      producto.precio_venta_centavos,
      producto.stock_minimo
    )

    return db
      .prepare(
        `
        ${consultaProducto}
        WHERE p.id = ?
        GROUP BY p.id
      `
      )
      .get(result.lastInsertRowid) as Producto
  })

  ipcMain.handle(
    "productos:actualizar",
    (_event, datos: ActualizarProducto) => {
      if (!Number.isSafeInteger(datos?.id) || datos.id <= 0) {
        throw new Error("Producto inválido")
      }

      const producto = validarProducto(datos)
      const result = db
        .prepare(
          `
        UPDATE productos
        SET codigo_barras = ?, nombre = ?, categoria = ?, presentacion = ?,
            precio_venta_centavos = ?, stock_minimo = ?
        WHERE id = ?
      `
        )
        .run(
          producto.codigo_barras,
          producto.nombre,
          producto.categoria,
          producto.presentacion,
          producto.precio_venta_centavos,
          producto.stock_minimo,
          datos.id
        )

      if (result.changes === 0) {
        throw new Error("El medicamento no existe")
      }

      return db
        .prepare(`${consultaProducto} WHERE p.id = ? GROUP BY p.id`)
        .get(datos.id) as Producto
    }
  )

  ipcMain.handle(
    "productos:cambiar-estado",
    (_event, datos: { id: number; activo: boolean }) => {
      if (!Number.isSafeInteger(datos?.id) || datos.id <= 0) {
        throw new Error("Producto inválido")
      }

      const result = db
        .prepare("UPDATE productos SET activo = ? WHERE id = ?")
        .run(datos.activo ? 1 : 0, datos.id)

      if (result.changes === 0) {
        throw new Error("El medicamento no existe")
      }

      return { activo: datos.activo }
    }
  )

  ipcMain.handle("productos:eliminar", (_event, id: number) => {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Producto inválido")
    }

    const relaciones = db
      .prepare(
        `
        SELECT
          (SELECT COUNT(*) FROM lotes WHERE producto_id = ?) AS lotes,
          (SELECT COUNT(*) FROM detalle_ventas WHERE producto_id = ?) AS ventas
      `
      )
      .get(id, id) as { lotes: number; ventas: number }

    if (relaciones.lotes > 0 || relaciones.ventas > 0) {
      throw new Error(
        "No se puede eliminar: el medicamento ya tiene historial. Puedes cambiar su estado."
      )
    }

    const result = db.prepare("DELETE FROM productos WHERE id = ?").run(id)

    if (result.changes === 0) {
      throw new Error("El medicamento no existe")
    }

    return { eliminado: true }
  })
}
