import { ipcMain } from "electron"
import { getDatabase } from "../database/connection"
import { fechaActualMexicoISO } from "../../shared/fecha"

interface CrearEntrada {
  producto_id: number
  proveedor_id: number
  numero_lote: string
  fecha_llegada: string
  fecha_caducidad: string
  costo_unitario_centavos: number
  cantidad: number
}

interface Entrada {
  id: number
  lote_id: number
  movimiento_id: number
  fecha: string
  cantidad: number
  costo_unitario_centavos: number
  numero_lote: string
  fecha_llegada: string
  fecha_caducidad: string
  producto_id: number
  producto_nombre: string
  proveedor_id: number
  proveedor_nombre: string
  stock_lote_actual: number
  tiene_salidas: number
  cancelado: number
}

function validarEntrada(datos: CrearEntrada): CrearEntrada {
  if (!datos || typeof datos !== "object")
    throw new Error("Datos de entrada inválidos")
  if (!Number.isSafeInteger(datos.producto_id) || datos.producto_id <= 0)
    throw new Error("Selecciona un medicamento")
  if (!Number.isSafeInteger(datos.proveedor_id) || datos.proveedor_id <= 0)
    throw new Error("Selecciona un proveedor")
  if (!datos.numero_lote?.trim())
    throw new Error("El número de lote es obligatorio")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha_llegada))
    throw new Error("La fecha de llegada no es válida")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha_caducidad))
    throw new Error("La fecha de caducidad no es válida")
  if (!Number.isSafeInteger(datos.cantidad) || datos.cantidad <= 0)
    throw new Error("La cantidad debe ser un número entero mayor a cero")
  if (
    !Number.isSafeInteger(datos.costo_unitario_centavos) ||
    datos.costo_unitario_centavos < 0
  )
    throw new Error("El costo debe ser válido")

  return { ...datos, numero_lote: datos.numero_lote.trim() }
}

