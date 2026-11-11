import { useEffect, useState, type FormEvent } from "react"
import { PackageMinus, Plus, Search, X } from "lucide-react"
import type {
  CrearSalida,
  LoteDisponible,
  Salida
} from "../../../preload/global"

const formularioInicial = {
  lote_id: "",
  motivo: "",
  cantidad: "",
  observacion: ""
}
const motivos = [
  { valor: "danado", nombre: "Producto dañado" },
  { valor: "caducado", nombre: "Producto caducado" },
  { valor: "perdido", nombre: "Producto perdido" },
  { valor: "devolucion", nombre: "Devolución a proveedor" },
  { valor: "ajuste", nombre: "Ajuste manual" },
  { valor: "otro", nombre: "Otro" }
] as const

function Salidas(): React.JSX.Element {
  const [salidas, setSalidas] = useState<Salida[]>([])
  const [lotes, setLotes] = useState<LoteDisponible[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [formulario, setFormulario] = useState(formularioInicial)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")

  async function cargarDatos(): Promise<void> {
    const [salidasCargadas, lotesCargados] = await Promise.all([
      window.api.salidas.listar(),
      window.api.salidas.lotesDisponibles()
    ])
    setSalidas(salidasCargadas)
    setLotes(lotesCargados)
  }

  useEffect(() => {
    let activo = true
    Promise.all([
      window.api.salidas.listar(),
      window.api.salidas.lotesDisponibles()
    ])
      .then(([salidasCargadas, lotesCargados]) => {
        if (!activo) return
        setSalidas(salidasCargadas)
        setLotes(lotesCargados)
      })
      .catch((err: unknown) => {
        if (activo)
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar las salidas"
          )
      })
    return () => {
      activo = false
    }
  }, [])

  function cerrarModal(): void {
    setModalAbierto(false)
    setFormulario(formularioInicial)
    setError("")
  }

  async function guardarSalida(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault()
    setError("")
    const cantidad = Number(formulario.cantidad)
    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
      setError("Ingresa una cantidad entera mayor a cero")
      return
    }

    const datos: CrearSalida = {
      lote_id: Number(formulario.lote_id),
      motivo: formulario.motivo as CrearSalida["motivo"],
      cantidad,
      observacion: formulario.observacion.trim()
    }

    try {
      setCargando(true)
      await window.api.salidas.crear(datos)
      cerrarModal()
      await cargarDatos()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo registrar la salida"
      )
    } finally {
      setCargando(false)
    }
  }

  const filtradas = salidas.filter((salida) =>
    `${salida.producto_nombre} ${salida.numero_lote} ${salida.observacion ?? ""}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  )
  const nombreMotivo = (valor: string): string =>
    motivos.find((motivo) => motivo.valor === valor)?.nombre ?? "Ajuste"

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#168a8a]">Operación</p>
        <h2 className="mt-1 text-3xl font-bold text-[#334952]">
          Bajas y ajustes de inventario
        </h2>
        <p className="mt-2 max-w-2xl text-gray-500">
            Registra bajas por daño, caducidad, pérdida o devolución, además de
            ajustes manuales, sin permitir existencias negativas.
        </p>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2d33]/55 p-4 backdrop-blur-[2px]">
          <form
            onSubmit={(event) => void guardarSalida(event)}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-start justify-between border-b border-[#e1e7e8] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#168a8a]">
                  Control de inventario
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-[#334952]">
                  Registrar salida o ajuste
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  La cantidad se descontará del lote seleccionado.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarModal}
                aria-label="Cerrar ventana"
                className="rounded-xl p-2 text-slate-400 hover:bg-[#f1f4f5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">
                  Medicamento y lote <b className="text-[#d35d68]">*</b>
                </span>
                <select
                  required
                  value={formulario.lote_id}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      lote_id: event.target.value
                    })
                  }
                  className="w-full rounded-lg border border-[#d1dcdf] bg-white p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
                >
                  <option value="">Selecciona un medicamento y lote</option>
                  {lotes.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.producto_nombre} — Lote {lote.numero_lote} —{" "}
                      {lote.cantidad_actual} disponibles
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">
                  Motivo <b className="text-[#d35d68]">*</b>
                </span>
                <select
                  required
                  value={formulario.motivo}
                  onChange={(event) =>
                    setFormulario({ ...formulario, motivo: event.target.value })
                  }
                  className="w-full rounded-lg border border-[#d1dcdf] bg-white p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
                >
                  <option value="">Selecciona un motivo</option>
                  {motivos.map((motivo) => (
                    <option key={motivo.valor} value={motivo.valor}>
                      {motivo.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">
                  Cantidad <b className="text-[#d35d68]">*</b>
                </span>
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ej. 2"
                  value={formulario.cantidad}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      cantidad: event.target.value
                    })
                  }
                  className="w-full rounded-lg border border-[#d1dcdf] p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">
                  Observación <b className="text-[#d35d68]">*</b>
                </span>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej. Caja dañada durante la recepción"
                  value={formulario.observacion}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      observacion: event.target.value
                    })
                  }
                  className="w-full resize-none rounded-lg border border-[#d1dcdf] p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
                />
              </label>
            </div>
            {error && (
              <p className="mt-4 rounded-lg bg-[#fff5f5] p-3 text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3 border-t border-[#e1e7e8] pt-4">
              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-xl border border-[#c5d4d7] px-5 py-2.5 text-sm font-medium text-[#527070] hover:bg-[#f7fbfb]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="flex items-center gap-2 rounded-xl bg-[#18a7a7] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#168f8f] disabled:opacity-50"
              >
                <PackageMinus className="h-4 w-4" />
                {cargando ? "Guardando..." : "Registrar salida"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-[280px] flex-1 items-center gap-3 rounded-xl border border-[#d1dcdf] px-4 py-2.5 text-sm text-slate-400 focus-within:border-[#18a7a7]">
            <Search className="h-5 w-5" />
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por medicamento, lote u observación..."
              className="min-w-0 flex-1 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setError("")
              setFormulario(formularioInicial)
              setModalAbierto(true)
            }}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#18a7a7] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#168f8f]"
          >
            <Plus className="h-4 w-4" /> Registrar salida
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
        <div className="mb-4 flex justify-end">
          <span className="text-xs text-slate-500">
            {filtradas.length} movimientos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[950px] w-full text-left text-sm">
            <thead className="bg-[#f5f7f7] text-[11px] uppercase tracking-wide text-[#6b7d83]">
              <tr>
                <th className="px-4 py-3 font-semibold">Medicamento</th>
                <th className="px-4 py-3 font-semibold">Lote</th>
                <th className="px-4 py-3 font-semibold">Motivo</th>
                <th className="px-4 py-3 font-semibold">Cantidad</th>
                <th className="px-4 py-3 font-semibold">Observación</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f1]">
              {filtradas.map((salida) => (
                <tr key={salida.id} className="hover:bg-[#fbfdfd]">
                  <td className="px-4 py-4 font-semibold text-[#334952]">
                    {salida.producto_nombre}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-500">
                    {salida.numero_lote}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-[#fff7e6] px-2.5 py-1 text-xs font-semibold text-[#b18435]">
                      {nombreMotivo(salida.motivo)}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-[#b06b76]">
                    -{salida.cantidad}
                  </td>
                  <td className="max-w-xs truncate px-4 py-4 text-slate-600">
                    {salida.observacion}
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    {salida.fecha.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtradas.length === 0 && (
            <p className="py-8 text-center text-gray-500">
              No se encontraron bajas o ajustes.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Salidas
