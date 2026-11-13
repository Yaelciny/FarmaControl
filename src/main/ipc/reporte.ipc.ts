import { ipcMain } from "electron"
import { getDatabase } from "../database/connection"

interface FiltroReporte {
  desde: string
  hasta: string
}

export interface ReporteResumen {
  ventas: {
    cantidad: number
    canceladas: number
    total_centavos: number
    efectivo_centavos: number
    tarjeta_centavos: number
    transferencia_centavos: number
  }
  inventario: {
    productos_activos: number
    stock_bajo: number
    agotados: number
    lotes_caducados: number
    lotes_por_caducar: number
  }
  mas_vendidos: Array<{
    producto_nombre: string
    cantidad: number
    total_centavos: number
  }>
}

function validarFiltro(filtro: FiltroReporte): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(filtro?.desde ?? "")) {
    throw new Error("La fecha inicial no es válida")
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(filtro?.hasta ?? "")) {
    throw new Error("La fecha final no es válida")
  }
  if (filtro.desde > filtro.hasta) {
    throw new Error("La fecha inicial no puede ser posterior a la fecha final")
  }
}

export function registerReportesIpc(): void {
  const db = getDatabase()

  ipcMain.handle("reportes:resumen", (_event, filtro: FiltroReporte) => {
    validarFiltro(filtro)

    const ventas = db
      .prepare(
        `
        SELECT
          COUNT(CASE WHEN estado = 'completada' THEN 1 END) AS cantidad,
          COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) AS canceladas,
          COALESCE(SUM(CASE WHEN estado = 'completada' THEN total_centavos ELSE 0 END), 0) AS total_centavos,
          COALESCE(SUM(CASE WHEN estado = 'completada' AND metodo_pago = 'efectivo' THEN total_centavos ELSE 0 END), 0) AS efectivo_centavos,
          COALESCE(SUM(CASE WHEN estado = 'completada' AND metodo_pago = 'tarjeta' THEN total_centavos ELSE 0 END), 0) AS tarjeta_centavos,
          COALESCE(SUM(CASE WHEN estado = 'completada' AND metodo_pago = 'transferencia' THEN total_centavos ELSE 0 END), 0) AS transferencia_centavos
        FROM ventas
        WHERE date(fecha, '-6 hours') BETWEEN ? AND ?
      `
      )
      .get(filtro.desde, filtro.hasta) as ReporteResumen["ventas"]

    const inventario = db
      .prepare(
        `
        SELECT
          (SELECT COUNT(*) FROM productos WHERE activo = 1) AS productos_activos,
          (SELECT COUNT(*) FROM (
             SELECT p.id, p.stock_minimo, COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual
             FROM productos p
             LEFT JOIN lotes l ON l.producto_id = p.id
             WHERE p.activo = 1
             GROUP BY p.id
             HAVING stock_actual > 0 AND stock_actual <= stock_minimo
           )) AS stock_bajo,
          (SELECT COUNT(*) FROM (
             SELECT p.id, COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual
             FROM productos p
             LEFT JOIN lotes l ON l.producto_id = p.id
             WHERE p.activo = 1
             GROUP BY p.id
             HAVING stock_actual = 0
           )) AS agotados,
          (SELECT COUNT(*) FROM lotes l
           INNER JOIN productos p ON p.id = l.producto_id
           WHERE p.activo = 1 AND l.cantidad_actual > 0
             AND date(l.fecha_caducidad) < date('now', '-6 hours')) AS lotes_caducados,
          (SELECT COUNT(*) FROM lotes l
           INNER JOIN productos p ON p.id = l.producto_id
           WHERE p.activo = 1 AND l.cantidad_actual > 0
             AND date(l.fecha_caducidad) BETWEEN date('now', '-6 hours')
                 AND date('now', '-6 hours', '+30 days')) AS lotes_por_caducar
      `
      )
      .get() as ReporteResumen["inventario"]

    const masVendidos = db
      .prepare(
        `
        SELECT p.nombre AS producto_nombre,
               SUM(dv.cantidad) AS cantidad,
               SUM(dv.subtotal_centavos) AS total_centavos
        FROM detalle_ventas dv
        INNER JOIN ventas v ON v.id = dv.venta_id
        INNER JOIN productos p ON p.id = dv.producto_id
        WHERE v.estado = 'completada'
          AND date(v.fecha, '-6 hours') BETWEEN ? AND ?
        GROUP BY dv.producto_id
        ORDER BY cantidad DESC, total_centavos DESC
        LIMIT 10
      `
      )
      .all(filtro.desde, filtro.hasta) as ReporteResumen["mas_vendidos"]

    return {
      ventas,
      inventario,
      mas_vendidos: masVendidos
    } satisfies ReporteResumen
  })
}
