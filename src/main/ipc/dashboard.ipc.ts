import { ipcMain } from "electron"
import { getDatabase } from "../database/connection"

export interface DashboardResumen {
  ventas_hoy_centavos: number
  medicamentos_registrados: number
  stock_bajo: number
  caducidades_proximas: number
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
}
