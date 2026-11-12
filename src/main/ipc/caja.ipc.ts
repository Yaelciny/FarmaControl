import { ipcMain } from "electron"
import { getDatabase } from "../database/connection"

export interface CajaCorte {
  id: number
  fecha_apertura: string
  fecha_cierre: string | null
  fondo_inicial_centavos: number
  ventas_efectivo_centavos: number
  ventas_tarjeta_centavos: number
  ventas_transferencia_centavos: number
  total_ventas_centavos: number
  efectivo_esperado_centavos: number
  efectivo_contado_centavos: number | null
  diferencia_centavos: number | null
  observacion: string | null
  estado: "abierta" | "cerrada"
}

export interface CajaResumen {
  corte: CajaCorte | null
  ventas_efectivo_centavos: number
  ventas_tarjeta_centavos: number
  ventas_transferencia_centavos: number
  total_ventas_centavos: number
  efectivo_esperado_centavos: number
}

function obtenerResumenCorte(corte: CajaCorte): CajaResumen {
  const db = getDatabase()
  const ventas = db
    .prepare(
      `
      SELECT
        COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total_centavos ELSE 0 END), 0) AS ventas_efectivo_centavos,
        COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total_centavos ELSE 0 END), 0) AS ventas_tarjeta_centavos,
        COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total_centavos ELSE 0 END), 0) AS ventas_transferencia_centavos,
        COALESCE(SUM(total_centavos), 0) AS total_ventas_centavos
      FROM ventas
      WHERE estado = 'completada'
        AND datetime(fecha) >= datetime(?)
    `
    )
    .get(corte.fecha_apertura) as {
    ventas_efectivo_centavos: number
    ventas_tarjeta_centavos: number
    ventas_transferencia_centavos: number
    total_ventas_centavos: number
  }

  return {
    corte,
    ...ventas,
    efectivo_esperado_centavos:
      corte.fondo_inicial_centavos + ventas.ventas_efectivo_centavos
  }
}

export function registerCajaIpc(): void {
  const db = getDatabase()

  ipcMain.handle("caja:estado", () => {
    const corte = db
      .prepare(
        "SELECT * FROM cortes_caja WHERE estado = 'abierta' ORDER BY id DESC LIMIT 1"
      )
      .get() as CajaCorte | undefined

    if (!corte) {
      return {
        corte: null,
        ventas_efectivo_centavos: 0,
        ventas_tarjeta_centavos: 0,
        ventas_transferencia_centavos: 0,
        total_ventas_centavos: 0,
        efectivo_esperado_centavos: 0
      } satisfies CajaResumen
    }

    return obtenerResumenCorte(corte)
  })

  ipcMain.handle("caja:abrir", (_event, fondoInicialCentavos: number) => {
    if (
      !Number.isSafeInteger(fondoInicialCentavos) ||
      fondoInicialCentavos < 0
    ) {
      throw new Error("El fondo inicial no es válido")
    }

    const abierta = db
      .prepare("SELECT id FROM cortes_caja WHERE estado = 'abierta' LIMIT 1")
      .get() as { id: number } | undefined
    if (abierta) throw new Error("Ya existe una caja abierta")

    const resultado = db
      .prepare("INSERT INTO cortes_caja (fondo_inicial_centavos) VALUES (?)")
      .run(fondoInicialCentavos)

    return { id: Number(resultado.lastInsertRowid) }
  })

  ipcMain.handle(
    "caja:cerrar",
    (
      _event,
      datos: { efectivo_contado_centavos: number; observacion: string | null }
    ) => {
      if (
        !Number.isSafeInteger(datos.efectivo_contado_centavos) ||
        datos.efectivo_contado_centavos < 0
      ) {
        throw new Error("El efectivo contado no es válido")
      }

      const transaccion = db.transaction(() => {
        const corte = db
          .prepare(
            "SELECT * FROM cortes_caja WHERE estado = 'abierta' ORDER BY id DESC LIMIT 1"
          )
          .get() as CajaCorte | undefined
        if (!corte) throw new Error("No hay una caja abierta para cerrar")

        const resumen = obtenerResumenCorte(corte)
        const diferencia =
          datos.efectivo_contado_centavos - resumen.efectivo_esperado_centavos

        db.prepare(
          `
          UPDATE cortes_caja
          SET fecha_cierre = CURRENT_TIMESTAMP,
              ventas_efectivo_centavos = ?,
              ventas_tarjeta_centavos = ?,
              ventas_transferencia_centavos = ?,
              total_ventas_centavos = ?,
              efectivo_esperado_centavos = ?,
              efectivo_contado_centavos = ?,
              diferencia_centavos = ?,
              observacion = ?,
              estado = 'cerrada'
          WHERE id = ?
        `
        ).run(
          resumen.ventas_efectivo_centavos,
          resumen.ventas_tarjeta_centavos,
          resumen.ventas_transferencia_centavos,
          resumen.total_ventas_centavos,
          resumen.efectivo_esperado_centavos,
          datos.efectivo_contado_centavos,
          diferencia,
          datos.observacion?.trim() || null,
          corte.id
        )

        return { id: corte.id, diferencia_centavos: diferencia }
      })

      return transaccion()
    }
  )

  ipcMain.handle(
    "caja:historial",
    () =>
      db
        .prepare(
          "SELECT * FROM cortes_caja WHERE estado = 'cerrada' ORDER BY fecha_cierre DESC, id DESC"
        )
        .all() as CajaCorte[]
  )
}
