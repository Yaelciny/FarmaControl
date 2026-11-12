import { contextBridge, ipcRenderer } from "electron"
import { electronAPI } from "@electron-toolkit/preload"
import type {
  CrearEntrada,
  CrearProducto,
  CrearSalida,
  DatosProveedor,
  FarmaControlAPI
} from "./global"

// Funcion disponible para React
const api: FarmaControlAPI = {
  productos: {
    listar: () => ipcRenderer.invoke("productos:listar"),
    crear: (producto: CrearProducto) =>
      ipcRenderer.invoke("productos:crear", producto),
    actualizar: (producto: CrearProducto & { id: number }) =>
      ipcRenderer.invoke("productos:actualizar", producto),
    cambiarEstado: (id: number, activo: boolean) =>
      ipcRenderer.invoke("productos:cambiar-estado", { id, activo }),
    eliminar: (id: number) => ipcRenderer.invoke("productos:eliminar", id)
  },
  proveedores: {
    listar: () => ipcRenderer.invoke("proveedores:listar"),
    crear: (proveedor: DatosProveedor) =>
      ipcRenderer.invoke("proveedores:crear", proveedor),
    actualizar: (proveedor: DatosProveedor & { id: number }) =>
      ipcRenderer.invoke("proveedores:actualizar", proveedor),
    cambiarEstado: (id: number, activo: boolean) =>
      ipcRenderer.invoke("proveedores:cambiar-estado", { id, activo }),
    eliminar: (id: number) => ipcRenderer.invoke("proveedores:eliminar", id)
  },
  entradas: {
    listar: () => ipcRenderer.invoke("entradas:listar"),
    crear: (entrada: CrearEntrada) =>
      ipcRenderer.invoke("entradas:crear", entrada),
    actualizar: (entrada: CrearEntrada & { movimiento_id: number }) =>
      ipcRenderer.invoke("entradas:actualizar", entrada),
    cancelar: (movimientoId: number) =>
      ipcRenderer.invoke("entradas:cancelar", movimientoId)
  },
  salidas: {
    listar: () => ipcRenderer.invoke("salidas:listar"),
    lotesDisponibles: () => ipcRenderer.invoke("salidas:lotes-disponibles"),
    crear: (salida: CrearSalida) => ipcRenderer.invoke("salidas:crear", salida)
  },
  ventas: {
    productos: (busqueda: string) =>
      ipcRenderer.invoke("ventas:productos", busqueda),
    crear: (venta: {
      articulos: { producto_id: number; cantidad: number }[]
      metodo_pago: "efectivo" | "tarjeta" | "transferencia"
      monto_recibido_centavos: number
    }) => ipcRenderer.invoke("ventas:crear", venta),
    listar: () => ipcRenderer.invoke("ventas:listar"),
    detalle: (ventaId: number) => ipcRenderer.invoke("ventas:detalle", ventaId),
    cancelar: (ventaId: number) =>
      ipcRenderer.invoke("ventas:cancelar", ventaId)
  },
  dashboard: {
    resumen: () => ipcRenderer.invoke("dashboard:resumen"),
    alertas: () => ipcRenderer.invoke("dashboard:alertas")
  },
  caja: {
    estado: () => ipcRenderer.invoke("caja:estado"),
    abrir: (fondoInicialCentavos: number) =>
      ipcRenderer.invoke("caja:abrir", fondoInicialCentavos),
    cerrar: (datos: {
      efectivo_contado_centavos: number
      observacion: string | null
    }) => ipcRenderer.invoke("caja:cerrar", datos),
    historial: () => ipcRenderer.invoke("caja:historial")
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI)
    contextBridge.exposeInMainWorld("api", api)
  } catch (error) {
    console.error(error)
  }
} else {
  // Compatible con la configuración original
  // de Electron Toolkit
  window.electron = electronAPI
  window.api = api
}