export function registerEntradasIpc(): void {
  const db = getDatabase()

  ipcMain.handle(
    "entradas:listar",
    () =>
      db
        .prepare(
          `
      SELECT m.id, m.id AS movimiento_id, l.id AS lote_id, m.fecha, m.cantidad, m.costo_unitario_centavos,
             l.numero_lote, l.fecha_llegada, l.fecha_caducidad,
             p.id AS producto_id, p.nombre AS producto_nombre,
             pr.id AS proveedor_id, pr.nombre AS proveedor_nombre,
             l.cantidad_actual AS stock_lote_actual,
             m.cancelado,
             CASE WHEN EXISTS (
               SELECT 1 FROM movimientos m2
               WHERE m2.lote_id = l.id AND m2.tipo <> 'entrada'
             ) THEN 1 ELSE 0 END AS tiene_salidas
      FROM movimientos m
      INNER JOIN lotes l ON l.id = m.lote_id
      INNER JOIN productos p ON p.id = l.producto_id
      LEFT JOIN proveedores pr ON pr.id = l.proveedor_id
      WHERE m.tipo = 'entrada'
      ORDER BY m.fecha DESC, m.id DESC
    `
        )
        .all() as Entrada[]
  )

  ipcMain.handle("entradas:crear", (_event, datos: CrearEntrada) => {
    const entrada = validarEntrada(datos)
    const fechaActual = fechaActualMexicoISO()

    if (entrada.fecha_caducidad < fechaActual) {
      throw new Error("No se puede registrar mercancía ya caducada")
    }

    const transaccion = db.transaction(() => {
      const producto = db
        .prepare("SELECT id FROM productos WHERE id = ? AND activo = 1")
        .get(entrada.producto_id)
      if (!producto)
        throw new Error("El medicamento no existe o está desactivado")

      const proveedor = db
        .prepare("SELECT id FROM proveedores WHERE id = ? AND activo = 1")
        .get(entrada.proveedor_id)
      if (!proveedor)
        throw new Error("El proveedor no existe o está desactivado")

      const lote = db
        .prepare(
          `
        INSERT INTO lotes (producto_id, proveedor_id, numero_lote, fecha_llegada, fecha_caducidad, costo_unitario_centavos, cantidad_actual)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          entrada.producto_id,
          entrada.proveedor_id,
          entrada.numero_lote,
          entrada.fecha_llegada,
          entrada.fecha_caducidad,
          entrada.costo_unitario_centavos,
          entrada.cantidad
        )

      db.prepare(
        `
        INSERT INTO movimientos (lote_id, tipo, cantidad, costo_unitario_centavos, motivo)
        VALUES (?, 'entrada', ?, ?, 'Entrada de mercancía')
      `
      ).run(
        lote.lastInsertRowid,
        entrada.cantidad,
        entrada.costo_unitario_centavos
      )

      return lote.lastInsertRowid
    })

    return transaccion()
  })

  ipcMain.handle(
    "entradas:actualizar",
    (_event, datos: CrearEntrada & { movimiento_id: number }) => {
      const entrada = validarEntrada(datos)
      if (
        !Number.isSafeInteger(datos.movimiento_id) ||
        datos.movimiento_id <= 0
      ) {
        throw new Error("Entrada inválida")
      }

      const transaccion = db.transaction(() => {
        const actual = db
          .prepare(
            `
        SELECT m.*, l.id AS lote_id, l.producto_id, l.cantidad_actual
        FROM movimientos m
        INNER JOIN lotes l ON l.id = m.lote_id
        WHERE m.id = ? AND m.tipo = 'entrada'
      `
          )
          .get(datos.movimiento_id) as
          | {
              lote_id: number
              producto_id: number
              cantidad: number
              cantidad_actual: number
              cancelado: number
            }
          | undefined

        if (!actual) throw new Error("La entrada no existe")
        if (actual.cancelado === 1)
          throw new Error("No se puede editar una entrada cancelada")

        const tieneSalidas = db
          .prepare(
            "SELECT COUNT(*) AS total FROM movimientos WHERE lote_id = ? AND tipo <> 'entrada'"
          )
          .get(actual.lote_id) as { total: number }
        if (tieneSalidas.total > 0)
          throw new Error(
            "No se puede editar: el lote ya tiene salidas registradas"
          )
        if (actual.producto_id !== entrada.producto_id)
          throw new Error("No se puede cambiar el medicamento de una entrada")

        const proveedor = db
          .prepare("SELECT id FROM proveedores WHERE id = ? AND activo = 1")
          .get(entrada.proveedor_id)
        if (!proveedor)
          throw new Error("El proveedor no existe o está desactivado")

        db.prepare(
          `UPDATE lotes SET proveedor_id = ?, numero_lote = ?, fecha_llegada = ?, fecha_caducidad = ?, costo_unitario_centavos = ?, cantidad_actual = ? WHERE id = ?`
        ).run(
          entrada.proveedor_id,
          entrada.numero_lote,
          entrada.fecha_llegada,
          entrada.fecha_caducidad,
          entrada.costo_unitario_centavos,
          entrada.cantidad,
          actual.lote_id
        )
        db.prepare(
          `UPDATE movimientos SET cantidad = ?, costo_unitario_centavos = ? WHERE id = ?`
        ).run(
          entrada.cantidad,
          entrada.costo_unitario_centavos,
          datos.movimiento_id
        )
      })

      transaccion()
      return { actualizado: true }
    }
  )

  ipcMain.handle("entradas:cancelar", (_event, movimientoId: number) => {
    if (!Number.isSafeInteger(movimientoId) || movimientoId <= 0)
      throw new Error("Entrada inválida")

    const transaccion = db.transaction(() => {
      const entrada = db
        .prepare(
          `
        SELECT m.*, l.id AS lote_id, l.cantidad_actual
        FROM movimientos m INNER JOIN lotes l ON l.id = m.lote_id
        WHERE m.id = ? AND m.tipo = 'entrada'
      `
        )
        .get(movimientoId) as
        | {
            lote_id: number
            cantidad: number
            costo_unitario_centavos: number
            cancelado: number
          }
        | undefined

      if (!entrada) throw new Error("La entrada no existe")
      if (entrada.cancelado === 1)
        throw new Error("La entrada ya está cancelada")

      const tieneSalidas = db
        .prepare(
          "SELECT COUNT(*) AS total FROM movimientos WHERE lote_id = ? AND tipo <> 'entrada'"
        )
        .get(entrada.lote_id) as { total: number }
      if (tieneSalidas.total > 0)
        throw new Error(
          "No se puede cancelar: el lote ya tiene salidas registradas"
        )

      db.prepare("UPDATE lotes SET cantidad_actual = 0 WHERE id = ?").run(
        entrada.lote_id
      )
      db.prepare("UPDATE movimientos SET cancelado = 1 WHERE id = ?").run(
        movimientoId
      )
      db.prepare(
        `INSERT INTO movimientos (lote_id, tipo, cantidad, costo_unitario_centavos, motivo) VALUES (?, 'ajuste_salida', ?, ?, 'Cancelación de entrada')`
      ).run(entrada.lote_id, entrada.cantidad, entrada.costo_unitario_centavos)
    })

    transaccion()
    return { cancelado: true }
  })
}
