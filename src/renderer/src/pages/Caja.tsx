import { useEffect, useState, type FormEvent } from "react"
import { Calculator, History, WalletCards } from "lucide-react"
import type { CajaCorte, CajaResumen } from "../../../preload/global"
import { formatearFechaHoraMexico } from "../../../shared/fecha"

const estadoInicial: CajaResumen = {
  corte: null,
  ventas_efectivo_centavos: 0,
  ventas_tarjeta_centavos: 0,
  ventas_transferencia_centavos: 0,
  total_ventas_centavos: 0,
  efectivo_esperado_centavos: 0
}

const moneda = (centavos: number): string =>
  `$${(centavos / 100).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`

const fecha = (valor: string | null): string => formatearFechaHoraMexico(valor)

function Caja(): React.JSX.Element {
  const [estado, setEstado] = useState<CajaResumen>(estadoInicial)
  const [historial, setHistorial] = useState<CajaCorte[]>([])
  const [fondoInicial, setFondoInicial] = useState("")
  const [efectivoContado, setEfectivoContado] = useState("")
  const [observacion, setObservacion] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)

  async function cargarDatos(): Promise<void> {
    const [estadoActual, cortes] = await Promise.all([
      window.api.caja.estado(),
      window.api.caja.historial()
    ])
    setEstado(estadoActual)
    setHistorial(cortes)
  }

  useEffect(() => {
    let activo = true
    Promise.all([window.api.caja.estado(), window.api.caja.historial()])
      .then(([estadoActual, cortes]) => {
        if (!activo) return
        setEstado(estadoActual)
        setHistorial(cortes)
      })
      .catch((err: unknown) => {
        if (activo) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar la caja"
          )
        }
      })
    return () => {
      activo = false
    }
  }, [])

  async function abrirCaja(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError("")
    const monto = Number(fondoInicial)
    if (!Number.isFinite(monto) || monto < 0) {
      setError("Ingresa un fondo inicial válido")
      return
    }

    try {
      setCargando(true)
      await window.api.caja.abrir(Math.round(monto * 100))
      setFondoInicial("")
      await cargarDatos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la caja")
    } finally {
      setCargando(false)
    }
  }

  async function cerrarCaja(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError("")
    const monto = Number(efectivoContado)
    if (!Number.isFinite(monto) || monto < 0) {
      setError("Ingresa el efectivo contado")
      return
    }

    try {
      setCargando(true)
      await window.api.caja.cerrar({
        efectivo_contado_centavos: Math.round(monto * 100),
        observacion: observacion.trim() || null
      })
      setEfectivoContado("")
      setObservacion("")
      await cargarDatos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cerrar la caja")
    } finally {
      setCargando(false)
    }
  }

  const corte = estado.corte
  const diferencia = corte?.diferencia_centavos ?? null

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#168a8a]">Operación</p>
        <h2 className="mt-1 text-3xl font-bold text-[#334952]">
          Corte de caja
        </h2>
        <p className="mt-2 max-w-2xl text-gray-500">
          Controla el fondo inicial, las ventas del turno y la diferencia al
          cerrar la caja.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-[#fff5f5] p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {!corte ? (
        <section className="rounded-2xl border border-[#dce4e7] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e4f1f1] text-[#168a8a]">
              <WalletCards className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#334952]">Abrir caja</h3>
              <p className="mt-1 text-sm text-slate-500">
                Registra el dinero inicial disponible antes de comenzar el
                turno.
              </p>
            </div>
          </div>
          <form
            onSubmit={(event) => void abrirCaja(event)}
            className="mt-6 flex flex-wrap items-end gap-4"
          >
            <label className="w-full max-w-xs space-y-1">
              <span className="text-sm font-medium text-gray-700">
                Fondo inicial <b className="text-[#d35d68]">*</b>
              </span>
              <div className="flex items-center rounded-lg border border-[#d1dcdf] px-3 focus-within:border-[#18a7a7]">
                <span className="text-slate-400">$</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={fondoInicial}
                  onChange={(event) => setFondoInicial(event.target.value)}
                  placeholder="Ej. 1000.00"
                  className="w-full p-2.5 outline-none"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={cargando}
              className="rounded-xl bg-[#18a7a7] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#168f8f] disabled:opacity-50"
            >
              {cargando ? "Abriendo..." : "Abrir caja"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-[#bfe5d5] bg-[#f7fbfa] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="rounded-full bg-[#e5f7ef] px-3 py-1 text-xs font-semibold text-[#29835f]">
                  Caja abierta
                </span>
                <p className="mt-2 text-sm text-slate-500">
                  Apertura: {fecha(corte.fecha_apertura)}
                </p>
              </div>
              <p className="text-sm text-slate-500">Corte #{corte.id}</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Fondo inicial", moneda(corte.fondo_inicial_centavos)],
                ["Efectivo", moneda(estado.ventas_efectivo_centavos)],
                ["Tarjeta", moneda(estado.ventas_tarjeta_centavos)],
                [
                  "Transferencias",
                  moneda(estado.ventas_transferencia_centavos)
                ],
                ["Total vendido", moneda(estado.total_ventas_centavos)]
              ].map(([titulo, valor]) => (
                <div
                  key={titulo}
                  className="rounded-xl border border-[#dce9e6] bg-white p-4"
                >
                  <p className="text-xs text-slate-400">{titulo}</p>
                  <p className="mt-1 text-lg font-bold text-[#334952]">
                    {valor}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-4">
              <span className="text-sm font-medium text-[#527070]">
                Efectivo esperado en caja
              </span>
              <strong className="text-2xl text-[#168a8a]">
                {moneda(estado.efectivo_esperado_centavos)}
              </strong>
            </div>
          </section>

          <section className="rounded-2xl border border-[#dce4e7] bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7e6] text-[#b18435]">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#334952]">
                  Cerrar caja
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Cuenta el efectivo físico y compáralo con el esperado.
                </p>
              </div>
            </div>
            <form
              onSubmit={(event) => void cerrarCaja(event)}
              className="mt-6 grid gap-4 md:grid-cols-[minmax(0,18rem)_1fr_auto] md:items-end"
            >
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">
                  Efectivo contado <b className="text-[#d35d68]">*</b>
                </span>
                <div className="flex items-center rounded-lg border border-[#d1dcdf] px-3 focus-within:border-[#18a7a7]">
                  <span className="text-slate-400">$</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={efectivoContado}
                    onChange={(event) => setEfectivoContado(event.target.value)}
                    placeholder="Ej. 2450.00"
                    className="w-full p-2.5 outline-none"
                  />
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">
                  Observación
                </span>
                <input
                  value={observacion}
                  onChange={(event) => setObservacion(event.target.value)}
                  placeholder="Ej. Se retiraron $500 para depósito"
                  className="w-full rounded-lg border border-[#d1dcdf] p-2.5 outline-none focus:border-[#18a7a7]"
                />
              </label>
              <button
                type="submit"
                disabled={cargando}
                className="rounded-xl bg-[#b06b76] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#985b66] disabled:opacity-50"
              >
                {cargando ? "Cerrando..." : "Cerrar caja"}
              </button>
            </form>
          </section>
        </>
      )}

      {diferencia !== null && (
        <div
          className={`rounded-xl p-4 text-sm font-medium ${diferencia === 0 ? "bg-[#e5f7ef] text-[#29835f]" : diferencia < 0 ? "bg-[#fff0f0] text-[#b06b76]" : "bg-[#fff7e6] text-[#9b742c]"}`}
        >
          {diferencia === 0
            ? "El último corte cuadró correctamente."
            : diferencia < 0
              ? `El último corte tuvo un faltante de ${moneda(Math.abs(diferencia))}.`
              : `El último corte tuvo un sobrante de ${moneda(diferencia)}.`}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-[#168a8a]" />
          <h3 className="text-xl font-bold text-[#334952]">
            Historial de cortes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full text-left text-sm">
            <thead className="bg-[#f5f7f7] text-[11px] uppercase tracking-wide text-[#6b7d83]">
              <tr>
                <th className="px-4 py-3">Corte</th>
                <th className="px-4 py-3">Apertura</th>
                <th className="px-4 py-3">Cierre</th>
                <th className="px-4 py-3">Ventas</th>
                <th className="px-4 py-3">Esperado</th>
                <th className="px-4 py-3">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f1]">
              {historial.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 font-semibold text-[#334952]">
                    #{item.id}
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    {fecha(item.fecha_apertura)}
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    {fecha(item.fecha_cierre)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-[#334952]">
                    {moneda(item.total_ventas_centavos)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {moneda(item.efectivo_esperado_centavos)}
                  </td>
                  <td
                    className={`px-4 py-4 font-semibold ${item.diferencia_centavos === 0 ? "text-[#29835f]" : item.diferencia_centavos !== null && item.diferencia_centavos < 0 ? "text-[#b06b76]" : "text-[#9b742c]"}`}
                  >
                    {item.diferencia_centavos === null
                      ? "—"
                      : moneda(item.diferencia_centavos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {historial.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Todavía no hay cortes cerrados.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

export default Caja
