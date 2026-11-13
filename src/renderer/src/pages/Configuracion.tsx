import { useState, type FormEvent } from "react"
import { KeyRound, LogOut } from "lucide-react"

interface ConfiguracionProps {
  onCerrarSesion: () => void
}

function Configuracion({
  onCerrarSesion
}: ConfiguracionProps): React.JSX.Element {
  const [actual, setActual] = useState("")
  const [nueva, setNueva] = useState("")
  const [confirmacion, setConfirmacion] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)

  async function cambiarPassword(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault()
    setError("")
    setMensaje("")
    if (nueva !== confirmacion) {
      setError("Las contraseñas nuevas no coinciden")
      return
    }
    try {
      setCargando(true)
      await window.api.auth.cambiar({ actual, nueva })
      setActual("")
      setNueva("")
      setConfirmacion("")
      setMensaje("Contraseña actualizada correctamente")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cambiar la contraseña"
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#168a8a]">Sistema</p>
        <h2 className="mt-1 text-3xl font-bold text-[#334952]">
          Configuración
        </h2>
        <p className="mt-2 max-w-2xl text-gray-500">
          Administra el acceso local de Farmacia Medina.
        </p>
      </div>
      <section className="max-w-2xl rounded-2xl border border-[#dce4e7] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e4f1f1] text-[#168a8a]">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#334952]">
              Cambiar contraseña
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Actualiza la contraseña del usuario Administrador.
            </p>
          </div>
        </div>
        <form
          onSubmit={(event) => void cambiarPassword(event)}
          className="mt-6 space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Contraseña actual <b className="text-[#d35d68]">*</b>
            </span>
            <input
              required
              minLength={6}
              type="password"
              value={actual}
              onChange={(event) => setActual(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d1dcdf] p-2.5 outline-none focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Nueva contraseña <b className="text-[#d35d68]">*</b>
            </span>
            <input
              required
              minLength={6}
              type="password"
              value={nueva}
              onChange={(event) => setNueva(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d1dcdf] p-2.5 outline-none focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Confirmar nueva contraseña <b className="text-[#d35d68]">*</b>
            </span>
            <input
              required
              minLength={6}
              type="password"
              value={confirmacion}
              onChange={(event) => setConfirmacion(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d1dcdf] p-2.5 outline-none focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
            />
          </label>
          {error && (
            <p className="rounded-xl bg-[#fff5f5] p-3 text-sm text-red-600">
              {error}
            </p>
          )}
          {mensaje && (
            <p className="rounded-xl bg-[#e5f7ef] p-3 text-sm text-[#29835f]">
              {mensaje}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={cargando}
              className="rounded-xl bg-[#18a7a7] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#168f8f] disabled:opacity-50"
            >
              {cargando ? "Guardando..." : "Guardar contraseña"}
            </button>
          </div>
        </form>
      </section>
      <section className="max-w-2xl rounded-2xl border border-[#f0d9dc] bg-[#fff9f9] p-6">
        <h3 className="font-bold text-[#334952]">Sesión</h3>
        <p className="mt-1 text-sm text-slate-500">
          Cierra el acceso actual cuando termines de usar el sistema.
        </p>
        <button
          type="button"
          onClick={onCerrarSesion}
          className="mt-4 flex items-center gap-2 rounded-xl border border-[#d9aeb5] px-4 py-2.5 text-sm font-medium text-[#b06b76] hover:bg-[#fff0f0]"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </section>
    </div>
  )
}

export default Configuracion
