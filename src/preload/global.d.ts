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
    actualizar: (proveedor: DatosProveedor & { id: number }) => Promise<Proveedor>
    cambiarEstado: (id: number, activo: boolean) => Promise<{ activo: boolean }>
    eliminar: (id: number) => Promise<{ eliminado: boolean }>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: FarmaControlAPI
  }
}
