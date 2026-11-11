import { ipcMain } from "electron"
import { getDatabase } from "../database/connection"

type MotivoSalida =
  "danado" | "caducado" | "perdido" | "devolucion" | "ajuste" | "otro"

interface CrearSalida {
  lote_id: number
  motivo: MotivoSalida
  cantidad: number
  observacion: string | null
}

interface LoteDisponible {
  id: number
  producto_id: number
  producto_nombre: string
  numero_lote: string
  fecha_caducidad: string
  cantidad_actual: number
}

interface Salida {
  id: number
  fecha: string
  tipo: string
  motivo: MotivoSalida
  cantidad: number
  observacion: string | null
  producto_nombre: string
  numero_lote: string
  fecha_caducidad: string
}

function validarSalida(datos: CrearSalida): CrearSalida {
  const motivos: MotivoSalida[] = [
    "danado",
    "caducado",
    "perdido",
    "devolucion",
    "ajuste",
    "otro"
  ]
  if (!datos || typeof datos !== "object")
    throw new Error("Datos de salida inválidos")
  if (!Number.isSafeInteger(datos.lote_id) || datos.lote_id <= 0)
    throw new Error("Selecciona un lote")
  if (!motivos.includes(datos.motivo))
    throw new Error("Selecciona un motivo válido")
  if (!Number.isSafeInteger(datos.cantidad) || datos.cantidad <= 0)
    throw new Error("La cantidad debe ser un entero mayor a cero")
  if (!datos.observacion?.trim())
    throw new Error("La observación es obligatoria")
  return { ...datos, observacion: datos.observacion.trim() }
}

export function registerSalidasIpc(): void {
  const db = getDatabase()

  ipcMain.handle(
    "salidas:lotes-disponibles",
    () =>
      db
        .prepare(
          `
      SELECT l.id, l.producto_id, p.nombre AS producto_nombre, l.numero_lote,
             l.fecha_caducidad, l.cantidad_actual
      FROM lotes l
      INNER JOIN productos p ON p.id = l.producto_id
      WHERE p.activo = 1 AND l.cantidad_actual > 0
      ORDER BY p.nombre ASC, l.fecha_caducidad ASC
    `
        )
        .all() as LoteDisponible[]
  )

  ipcMain.handle(
    "salidas:listar",
    () =>
      db
        .prepare(
          `
      SELECT m.id, m.fecha, m.tipo, m.cantidad, m.motivo AS observacion,
             CASE
               WHEN m.motivo LIKE 'Daño:%' THEN 'danado'
               WHEN m.motivo LIKE 'Caducidad:%' THEN 'caducado'
               WHEN m.motivo LIKE 'Pérdida:%' THEN 'perdido'
               WHEN m.motivo LIKE 'Otro:%' THEN 'otro'
               WHEN m.tipo = 'devolucion' THEN 'devolucion'
               ELSE 'ajuste'
             END AS motivo,
             p.nombre AS producto_nombre, l.numero_lote, l.fecha_caducidad
      FROM movimientos m
      INNER JOIN lotes l ON l.id = m.lote_id
      INNER JOIN productos p ON p.id = l.producto_id
      WHERE m.tipo IN ('merma', 'ajuste_salida', 'devolucion')
      ORDER BY m.fecha DESC, m.id DESC
    `
        )
        .all() as Salida[]
  )

  ipcMain.handle("salidas:crear", (_event, datos: CrearSalida) => {
    const salida = validarSalida(datos)
    const tipo =
      salida.motivo === "devolucion"
        ? "devolucion"
        : salida.motivo === "ajuste" || salida.motivo === "otro"
          ? "ajuste_salida"
          : "merma"
    const etiqueta = {
      danado: "Daño",
      caducado: "Caducidad",
      perdido: "Pérdida",
      devolucion: "Devolución",
      ajuste: "Ajuste",
      otro: "Otro"
    }[salida.motivo]

    const transaccion = db.transaction(() => {
      const lote = db
        .prepare(
          `
        SELECT l.cantidad_actual, l.costo_unitario_centavos
        FROM lotes l INNER JOIN productos p ON p.id = l.producto_id
        WHERE l.id = ? AND p.activo = 1
      `
        )
        .get(salida.lote_id) as
        { cantidad_actual: number; costo_unitario_centavos: number } | undefined

      if (!lote)
        throw new Error("El lote no existe o el medicamento está desactivado")
      if (salida.cantidad > lote.cantidad_actual)
        throw new Error(
          `Stock insuficiente. Solo hay ${lote.cantidad_actual} unidades disponibles`
        )

      db.prepare(
        "UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?"
      ).run(salida.cantidad, salida.lote_id)
      db.prepare(
        `INSERT INTO movimientos (lote_id, tipo, cantidad, costo_unitario_centavos, motivo) VALUES (?, ?, ?, ?, ?)`
      ).run(
        salida.lote_id,
        tipo,
        salida.cantidad,
        lote.costo_unitario_centavos,
        `${etiqueta}: ${salida.observacion}`
      )
    })

    transaccion()
    return { registrado: true }
  })
}
