import { contextBridge, ipcRenderer } from "electron"
import { electronAPI } from "@electron-toolkit/preload"
import type { CrearProducto, FarmaControlAPI } from "./global"

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
