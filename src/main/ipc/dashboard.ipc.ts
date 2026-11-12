import { ipcMain } from "electron"
import { getDatabase } from "../database/connection"

export interface DashboardResumen {
  ventas_hoy_centavos: number
  medicamentos_registrados: number
  stock_bajo: number
  caducidades_proximas: number
}

export interface DashboardAlerta {
  id: string
  tipo: "caducado" | "por_caducar" | "stock_bajo" | "agotado"
  titulo: string
  descripcion: string
  producto_id: number
  producto_nombre: string
  lote_id: number | null
  numero_lote: string | null
  fecha_caducidad: string | null
  cantidad: number
  stock_minimo: number | null
  destino: "inventario" | "entradas"
  prioridad: "alta" | "media"
}

export function registerDashboardIpc(): void {
  const db = getDatabase()

  ipcMain.handle(
    "dashboard:resumen",
    () =>
      db
        .prepare(
          `
        SELECT
          (SELECT COALESCE(SUM(total_centavos), 0)
           FROM ventas
           WHERE estado = 'completada'
             AND date(fecha, 'localtime') = date('now', 'localtime')) AS ventas_hoy_centavos,
          (SELECT COUNT(*) FROM productos WHERE activo = 1) AS medicamentos_registrados,
          (SELECT COUNT(*) FROM (
             SELECT p.id, p.stock_minimo, COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual
             FROM productos p
             LEFT JOIN lotes l ON l.producto_id = p.id
             WHERE p.activo = 1
             GROUP BY p.id
             HAVING stock_actual <= stock_minimo
           )) AS stock_bajo,
          (SELECT COUNT(*)
           FROM lotes l
           INNER JOIN productos p ON p.id = l.producto_id
           WHERE p.activo = 1
             AND l.cantidad_actual > 0
             AND date(l.fecha_caducidad) BETWEEN date('now', 'localtime') AND date('now', 'localtime', '+30 days')) AS caducidades_proximas
      `
        )
        .get() as DashboardResumen
  )

  ipcMain.handle("dashboard:alertas", () => {
    const alertas: DashboardAlerta[] = []
    const lotesCaducados = db
      .prepare(
        `
        SELECT l.id AS lote_id, l.producto_id, p.nombre AS producto_nombre,
               l.numero_lote, l.fecha_caducidad, l.cantidad_actual AS cantidad
        FROM lotes l
        INNER JOIN productos p ON p.id = l.producto_id
        WHERE p.activo = 1
          AND l.cantidad_actual > 0
          AND date(l.fecha_caducidad) < date('now', 'localtime')
        ORDER BY date(l.fecha_caducidad) ASC, p.nombre ASC
      `
      )
      .all() as Array<{
      lote_id: number
      producto_id: number
      producto_nombre: string
      numero_lote: string
      fecha_caducidad: string
      cantidad: number
    }>

    for (const lote of lotesCaducados) {
      alertas.push({
        id: `caducado-${lote.lote_id}`,
        tipo: "caducado",
        titulo: "Lote caducado",
        descripcion: `${lote.producto_nombre} · Lote ${lote.numero_lote}`,
        producto_id: lote.producto_id,
        producto_nombre: lote.producto_nombre,
        lote_id: lote.lote_id,
        numero_lote: lote.numero_lote,
        fecha_caducidad: lote.fecha_caducidad,
        cantidad: lote.cantidad,
        stock_minimo: null,
        destino: "entradas",
        prioridad: "alta"
      })
    }

    const lotesPorCaducar = db
      .prepare(
        `
        SELECT l.id AS lote_id, l.producto_id, p.nombre AS producto_nombre,
               l.numero_lote, l.fecha_caducidad, l.cantidad_actual AS cantidad
        FROM lotes l
        INNER JOIN productos p ON p.id = l.producto_id
        WHERE p.activo = 1
          AND l.cantidad_actual > 0
          AND date(l.fecha_caducidad) BETWEEN date('now', 'localtime')
              AND date('now', 'localtime', '+30 days')
        ORDER BY date(l.fecha_caducidad) ASC, p.nombre ASC
      `
      )
      .all() as Array<{
      lote_id: number
      producto_id: number
      producto_nombre: string
      numero_lote: string
      fecha_caducidad: string
      cantidad: number
    }>

    for (const lote of lotesPorCaducar) {
      alertas.push({
        id: `por-caducar-${lote.lote_id}`,
        tipo: "por_caducar",
        titulo: "Próxima caducidad",
        descripcion: `${lote.producto_nombre} · Lote ${lote.numero_lote}`,
        producto_id: lote.producto_id,
        producto_nombre: lote.producto_nombre,
        lote_id: lote.lote_id,
        numero_lote: lote.numero_lote,
        fecha_caducidad: lote.fecha_caducidad,
        cantidad: lote.cantidad,
        stock_minimo: null,
        destino: "entradas",
        prioridad: "media"
      })
    }

    const stockProductos = db
      .prepare(
        `
        SELECT p.id AS producto_id, p.nombre AS producto_nombre,
               p.stock_minimo, COALESCE(SUM(l.cantidad_actual), 0) AS cantidad
        FROM productos p
        LEFT JOIN lotes l ON l.producto_id = p.id
        WHERE p.activo = 1
        GROUP BY p.id
        HAVING cantidad <= p.stock_minimo
        ORDER BY cantidad ASC, p.nombre ASC
      `
      )
      .all() as Array<{
      producto_id: number
      producto_nombre: string
      stock_minimo: number
      cantidad: number
    }>

    for (const producto of stockProductos) {
      const agotado = producto.cantidad === 0
      alertas.push({
        id: `${agotado ? "agotado" : "stock-bajo"}-${producto.producto_id}`,
        tipo: agotado ? "agotado" : "stock_bajo",
        titulo: agotado ? "Producto agotado" : "Stock bajo",
        descripcion: `${producto.producto_nombre} · ${producto.cantidad} disponibles`,
        producto_id: producto.producto_id,
        producto_nombre: producto.producto_nombre,
        lote_id: null,
        numero_lote: null,
        fecha_caducidad: null,
        cantidad: producto.cantidad,
        stock_minimo: producto.stock_minimo,
        destino: "inventario",
        prioridad: agotado ? "alta" : "media"
      })
    }

    return alertas
  })
}
