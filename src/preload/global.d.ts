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
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: FarmaControlAPI
  }
}
