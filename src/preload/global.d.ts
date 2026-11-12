import type { ElectronAPI } from "@electron-toolkit/preload"

export interface Producto {
  id: number
  codigo_barras: string | null
  nombre: string
  categoria: string | null
  presentacion: string | null
  precio_venta_centavos: number
  stock_minimo: number
  activo: number
  stock_actual: number
  fecha_creacion: string
}

export interface CrearProducto {
  codigo_barras: string | null
  nombre: string
  categoria: string | null
  presentacion: string | null
  precio_venta_centavos: number
  stock_minimo: number
}

export interface Proveedor {
  id: number
  nombre: string
  contacto: string | null
  telefono: string | null
  correo: string | null
  rfc: string | null
  direccion: string | null
  activo: number
  fecha_creacion: string
}

export interface DatosProveedor {
  nombre: string
  contacto: string | null
  telefono: string | null
  correo: string | null
  rfc: string | null
  direccion: string | null
}

export interface Entrada {
  id: number
  fecha: string
  cantidad: number
  costo_unitario_centavos: number
  fecha_llegada: string
  numero_lote: string
  fecha_caducidad: string
  producto_id: number
  producto_nombre: string
  proveedor_id: number
  proveedor_nombre: string
  lote_id: number
  movimiento_id: number
  stock_lote_actual: number
  tiene_salidas: number
  cancelado: number
}

export interface CrearEntrada {
  producto_id: number
  proveedor_id: number
  numero_lote: string
  fecha_llegada: string
  fecha_caducidad: string
  costo_unitario_centavos: number
  cantidad: number
}

export interface LoteDisponible {
  id: number
  producto_id: number
  producto_nombre: string
  numero_lote: string
  fecha_caducidad: string
  cantidad_actual: number
}

export interface Salida {
  id: number
  fecha: string
  tipo: string
  motivo: string
  cantidad: number
  observacion: string | null
  producto_nombre: string
  numero_lote: string
  fecha_caducidad: string
}

export interface CrearSalida {
  lote_id: number
  motivo: "danado" | "caducado" | "perdido" | "devolucion" | "ajuste" | "otro"
  cantidad: number
  observacion: string | null
}

export interface ProductoVenta {
  id: number
  nombre: string
  codigo_barras: string | null
  presentacion: string | null
  precio_venta_centavos: number
  stock_actual: number
}

export interface ArticuloVenta {
  producto_id: number
  cantidad: number
}

export interface VentaResumen {
  id: number
  fecha: string
  total_centavos: number
  metodo_pago: string
  cambio_centavos: number
  estado: "completada" | "cancelada"
}

export interface VentaDetalle {
  id: number
  producto_nombre: string
  cantidad: number
  precio_unitario_centavos: number
  subtotal_centavos: number
  numero_lote: string | null
  cantidad_lote: number | null
}

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

export interface FarmaControlAPI {
  productos: {
    listar: () => Promise<Producto[]>
    crear: (producto: CrearProducto) => Promise<Producto>
    actualizar: (producto: CrearProducto & { id: number }) => Promise<Producto>
    cambiarEstado: (id: number, activo: boolean) => Promise<{ activo: boolean }>
    eliminar: (id: number) => Promise<{ eliminado: boolean }>
  }
  proveedores: {
    listar: () => Promise<Proveedor[]>
    crear: (proveedor: DatosProveedor) => Promise<Proveedor>
    actualizar: (
      proveedor: DatosProveedor & { id: number }
    ) => Promise<Proveedor>
    cambiarEstado: (id: number, activo: boolean) => Promise<{ activo: boolean }>
    eliminar: (id: number) => Promise<{ eliminado: boolean }>
  }
  entradas: {
    listar: () => Promise<Entrada[]>
    crear: (entrada: CrearEntrada) => Promise<number>
    actualizar: (
      entrada: CrearEntrada & { movimiento_id: number }
    ) => Promise<{ actualizado: boolean }>
    cancelar: (movimientoId: number) => Promise<{ cancelado: boolean }>
  }
  salidas: {
    listar: () => Promise<Salida[]>
    lotesDisponibles: () => Promise<LoteDisponible[]>
    crear: (salida: CrearSalida) => Promise<{ registrado: boolean }>
  }
  ventas: {
    productos: (busqueda: string) => Promise<ProductoVenta[]>
    crear: (venta: {
      articulos: ArticuloVenta[]
      metodo_pago: "efectivo" | "tarjeta" | "transferencia"
      monto_recibido_centavos: number
    }) => Promise<{
      id: number
      total_centavos: number
      cambio_centavos: number
    }>
    listar: () => Promise<VentaResumen[]>
    detalle: (ventaId: number) => Promise<VentaDetalle[]>
    cancelar: (ventaId: number) => Promise<{ cancelada: boolean }>
  }
  dashboard: {
    resumen: () => Promise<DashboardResumen>
    alertas: () => Promise<DashboardAlerta[]>
  }
  caja: {
    estado: () => Promise<CajaResumen>
    abrir: (fondoInicialCentavos: number) => Promise<{ id: number }>
    cerrar: (datos: {
      efectivo_contado_centavos: number
      observacion: string | null
    }) => Promise<{ id: number; diferencia_centavos: number }>
    historial: () => Promise<CajaCorte[]>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: FarmaControlAPI
  }
}
