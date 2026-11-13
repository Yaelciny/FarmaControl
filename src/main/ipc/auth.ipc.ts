import { ipcMain } from "electron"
import { randomBytes, scryptSync, timingSafeEqual } from "crypto"
import { getDatabase } from "../database/connection"

const LONGITUD_MINIMA = 6

function validarPassword(password: unknown): asserts password is string {
  if (typeof password !== "string" || password.length < LONGITUD_MINIMA) {
    throw new Error(
      `La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres`
    )
  }
}

function crearHash(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return { hash, salt }
}

function passwordCorrecta(
  password: string,
  hash: string,
  salt: string
): boolean {
  const esperado = Buffer.from(hash, "hex")
  const recibido = scryptSync(password, salt, 64)
  return (
    esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
  )
}

export function registerAuthIpc(): void {
  const db = getDatabase()
  db.prepare("INSERT OR IGNORE INTO usuarios (id) VALUES (1)").run()

  ipcMain.handle("auth:estado", () => {
    const usuario = db
      .prepare("SELECT password_hash FROM usuarios WHERE id = 1")
      .get() as { password_hash: string | null } | undefined
    return { configurada: Boolean(usuario?.password_hash) }
  })

  ipcMain.handle("auth:configurar", (_event, password: string) => {
    validarPassword(password)
    const usuario = db
      .prepare("SELECT password_hash FROM usuarios WHERE id = 1")
      .get() as { password_hash: string | null }
    if (usuario.password_hash)
      throw new Error("La contraseña inicial ya fue configurada")

    const credenciales = crearHash(password)
    db.prepare(
      "UPDATE usuarios SET password_hash = ?, password_salt = ? WHERE id = 1"
    ).run(credenciales.hash, credenciales.salt)
    return { configurada: true }
  })

  ipcMain.handle("auth:iniciar", (_event, password: string) => {
    validarPassword(password)
    const usuario = db
      .prepare("SELECT password_hash, password_salt FROM usuarios WHERE id = 1")
      .get() as
      { password_hash: string | null; password_salt: string | null } | undefined
    if (!usuario?.password_hash || !usuario.password_salt) {
      throw new Error("Primero configura la contraseña inicial")
    }
    if (
      !passwordCorrecta(password, usuario.password_hash, usuario.password_salt)
    ) {
      throw new Error("La contraseña es incorrecta")
    }
    return { autenticado: true }
  })

  ipcMain.handle(
    "auth:cambiar",
    (_event, datos: { actual: string; nueva: string }) => {
      validarPassword(datos?.actual)
      validarPassword(datos?.nueva)
      const usuario = db
        .prepare(
          "SELECT password_hash, password_salt FROM usuarios WHERE id = 1"
        )
        .get() as { password_hash: string | null; password_salt: string | null }
      if (
        !usuario.password_hash ||
        !usuario.password_salt ||
        !passwordCorrecta(
          datos.actual,
          usuario.password_hash,
          usuario.password_salt
        )
      ) {
        throw new Error("La contraseña actual es incorrecta")
      }
      const credenciales = crearHash(datos.nueva)
      db.prepare(
        "UPDATE usuarios SET password_hash = ?, password_salt = ? WHERE id = 1"
      ).run(credenciales.hash, credenciales.salt)
      return { cambiada: true }
    }
  )
}
