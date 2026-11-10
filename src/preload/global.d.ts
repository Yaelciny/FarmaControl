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

export interface FarmaControlAPI {
  productos: {
    listar: () => Promise<Producto[]>
    crear: (producto: CrearProducto) => Promise<Producto>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: FarmaControlAPI
  }
}
