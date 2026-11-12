import { ipcMain } from "electron"
import { getDatabase } from "../database/connection"

interface ProductoVenta {
  id: number
  nombre: string
  codigo_barras: string | null
  presentacion: string | null
  precio_venta_centavos: number
  stock_actual: number
}

interface ArticuloVenta {
  producto_id: number
  cantidad: number
}

interface CrearVenta {
  articulos: ArticuloVenta[]
  metodo_pago: "efectivo" | "tarjeta" | "transferencia"
  monto_recibido_centavos: number
}

interface VentaResumen {
  id: number
  fecha: string
  total_centavos: number
  metodo_pago: string
  cambio_centavos: number
  estado: "completada" | "cancelada"
}

interface VentaDetalle {
  id: number
  producto_nombre: string
  cantidad: number
  precio_unitario_centavos: number
  subtotal_centavos: number
  numero_lote: string | null
  cantidad_lote: number | null
}

function validarVenta(datos: CrearVenta): CrearVenta {
  if (
    !datos ||
    typeof datos !== "object" ||
    !Array.isArray(datos.articulos) ||
    datos.articulos.length === 0
  ) {
    throw new Error("El carrito está vacío")
  }
  if (!["efectivo", "tarjeta", "transferencia"].includes(datos.metodo_pago)) {
    throw new Error("Selecciona un método de pago válido")
  }
  if (
    !Number.isSafeInteger(datos.monto_recibido_centavos) ||
    datos.monto_recibido_centavos < 0
  ) {
    throw new Error("El monto recibido no es válido")
  }

  const articulos = datos.articulos.map((articulo) => {
    if (
      !Number.isSafeInteger(articulo.producto_id) ||
      articulo.producto_id <= 0
    )
      throw new Error("Producto inválido")
    if (!Number.isSafeInteger(articulo.cantidad) || articulo.cantidad <= 0)
      throw new Error("La cantidad debe ser mayor a cero")
    return articulo
  })

  return { ...datos, articulos }
}

