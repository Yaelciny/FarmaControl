import { ipcMain } from "electron"
import { getDatabase } from "../database/connection"

export interface ResultadoBusqueda {
  id: string
  tipo: "producto" | "lote"
  titulo: string
  detalle: string
  producto_id: number
  lote_id: number | null
  stock_actual: number | null
  stock_minimo: number | null
  precio_venta_centavos: number | null
  presentacion: string | null
  fecha_caducidad: string | null
  cantidad_actual: number | null
}

export function registerBusquedaIpc(): void {
  const db = getDatabase()

  ipcMain.handle("busqueda:global", (_event, termino: string) => {
    const texto = typeof termino === "string" ? termino.trim() : ""
    if (texto.length < 2) return [] as ResultadoBusqueda[]
    const patron = `%${texto}%`

    const productos = db
      .prepare(
        `
        SELECT p.id AS producto_id, p.nombre, p.codigo_barras,
               p.categoria, p.presentacion, p.stock_minimo,
               p.precio_venta_centavos,
               COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual
        FROM productos p
        LEFT JOIN lotes l ON l.producto_id = p.id
        WHERE p.activo = 1
          AND (p.nombre LIKE ? OR p.codigo_barras LIKE ?
            OR p.categoria LIKE ? OR p.presentacion LIKE ?)
        GROUP BY p.id
        ORDER BY p.nombre ASC
        LIMIT 8
      `
      )
      .all(patron, patron, patron, patron) as Array<{
      producto_id: number
      nombre: string
      codigo_barras: string | null
      categoria: string | null
      presentacion: string | null
      stock_minimo: number
      precio_venta_centavos: number
      stock_actual: number
    }>

    const lotes = db
      .prepare(
        `
        SELECT l.id AS lote_id, l.producto_id, p.nombre,
               l.numero_lote, l.cantidad_actual, l.fecha_caducidad
        FROM lotes l
        INNER JOIN productos p ON p.id = l.producto_id
        LEFT JOIN proveedores pr ON pr.id = l.proveedor_id
        WHERE p.activo = 1
          AND (l.numero_lote LIKE ? OR p.nombre LIKE ? OR pr.nombre LIKE ?)
        ORDER BY p.nombre ASC, l.fecha_caducidad ASC
        LIMIT 8
      `
      )
      .all(patron, patron, patron) as Array<{
      lote_id: number
      producto_id: number
      nombre: string
      numero_lote: string
      cantidad_actual: number
      fecha_caducidad: string
    }>

    return [
      ...productos.map((producto) => ({
        id: `producto-${producto.producto_id}`,
        tipo: "producto" as const,
        titulo: producto.nombre,
        detalle:
          [producto.presentacion, producto.codigo_barras]
            .filter(Boolean)
            .join(" · ") || "Medicamento activo",
        producto_id: producto.producto_id,
        lote_id: null,
        stock_actual: producto.stock_actual,
        stock_minimo: producto.stock_minimo,
        precio_venta_centavos: producto.precio_venta_centavos,
        presentacion: producto.presentacion,
        fecha_caducidad: null,
        cantidad_actual: null
      })),
      ...lotes.map((lote) => ({
        id: `lote-${lote.lote_id}`,
        tipo: "lote" as const,
        titulo: `${lote.nombre} · Lote ${lote.numero_lote}`,
        detalle: `${lote.cantidad_actual} disponibles`,
        producto_id: lote.producto_id,
        lote_id: lote.lote_id,
        stock_actual: null,
        stock_minimo: null,
        precio_venta_centavos: null,
        presentacion: null,
        fecha_caducidad: lote.fecha_caducidad,
        cantidad_actual: lote.cantidad_actual
      }))
    ] as ResultadoBusqueda[]
  })
}
