import { useEffect, useState } from "react"
import { Eye, RotateCcw, Search, X } from "lucide-react"
import type { VentaDetalle, VentaResumen } from "../../../preload/global"

function Historial(): React.JSX.Element {
  const [ventas, setVentas] = useState<VentaResumen[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [detalleVenta, setDetalleVenta] = useState<VentaResumen | null>(null)
  const [detalles, setDetalles] = useState<VentaDetalle[]>([])
  const [error, setError] = useState("")

  async function cargarVentas(): Promise<void> {
    setVentas(await window.api.ventas.listar())
  }

  useEffect(() => {
    let activo = true
    window.api.ventas
      .listar()
      .then((datos) => {
        if (activo) setVentas(datos)
      })
      .catch((err: unknown) => {
        if (activo)
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el historial"
          )
      })
    return () => {
      activo = false
    }
  }, [])

  async function verDetalle(venta: VentaResumen): Promise<void> {
    try {
      setError("")
      setDetalles(await window.api.ventas.detalle(venta.id))
      setDetalleVenta(venta)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el detalle"
      )
    }
  }

  async function cancelarVenta(venta: VentaResumen): Promise<void> {
    if (venta.estado === "cancelada") return
    if (
      !window.confirm(
        `¿Cancelar la venta #${venta.id}? El inventario será revertido.`
      )
    )
      return
    try {
      setError("")
      await window.api.ventas.cancelar(venta.id)
      await cargarVentas()
      if (detalleVenta?.id === venta.id)
        setDetalleVenta({ ...venta, estado: "cancelada" })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cancelar la venta"
      )
    }
  }

  const filtradas = ventas.filter((venta) =>
    `${venta.id} ${venta.fecha} ${venta.metodo_pago}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  )
  const metodo = (valor: string): string =>
    ({
      efectivo: "Efectivo",
      tarjeta: "Tarjeta",
      transferencia: "Transferencia"
    })[valor] ?? valor

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#168a8a]">Operación</p>
        <h2 className="mt-1 text-3xl font-bold text-[#334952]">
          Historial de ventas
        </h2>
        <p className="mt-2 max-w-2xl text-gray-500">
          Consulta las ventas realizadas y conserva el registro de cada
          operación.
        </p>
      </div>
      {error && (
        <div className="rounded-xl bg-[#fff5f5] p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
        <label className="flex items-center gap-3 rounded-xl border border-[#d1dcdf] px-4 py-2.5 text-sm text-slate-400 focus-within:border-[#18a7a7]">
          <Search className="h-5 w-5" />
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por número, fecha o método de pago..."
            className="min-w-0 flex-1 outline-none"
          />
        </label>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
        <div className="mb-4 flex justify-end">
          <span className="text-xs text-slate-500">
            {filtradas.length} ventas
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full text-left text-sm">
            <thead className="bg-[#f5f7f7] text-[11px] uppercase tracking-wide text-[#6b7d83]">
              <tr>
                <th className="px-4 py-3 font-semibold">Venta</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Método de pago</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f1]">
              {filtradas.map((venta) => (
                <tr key={venta.id} className="hover:bg-[#fbfdfd]">
                  <td className="px-4 py-4 font-semibold text-[#334952]">
                    #{venta.id}
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    {venta.fecha.slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {metodo(venta.metodo_pago)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-[#334952]">
                    ${(venta.total_centavos / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${venta.estado === "cancelada" ? "bg-[#fff0f0] text-[#b06b76]" : "bg-[#e5f7ef] text-[#29835f]"}`}
                    >
                      {venta.estado === "cancelada"
                        ? "Cancelada"
                        : "Completada"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void verDetalle(venta)}
                        className="flex items-center gap-1 rounded-lg bg-[#edf2f3] px-2.5 py-1.5 text-xs font-semibold text-[#527070]"
                      >
                        <Eye className="h-3 w-3" /> Ver detalle
                      </button>
                      <button
                        type="button"
                        disabled={venta.estado === "cancelada"}
                        onClick={() => void cancelarVenta(venta)}
                        className="flex items-center gap-1 rounded-lg bg-[#fff0f0] px-2.5 py-1.5 text-xs font-semibold text-[#b06b76] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <RotateCcw className="h-3 w-3" /> Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtradas.length === 0 && (
            <p className="py-8 text-center text-gray-500">
              No hay ventas registradas.
            </p>
          )}
        </div>
      </div>

      {detalleVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2d33]/55 p-4 backdrop-blur-[2px]">
          <section className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between border-b border-[#e1e7e8] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#168a8a]">
                  Detalle de venta
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-[#334952]">
                  Venta #{detalleVenta.id}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {metodo(detalleVenta.metodo_pago)} ·{" "}
                  {detalleVenta.fecha.slice(0, 16).replace("T", " ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetalleVenta(null)}
                aria-label="Cerrar detalle"
                className="rounded-xl p-2 text-slate-400 hover:bg-[#f1f4f5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              {detalles.map((detalle) => (
                <div
                  key={detalle.id}
                  className="flex items-center justify-between rounded-xl bg-[#f7f9f9] p-3"
                >
                  <div>
                    <p className="font-semibold text-[#334952]">
                      {detalle.producto_nombre}
                    </p>
                    <p className="text-xs text-slate-500">
                      {detalle.cantidad} unidades · Lote{" "}
                      {detalle.numero_lote ?? "—"}
                    </p>
                  </div>
                  <p className="font-semibold text-[#334952]">
                    ${(detalle.subtotal_centavos / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-between border-t border-[#e1e7e8] pt-4 text-lg font-bold text-[#334952]">
              <span>Total</span>
              <span>${(detalleVenta.total_centavos / 100).toFixed(2)}</span>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setDetalleVenta(null)}
                className="rounded-xl bg-[#18a7a7] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#168f8f]"
              >
                Cerrar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default Historial
