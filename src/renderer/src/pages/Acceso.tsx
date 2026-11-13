import { useState, type FormEvent } from "react"
import { Eye, EyeOff, LockKeyhole, LogIn } from "lucide-react"

interface AccesoProps {
  modo: "configurar" | "iniciar"
  onSuccess: () => void
}

function Acceso({ modo, onSuccess }: AccesoProps): React.JSX.Element {
  const [password, setPassword] = useState("")
  const [confirmacion, setConfirmacion] = useState("")
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const configurando = modo === "configurar"

  async function enviar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError("")
    if (configurando && password !== confirmacion) {
      setError("Las contraseñas no coinciden")
      return
    }

    try {
      setCargando(true)
      if (configurando) {
        await window.api.auth.configurar(password)
      } else {
        await window.api.auth.iniciar(password)
      }
      onSuccess()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo validar la contraseña"
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f4f5] p-4">
      <section className="w-full max-w-md rounded-3xl border border-[#dce4e7] bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e4f5ef] text-[#168a8a]">
            <LockKeyhole className="h-8 w-8" />
          </div>
          <p className="mt-5 text-sm font-semibold text-[#168a8a]">
            Farmacia Medina
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#334952]">
            {configurando ? "Configura tu acceso" : "Bienvenido a FarmaControl"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {configurando
              ? "Crea la contraseña del administrador para proteger el sistema."
              : "Ingresa la contraseña del administrador para continuar."}
          </p>
        </div>

        <form
          onSubmit={(event) => void enviar(event)}
          className="mt-8 space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-gray-700">Usuario</label>
            <div className="mt-1 rounded-xl border border-[#d1dcdf] bg-[#f7f9f9] p-3 text-sm text-slate-500">
              Administrador
            </div>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {configurando ? "Contraseña nueva" : "Contraseña"}{" "}
              <b className="text-[#d35d68]">*</b>
            </span>
            <div className="mt-1 flex items-center rounded-xl border border-[#d1dcdf] px-3 focus-within:border-[#18a7a7] focus-within:ring-2 focus-within:ring-[#d9eeee]">
              <input
                required
                minLength={6}
                type={mostrarPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="min-w-0 flex-1 p-2.5 outline-none"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((mostrar) => !mostrar)}
                aria-label={
                  mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="p-2 text-slate-400 hover:text-[#168a8a]"
              >
                {mostrarPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </label>
          {configurando && (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Confirmar contraseña <b className="text-[#d35d68]">*</b>
              </span>
              <input
                required
                minLength={6}
                type={mostrarPassword ? "text" : "password"}
                value={confirmacion}
                onChange={(event) => setConfirmacion(event.target.value)}
                placeholder="Repite la contraseña"
                className="mt-1 w-full rounded-xl border border-[#d1dcdf] p-2.5 outline-none focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
              />
            </label>
          )}
          {error && (
            <p className="rounded-xl bg-[#fff5f5] p-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={cargando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#18a7a7] px-5 py-3 text-sm font-semibold text-white hover:bg-[#168f8f] disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {cargando
              ? "Validando..."
              : configurando
                ? "Guardar contraseña"
                : "Iniciar sesión"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          La contraseña se almacena de forma protegida en este equipo.
        </p>
      </section>
    </main>
  )
}

export default Acceso