export function registerVentasIpc(): void {
  const db = getDatabase()

  ipcMain.handle(
    "ventas:listar",
    () =>
      db
        .prepare(
          "SELECT id, fecha, total_centavos, metodo_pago, cambio_centavos, estado FROM ventas ORDER BY fecha DESC, id DESC"
        )
        .all() as VentaResumen[]
  )

  ipcMain.handle("ventas:detalle", (_event, ventaId: number) => {
    if (!Number.isSafeInteger(ventaId) || ventaId <= 0)
      throw new Error("Venta inválida")
    return db
      .prepare(
        `
        SELECT dv.id, p.nombre AS producto_nombre, dv.cantidad,
               dv.precio_unitario_centavos, dv.subtotal_centavos,
               l.numero_lote, dvl.cantidad AS cantidad_lote
        FROM detalle_ventas dv
        INNER JOIN productos p ON p.id = dv.producto_id
        LEFT JOIN detalle_venta_lotes dvl ON dvl.detalle_venta_id = dv.id
        LEFT JOIN lotes l ON l.id = dvl.lote_id
        WHERE dv.venta_id = ?
        ORDER BY dv.id ASC
      `
      )
      .all(ventaId) as VentaDetalle[]
  })

  ipcMain.handle("ventas:productos", (_event, busqueda: string) => {
    const termino = typeof busqueda === "string" ? busqueda.trim() : ""
    return db
      .prepare(
        `
      SELECT p.id, p.nombre, p.codigo_barras, p.presentacion, p.precio_venta_centavos,
             COALESCE(SUM(CASE WHEN l.fecha_caducidad >= date('now') THEN l.cantidad_actual ELSE 0 END), 0) AS stock_actual
      FROM productos p
      LEFT JOIN lotes l ON l.producto_id = p.id
      WHERE p.activo = 1
        AND (p.nombre LIKE ? OR COALESCE(p.codigo_barras, '') LIKE ? OR COALESCE(p.categoria, '') LIKE ?)
      GROUP BY p.id
      HAVING stock_actual > 0
      ORDER BY p.nombre ASC
      LIMIT 30
    `
      )
      .all(`%${termino}%`, `%${termino}%`, `%${termino}%`) as ProductoVenta[]
  })

  ipcMain.handle("ventas:crear", (_event, datos: CrearVenta) => {
    const venta = validarVenta(datos)

    const transaccion = db.transaction(() => {
      const ids = venta.articulos.map((articulo) => articulo.producto_id)
      const cantidades = new Map<number, number>()
      for (const articulo of venta.articulos)
        cantidades.set(
          articulo.producto_id,
          (cantidades.get(articulo.producto_id) ?? 0) + articulo.cantidad
        )

      const productos = ids.map(
        (id) =>
          db
            .prepare(
              "SELECT id, precio_venta_centavos FROM productos WHERE id = ? AND activo = 1"
            )
            .get(id) as
            { id: number; precio_venta_centavos: number } | undefined
      )
      if (productos.some((producto) => !producto))
        throw new Error("Uno de los medicamentos ya no está disponible")

      let totalCentavos = 0
      for (const producto of productos)
        totalCentavos +=
          producto!.precio_venta_centavos * cantidades.get(producto!.id)!
      if (
        venta.metodo_pago === "efectivo" &&
        venta.monto_recibido_centavos < totalCentavos
      )
        throw new Error("El monto recibido es menor al total")

      const cambioCentavos =
        venta.metodo_pago === "efectivo"
          ? venta.monto_recibido_centavos - totalCentavos
          : 0
      const ventaCreada = db
        .prepare(
          `INSERT INTO ventas (subtotal_centavos, total_centavos, metodo_pago, monto_recibido_centavos, cambio_centavos) VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          totalCentavos,
          totalCentavos,
          venta.metodo_pago,
          venta.monto_recibido_centavos,
          cambioCentavos
        )

      for (const producto of productos) {
        const productoId = producto!.id
        const cantidad = cantidades.get(productoId)!
        const subtotal = producto!.precio_venta_centavos * cantidad
        const detalle = db
          .prepare(
            `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario_centavos, subtotal_centavos) VALUES (?, ?, ?, ?, ?)`
          )
          .run(
            ventaCreada.lastInsertRowid,
            productoId,
            cantidad,
            producto!.precio_venta_centavos,
            subtotal
          )
        let pendiente = cantidad
        const lotes = db
          .prepare(
            `SELECT id, cantidad_actual, costo_unitario_centavos FROM lotes WHERE producto_id = ? AND cantidad_actual > 0 AND fecha_caducidad >= date('now') ORDER BY fecha_caducidad ASC, id ASC`
          )
          .all(productoId) as Array<{
          id: number
          cantidad_actual: number
          costo_unitario_centavos: number
        }>
        if (
          lotes.reduce((total, lote) => total + lote.cantidad_actual, 0) <
          cantidad
        )
          throw new Error("Stock insuficiente para completar la venta")
        for (const lote of lotes) {
          if (pendiente === 0) break
          const descontar = Math.min(pendiente, lote.cantidad_actual)
          db.prepare(
            "UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?"
          ).run(descontar, lote.id)
          db.prepare(
            `INSERT INTO detalle_venta_lotes (detalle_venta_id, lote_id, cantidad, costo_unitario_centavos) VALUES (?, ?, ?, ?)`
          ).run(
            detalle.lastInsertRowid,
            lote.id,
            descontar,
            lote.costo_unitario_centavos
          )
          db.prepare(
            `INSERT INTO movimientos (lote_id, venta_id, tipo, cantidad, costo_unitario_centavos, motivo) VALUES (?, ?, 'venta', ?, ?, 'Venta')`
          ).run(
            lote.id,
            ventaCreada.lastInsertRowid,
            descontar,
            lote.costo_unitario_centavos
          )
          pendiente -= descontar
        }
      }

      return {
        id: Number(ventaCreada.lastInsertRowid),
        total_centavos: totalCentavos,
        cambio_centavos: cambioCentavos
      }
    })

    return transaccion()
  })

  ipcMain.handle("ventas:cancelar", (_event, ventaId: number) => {
    if (!Number.isSafeInteger(ventaId) || ventaId <= 0)
      throw new Error("Venta inválida")

    const transaccion = db.transaction(() => {
      const venta = db
        .prepare("SELECT estado FROM ventas WHERE id = ?")
        .get(ventaId) as { estado: string } | undefined
      if (!venta) throw new Error("La venta no existe")
      if (venta.estado === "cancelada")
        throw new Error("La venta ya está cancelada")

      const movimientos = db
        .prepare(
          "SELECT lote_id, cantidad, costo_unitario_centavos FROM movimientos WHERE venta_id = ? AND tipo = 'venta'"
        )
        .all(ventaId) as Array<{
        lote_id: number
        cantidad: number
        costo_unitario_centavos: number
      }>

      for (const movimiento of movimientos) {
        db.prepare(
          "UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?"
        ).run(movimiento.cantidad, movimiento.lote_id)
        db.prepare(
          "INSERT INTO movimientos (lote_id, venta_id, tipo, cantidad, costo_unitario_centavos, motivo) VALUES (?, ?, 'devolucion', ?, ?, 'Reversión por cancelación de venta')"
        ).run(
          movimiento.lote_id,
          ventaId,
          movimiento.cantidad,
          movimiento.costo_unitario_centavos
        )
      }

      db.prepare("UPDATE ventas SET estado = 'cancelada' WHERE id = ?").run(
        ventaId
      )
    })

    transaccion()
    return { cancelada: true }
  })
}
