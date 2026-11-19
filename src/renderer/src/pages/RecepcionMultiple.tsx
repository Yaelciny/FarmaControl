import { useState, type FormEvent } from "react"
import { CalendarDays, PackagePlus, Plus, Trash2, X } from "lucide-react"
import type { Producto, Proveedor } from "../../../preload/global"
import { fechaActualMexicoISO } from "../../../shared/fecha"

interface LineaRecepcion {
  producto_id: string
  referencia: string
  fecha_caducidad: string
  costo_unitario: string
  cantidad: string
}

interface RecepcionMultipleProps {
  productos: Producto[]
  proveedores: Proveedor[]
  productoInicial?: number | null
  onClose: () => void
  onSaved: () => Promise<void>
}

const nuevaLinea = (productoId: number | null = null): LineaRecepcion => ({
  producto_id: productoId ? String(productoId) : "",
  referencia: "",
  fecha_caducidad: "",
  costo_unitario: "",
  cantidad: ""
})

function RecepcionMultiple({
  productos,
  proveedores,
  productoInicial = null,
  onClose,
  onSaved
}: RecepcionMultipleProps): React.JSX.Element {
  const [proveedorId, setProveedorId] = useState("")
  const [fechaLlegada, setFechaLlegada] = useState(fechaActualMexicoISO())
  const [lineas, setLineas] = useState<LineaRecepcion[]>([
    nuevaLinea(productoInicial)
  ])
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const hoy = fechaActualMexicoISO()

  function actualizarLinea(
    indice: number,
    campo: keyof LineaRecepcion,
    valor: string
  ): void {
    setLineas((actuales) =>
      actuales.map((linea, posicion) =>
        posicion === indice ? { ...linea, [campo]: valor } : linea
      )
    )
  }

  async function guardar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError("")
    if (!proveedorId) {
      setError("Selecciona un proveedor")
      return
    }
    try {
      setCargando(true)
      await window.api.entradas.crearMultiple({
        proveedor_id: Number(proveedorId),
        fecha_llegada: fechaLlegada,
        lineas: lineas.map((linea) => ({
          producto_id: Number(linea.producto_id),
          numero_lote: linea.referencia.trim(),
          fecha_caducidad: linea.fecha_caducidad,
          costo_unitario_centavos: Math.round(
            Number(linea.costo_unitario) * 100
          ),
          cantidad: Number(linea.cantidad)
        }))
      })
      await onSaved()
      onClose()
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudo registrar la recepción"
      setError(
        mensaje.includes("UNIQUE")
          ? "Una referencia ya está registrada para uno de los medicamentos"
          : mensaje
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2d33]/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <form
        onSubmit={(event) => void guardar(event)}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between border-b border-[#e1e7e8] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#168a8a]">
              Recepción de mercancía
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-[#334952]">
              Registrar entrada
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Agrega varios medicamentos recibidos en la misma entrega.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="rounded-xl p-2 text-slate-400 hover:bg-[#f1f4f5]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">
              Proveedor <b className="text-[#d35d68]">*</b>
            </span>
            <select
              required
              value={proveedorId}
              onChange={(event) => setProveedorId(event.target.value)}
              className="w-full rounded-lg border border-[#d1dcdf] bg-white p-2.5 outline-[#18a7a7]"
            >
              <option value="">Selecciona un proveedor</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">
              Fecha de llegada <b className="text-[#d35d68]">*</b>
            </span>
            <div className="relative">
              <input
                required
                type="date"
                max={hoy}
                value={fechaLlegada}
                onChange={(event) => setFechaLlegada(event.target.value)}
                className="w-full rounded-lg border border-[#d1dcdf] p-2.5 outline-[#18a7a7]"
              />
              <CalendarDays className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </label>
        </div>

        <div className="mt-6 space-y-4">
          {lineas.map((linea, indice) => (
            <div
              key={indice}
              className="rounded-2xl border border-[#dce9e6] bg-[#f7fbfa] p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="font-semibold text-[#334952]">
                  Medicamento {indice + 1}
                </p>
                {lineas.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setLineas((actuales) =>
                        actuales.filter((_, posicion) => posicion !== indice)
                      )
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-[#b06b76] hover:text-[#985b66]"
                  >
                    <Trash2 className="h-4 w-4" /> Quitar
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <label className="space-y-1 lg:col-span-2">
                  <span className="text-sm font-medium text-gray-700">
                    Medicamento <b className="text-[#d35d68]">*</b>
                  </span>
                  <select
                    required
                    value={linea.producto_id}
                    onChange={(event) =>
                      actualizarLinea(indice, "producto_id", event.target.value)
                    }
                    className="w-full rounded-lg border border-[#d1dcdf] bg-white p-2.5 outline-[#18a7a7]"
                  >
                    <option value="">Selecciona un medicamento</option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} — {producto.presentacion ?? "Pieza"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">
                    Pedido / referencia <b className="text-[#d35d68]">*</b>
                  </span>
                  <input
                    required
                    value={linea.referencia}
                    onChange={(event) =>
                      actualizarLinea(indice, "referencia", event.target.value)
                    }
                    placeholder="Ej. PED-001"
                    className="w-full rounded-lg border border-[#d1dcdf] p-2.5 outline-[#18a7a7]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">
                    Caducidad <b className="text-[#d35d68]">*</b>
                  </span>
                  <input
                    required
                    type="date"
                    min={hoy}
                    value={linea.fecha_caducidad}
                    onChange={(event) =>
                      actualizarLinea(
                        indice,
                        "fecha_caducidad",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-[#d1dcdf] p-2.5 outline-[#18a7a7]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">
                    Cantidad (piezas) <b className="text-[#d35d68]">*</b>
                  </span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={linea.cantidad}
                    onChange={(event) =>
                      actualizarLinea(indice, "cantidad", event.target.value)
                    }
                    placeholder="Ej. 3"
                    className="w-full rounded-lg border border-[#d1dcdf] p-2.5 outline-[#18a7a7]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">
                    Costo unitario <b className="text-[#d35d68]">*</b>
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={linea.costo_unitario}
                    onChange={(event) =>
                      actualizarLinea(
                        indice,
                        "costo_unitario",
                        event.target.value
                      )
                    }
                    placeholder="Ej. 18.00"
                    className="w-full rounded-lg border border-[#d1dcdf] p-2.5 outline-[#18a7a7]"
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLineas((actuales) => [...actuales, nuevaLinea()])}
            className="flex items-center gap-2 rounded-xl border border-[#bcd1d1] px-4 py-2.5 text-sm font-medium text-[#527070] hover:bg-[#f7fbfb]"
          >
            <Plus className="h-4 w-4" /> Agregar otro medicamento
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-[#fff5f5] p-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3 border-t border-[#e1e7e8] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#c5d4d7] px-5 py-2.5 text-sm font-medium text-[#527070]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={cargando}
            className="flex items-center gap-2 rounded-xl bg-[#18a7a7] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <PackagePlus className="h-4 w-4" />
            {cargando ? "Guardando..." : "Registrar recepción"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default RecepcionMultiple
