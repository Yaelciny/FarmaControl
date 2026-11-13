import { useEffect, useState, type FormEvent } from "react"
import {
  AlertTriangle,
  CalendarDays,
  ChartNoAxesColumn,
  Download,
  Package,
  Printer,
  RefreshCw,
  TrendingUp
} from "lucide-react"
import type { ReporteResumen } from "../../../preload/global"
import type { LucideIcon } from "lucide-react"

const hoy = (): string => new Date().toISOString().slice(0, 10)
const inicioMes = (): string => {
  const fecha = new Date()
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
}
const dinero = (centavos: number): string =>
  `$${(centavos / 100).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fechaVisible = (valor: string): string =>
  valor.split("-").reverse().join("/")

const resumenInicial: ReporteResumen = {
  ventas: {
    cantidad: 0,
    canceladas: 0,
    total_centavos: 0,
    efectivo_centavos: 0,
    tarjeta_centavos: 0,
    transferencia_centavos: 0
  },
  inventario: {
    productos_activos: 0,
    stock_bajo: 0,
    agotados: 0,
    lotes_caducados: 0,
    lotes_por_caducar: 0
  },
  mas_vendidos: []
}

function Reportes(): React.JSX.Element {
  const [desde, setDesde] = useState(inicioMes())
  const [hasta, setHasta] = useState(hoy())
  const [resumen, setResumen] = useState<ReporteResumen>(resumenInicial)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")

  async function cargarReporte(): Promise<void> {
    try {
      setCargando(true)
      setError("")
      setResumen(await window.api.reportes.resumen({ desde, hasta }))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el reporte"
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    let activo = true
    window.api.reportes
      .resumen({ desde, hasta })
      .then((datos) => {
        if (activo) setResumen(datos)
      })
      .catch((err: unknown) => {
        if (activo) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el reporte"
          )
        }
      })
    return () => {
      activo = false
    }
  }, [desde, hasta])

  function buscar(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void cargarReporte()
  }

  function exportarCsv(): void {
    const filas = [
      ["Reporte de FarmaControl"],
      ["Periodo", `${desde} a ${hasta}`],
      [],
      ["VENTAS"],
      ["Ventas completadas", resumen.ventas.cantidad],
      ["Ventas canceladas", resumen.ventas.canceladas],
      ["Ingresos totales", dinero(resumen.ventas.total_centavos)],
      ["Efectivo", dinero(resumen.ventas.efectivo_centavos)],
      ["Tarjeta", dinero(resumen.ventas.tarjeta_centavos)],
      ["Transferencia", dinero(resumen.ventas.transferencia_centavos)],
      [],
      ["INVENTARIO"],
      ["Productos activos", resumen.inventario.productos_activos],
      ["Stock bajo", resumen.inventario.stock_bajo],
      ["Agotados", resumen.inventario.agotados],
      ["Lotes caducados", resumen.inventario.lotes_caducados],
      ["Lotes por caducar", resumen.inventario.lotes_por_caducar],
      [],
      ["PRODUCTOS MÁS VENDIDOS"],
      ["Producto", "Unidades", "Importe vendido"],
      ...resumen.mas_vendidos.map((producto) => [
        producto.producto_nombre,
        producto.cantidad,
        dinero(producto.total_centavos)
      ])
    ]

    const csv = filas
      .map((fila) =>
        fila
          .map((celda) => `"${String(celda ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\r\n")
    const enlace = document.createElement("a")
    enlace.href = URL.createObjectURL(
      new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" })
    )
    enlace.download = `reporte-farmacontrol-${desde}-a-${hasta}.csv`
    enlace.click()
    URL.revokeObjectURL(enlace.href)
  }

  const tarjetas: Array<{
    titulo: string
    valor: string
    detalle: string
    icono: LucideIcon
    color: string
  }> = [
    {
      titulo: "Ventas completadas",
      valor: String(resumen.ventas.cantidad),
      detalle: "Operaciones en el periodo",
      icono: ChartNoAxesColumn,
      color: "bg-[#e4f1f1] text-[#168a8a]"
    },
    {
      titulo: "Ingresos por ventas",
      valor: dinero(resumen.ventas.total_centavos),
      detalle: "Ventas no canceladas",
      icono: TrendingUp,
      color: "bg-[#e9f7f1] text-[#3d9877]"
    },
    {
      titulo: "Cancelaciones",
      valor: String(resumen.ventas.canceladas),
      detalle: "Ventas revertidas",
      icono: AlertTriangle,
      color: "bg-[#fff7e6] text-[#b18435]"
    },
    {
      titulo: "Productos activos",
      valor: String(resumen.inventario.productos_activos),
      detalle: "En el catálogo",
      icono: Package,
      color: "bg-[#f1edf8] text-[#76559b]"
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#168a8a]">Análisis</p>
        <h2 className="mt-1 text-3xl font-bold text-[#334952]">Reportes</h2>
        <p className="mt-2 max-w-2xl text-gray-500">
          Consulta el comportamiento de las ventas y el estado del inventario
          con información real.
        </p>
      </div>

      <form
        onSubmit={buscar}
        className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Desde</span>
            <div className="flex items-center gap-2 rounded-lg border border-[#d1dcdf] px-3 focus-within:border-[#18a7a7]">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <input
                required
                type="date"
                value={desde}
                onChange={(event) => setDesde(event.target.value)}
                className="p-2 outline-none"
              />
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Hasta</span>
            <div className="flex items-center gap-2 rounded-lg border border-[#d1dcdf] px-3 focus-within:border-[#18a7a7]">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <input
                required
                type="date"
                value={hasta}
                onChange={(event) => setHasta(event.target.value)}
                className="p-2 outline-none"
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={cargando}
            className="flex items-center gap-2 rounded-xl bg-[#18a7a7] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#168f8f] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`}
            />
            {cargando ? "Actualizando..." : "Actualizar reporte"}
          </button>
          <button
            type="button"
            onClick={exportarCsv}
            className="flex items-center gap-2 rounded-xl border border-[#bcd1d1] px-5 py-2.5 text-sm font-medium text-[#527070] hover:bg-[#f7fbfb] print:hidden"
          >
            <Download className="h-4 w-4" /> Descargar CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-[#bcd1d1] px-5 py-2.5 text-sm font-medium text-[#527070] hover:bg-[#f7fbfb] print:hidden"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Periodo seleccionado: {fechaVisible(desde)} — {fechaVisible(hasta)}
        </p>
      </form>

      {error && (
        <p className="rounded-xl bg-[#fff5f5] p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map((tarjeta) => {
          const Icon = tarjeta.icono
          return (
            <div
              key={tarjeta.titulo}
              className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{tarjeta.titulo}</p>
                  <p className="mt-2 text-2xl font-bold text-[#334952]">
                    {tarjeta.valor}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {tarjeta.detalle}
                  </p>
                </div>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${tarjeta.color}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-[#334952]">
            Ventas por método de pago
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Distribución de las ventas completadas.
          </p>
          <div className="mt-5 space-y-3">
            {[
              ["Efectivo", resumen.ventas.efectivo_centavos],
              ["Tarjeta", resumen.ventas.tarjeta_centavos],
              ["Transferencia", resumen.ventas.transferencia_centavos]
            ].map(([nombre, valor]) => (
              <div
                key={nombre as string}
                className="flex items-center justify-between rounded-xl bg-[#f7f9f9] p-3"
              >
                <span className="text-sm font-medium text-[#527070]">
                  {nombre}
                </span>
                <strong className="text-[#334952]">
                  {dinero(valor as number)}
                </strong>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-[#334952]">
            Estado del inventario
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Indicadores que requieren atención.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              [
                "Stock bajo",
                resumen.inventario.stock_bajo,
                "bg-[#fff7e6] text-[#b18435]"
              ],
              [
                "Agotados",
                resumen.inventario.agotados,
                "bg-[#fff0f0] text-[#b06b76]"
              ],
              [
                "Lotes caducados",
                resumen.inventario.lotes_caducados,
                "bg-[#fff0f0] text-[#b06b76]"
              ],
              [
                "Por caducar",
                resumen.inventario.lotes_por_caducar,
                "bg-[#e4f1f1] text-[#168a8a]"
              ]
            ].map(([nombre, valor, color]) => (
              <div key={nombre as string} className={`rounded-xl p-4 ${color}`}>
                <p className="text-sm font-medium">{nombre}</p>
                <p className="mt-1 text-2xl font-bold">{valor}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#168a8a]" />
          <div>
            <h3 className="text-xl font-bold text-[#334952]">
              Productos más vendidos
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Ordenados por unidades vendidas en el periodo.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[600px] w-full text-left text-sm">
            <thead className="bg-[#f5f7f7] text-[11px] uppercase tracking-wide text-[#6b7d83]">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Unidades</th>
                <th className="px-4 py-3">Importe vendido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f1]">
              {resumen.mas_vendidos.map((producto) => (
                <tr key={producto.producto_nombre}>
                  <td className="px-4 py-4 font-semibold text-[#334952]">
                    {producto.producto_nombre}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {producto.cantidad}
                  </td>
                  <td className="px-4 py-4 font-semibold text-[#334952]">
                    {dinero(producto.total_centavos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {resumen.mas_vendidos.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              No hay ventas completadas en este periodo.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

export default Reportes
