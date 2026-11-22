import { app, dialog, ipcMain } from "electron"
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "fs"
import { join } from "path"
import {
  closeDatabase,
  getDatabase,
  getDatabasePath
} from "../database/connection"

function marcaTiempo(): string {
  return new Date().toISOString().replace(/[:.]/g, "-")
}

export function registerRespaldoIpc(): void {
  ipcMain.handle("respaldo:crear", async () => {
    const resultado = await dialog.showSaveDialog({
      title: "Guardar respaldo de Farmacia Medina",
      defaultPath: `farmacia-medina-respaldo-${marcaTiempo()}.db`,
      filters: [{ name: "Base de datos SQLite", extensions: ["db"] }]
    })
    if (resultado.canceled || !resultado.filePath) {
      return { cancelado: true, ruta: null }
    }

    const db = getDatabase()
    db.pragma("wal_checkpoint(TRUNCATE)")
    copyFileSync(getDatabasePath(), resultado.filePath)
    return { cancelado: false, ruta: resultado.filePath }
  })

  ipcMain.handle("respaldo:restaurar", async () => {
    const resultado = await dialog.showOpenDialog({
      title: "Seleccionar respaldo de Farmacia Medina",
      properties: ["openFile"],
      filters: [{ name: "Base de datos SQLite", extensions: ["db", "sqlite"] }]
    })
    if (resultado.canceled || !resultado.filePaths[0]) {
      return { cancelado: true }
    }

    const rutaOrigen = resultado.filePaths[0]
    const contenido = readFileSync(rutaOrigen)
    if (contenido.subarray(0, 15).toString() !== "SQLite format 3") {
      throw new Error("El archivo seleccionado no es una base SQLite válida")
    }

    const rutaActual = getDatabasePath()
    const carpetaRespaldos = join(app.getPath("userData"), "data", "respaldos")
    mkdirSync(carpetaRespaldos, { recursive: true })
    const respaldoAutomatico = join(
      carpetaRespaldos,
      `antes-de-restaurar-${marcaTiempo()}.db`
    )

    const db = getDatabase()
    db.pragma("wal_checkpoint(TRUNCATE)")
    if (existsSync(rutaActual)) copyFileSync(rutaActual, respaldoAutomatico)
    closeDatabase()
    copyFileSync(rutaOrigen, rutaActual)

    setImmediate(() => {
      app.relaunch()
      app.exit(0)
    })
    return { cancelado: false, restaurado: true }
  })
}
