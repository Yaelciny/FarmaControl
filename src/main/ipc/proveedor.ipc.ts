import { ipcMain } from "electron"
import { getDatabase } from "../database/connection"

interface DatosProveedor {
  nombre: string
  contacto: string | null
  telefono: string | null
  correo: string | null
  rfc: string | null
  direccion: string | null
}

interface ActualizarProveedor extends DatosProveedor {
  id: number
}

interface Proveedor extends DatosProveedor {
  id: number
  activo: number
  fecha_creacion: string
}

function validarProveedor(datos: DatosProveedor): DatosProveedor {
  if (!datos || typeof datos !== "object") {
    throw new Error("Datos del proveedor inválidos")
  }

  const nombre = datos.nombre?.trim()
  if (!nombre) throw new Error("El nombre del proveedor es obligatorio")

  return {
    nombre,
    contacto: datos.contacto?.trim() || null,
    telefono: datos.telefono?.trim() || null,
    correo: datos.correo?.trim() || null,
    rfc: datos.rfc?.trim().toUpperCase() || null,
    direccion: datos.direccion?.trim() || null
  }
}

export function registerProveedoresIpc(): void {
  const db = getDatabase()

  ipcMain.handle(
    "proveedores:listar",
    () =>
      db
        .prepare("SELECT * FROM proveedores ORDER BY nombre ASC")
        .all() as Proveedor[]
  )

  ipcMain.handle("proveedores:crear", (_event, datos: DatosProveedor) => {
    const proveedor = validarProveedor(datos)
    const result = db
      .prepare(
        `
        INSERT INTO proveedores (nombre, contacto, telefono, correo, rfc, direccion)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        proveedor.nombre,
        proveedor.contacto,
        proveedor.telefono,
        proveedor.correo,
        proveedor.rfc,
        proveedor.direccion
      )

    return db
      .prepare("SELECT * FROM proveedores WHERE id = ?")
      .get(result.lastInsertRowid) as Proveedor
  })

  ipcMain.handle(
    "proveedores:actualizar",
    (_event, datos: ActualizarProveedor) => {
      if (!Number.isSafeInteger(datos?.id) || datos.id <= 0) {
        throw new Error("Proveedor inválido")
      }

      const proveedor = validarProveedor(datos)
      const result = db
        .prepare(
          `
        UPDATE proveedores
        SET nombre = ?, contacto = ?, telefono = ?, correo = ?, rfc = ?, direccion = ?
        WHERE id = ?
      `
        )
        .run(
          proveedor.nombre,
          proveedor.contacto,
          proveedor.telefono,
          proveedor.correo,
          proveedor.rfc,
          proveedor.direccion,
          datos.id
        )

      if (result.changes === 0) throw new Error("El proveedor no existe")
      return db
        .prepare("SELECT * FROM proveedores WHERE id = ?")
        .get(datos.id) as Proveedor
    }
  )

  ipcMain.handle(
    "proveedores:cambiar-estado",
    (_event, datos: { id: number; activo: boolean }) => {
      if (!Number.isSafeInteger(datos?.id) || datos.id <= 0)
        throw new Error("Proveedor inválido")
      const result = db
        .prepare("UPDATE proveedores SET activo = ? WHERE id = ?")
        .run(datos.activo ? 1 : 0, datos.id)
      if (result.changes === 0) throw new Error("El proveedor no existe")
      return { activo: datos.activo }
    }
  )

  ipcMain.handle("proveedores:eliminar", (_event, id: number) => {
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new Error("Proveedor inválido")
    const uso = db
      .prepare("SELECT COUNT(*) AS total FROM lotes WHERE proveedor_id = ?")
      .get(id) as { total: number }
    if (uso.total > 0)
      throw new Error(
        "No se puede eliminar: el proveedor ya tiene entradas registradas. Puedes cambiar su estado."
      )
    const result = db.prepare("DELETE FROM proveedores WHERE id = ?").run(id)
    if (result.changes === 0) throw new Error("El proveedor no existe")
    return { eliminado: true }
  })
}
