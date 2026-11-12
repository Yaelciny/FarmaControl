import type { JSX } from "react"
import { useEffect, useState } from "react"
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronDown,
  CircleDollarSign,
  Download,
  History,
  LayoutDashboard,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Truck,
  type LucideIcon
} from "lucide-react"
import Inventario from "./pages/Inventario"
import Proveedores from "./pages/Proveedores"
import Entradas from "./pages/Entradas"
import Salidas from "./pages/Salidas"
import Ventas from "./pages/Ventas"
import Historial from "./pages/Historial"
import type { DashboardResumen } from "../../preload/global"

type Pagina =
  | "dashboard"
  | "inventario"
  | "ventas"
  | "historial"
  | "entradas"
  | "movimientos"
  | "reportes"
  | "proveedores"
  | "configuracion"

const modulos: Array<{
  id: Pagina
  nombre: string
  icono: LucideIcon
  grupo?: string
}> = [
  { id: "dashboard", nombre: "Dashboard", icono: LayoutDashboard },
  {
    id: "ventas",
    nombre: "Punto de venta",
    icono: ShoppingCart,
    grupo: "Operación"
  },
  { id: "historial", nombre: "Historial", icono: History, grupo: "Operación" },
  { id: "inventario", nombre: "Inventario", icono: Package },
  { id: "entradas", nombre: "Entradas", icono: Download },
  { id: "movimientos", nombre: "Bajas y ajustes", icono: SlidersHorizontal },
  {
    id: "proveedores",
    nombre: "Proveedores",
    icono: Truck,
    grupo: "Administración"
  },
  { id: "reportes", nombre: "Reportes", icono: ChartNoAxesColumn },
  { id: "configuracion", nombre: "Configuración", icono: Settings }
]

const contenidoModulo: Record<
  Exclude<Pagina, "dashboard" | "inventario">,
  { titulo: string; descripcion: string }
> = {
  ventas: {
    titulo: "Punto de venta",
    descripcion: "Aquí podrás crear carritos, cobrar y consultar el cambio."
  },
  historial: {
    titulo: "Historial de ventas",
    descripcion:
      "Consulta las ventas realizadas y conserva el registro de cada operación."
  },
  entradas: {
    titulo: "Entradas de mercancía",
    descripcion: "Registra proveedores, lotes, costos y fechas de caducidad."
  },
  movimientos: {
    titulo: "Bajas y ajustes",
    descripcion:
      "Registra productos dañados, caducados, perdidos, devueltos o correcciones de inventario."
  },
  proveedores: {
    titulo: "Proveedores",
    descripcion: "Administra los distribuidores de Farmacia Medina."
  },
  reportes: {
    titulo: "Reportes",
    descripcion: "Consulta ventas, utilidad, existencias y alertas."
  },
  configuracion: {
    titulo: "Configuración",
    descripcion: "Configura la farmacia, usuarios y respaldos."
  }
}

function App(): JSX.Element {
  const [pagina, setPagina] = useState<Pagina>("dashboard")
  const [resumen, setResumen] = useState<DashboardResumen>({
    ventas_hoy_centavos: 0,
    medicamentos_registrados: 0,
    stock_bajo: 0,
    caducidades_proximas: 0
  })
  const fechaHoy = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date())

  const moduloPendiente =
    pagina !== "dashboard" && pagina !== "inventario"
      ? contenidoModulo[pagina]
      : null

  useEffect(() => {
    let activo = true
    window.api.dashboard
      .resumen()
      .then((datos) => {
        if (activo) setResumen(datos)
      })
      .catch(() => undefined)

    return () => {
      activo = false
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-[#f1f4f5]">
      <aside className="flex w-72 shrink-0 flex-col border-r border-[#e1e9e8] bg-white px-5 py-6 text-[#334952]">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e4f5ef] text-2xl font-bold text-[#168a8a] shadow-sm">
            ✚
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">Farmacia Medina</p>
            <p className="text-xs tracking-wide text-slate-500">FarmaControl</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1" aria-label="Módulos principales">
          {modulos.map((modulo, indice) => (
            <div key={modulo.id}>
              {modulo.grupo && indice > 0 && (
                <p className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {modulo.grupo}
                </p>
              )}
              <button
                type="button"
                onClick={() => setPagina(modulo.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                  pagina === modulo.id
                    ? "border border-[#c9ece2] bg-[#eaf8f4] text-[#168a8a] shadow-sm"
                    : "text-[#52656c] hover:bg-[#f3f8f7] hover:text-[#168a8a]"
                }`}
              >
                <modulo.icono className="h-5 w-5" strokeWidth={1.8} />
                {modulo.nombre}
              </button>
            </div>
          ))}
        </nav>

        <div className="mt-8 rounded-2xl border border-[#dce9e6] bg-[#f7fbfa] p-4">
          <p className="text-xs font-semibold text-[#168a8a]">Sesión local</p>
          <p className="mt-1 text-sm font-medium text-[#334952]">
            Farmacia Medina
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Sistema disponible sin conexión
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dce4e7] bg-white px-8 py-4">
          <label className="flex min-w-[260px] flex-1 items-center gap-3 rounded-xl border border-[#d1dcdf] bg-[#fafcfc] px-4 py-2.5 text-sm text-slate-400 shadow-sm focus-within:border-[#18a7a7] focus-within:ring-2 focus-within:ring-[#d9eeee]">
            <span className="text-lg">⌕</span>
            <input
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
              placeholder="Buscar medicamento, código o lote..."
            />
          </label>
          <div className="flex items-center gap-4 text-sm text-[#435862]">
            <div className="hidden items-center gap-2 border-r border-[#dce4e7] pr-4 lg:flex">
              <CalendarDays
                className="h-5 w-5 text-[#435862]"
                strokeWidth={1.8}
              />
              <span className="capitalize">{fechaHoy}</span>
            </div>
            <button
              type="button"
              aria-label="Notificaciones"
              className="relative rounded-xl p-2 text-xl text-[#435862] hover:bg-[#edf2f3]"
            >
              <Bell className="h-5 w-5" strokeWidth={1.8} />
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#e34d5f]" />
            </button>
            <button
              type="button"
              className="flex items-center gap-3 rounded-xl p-1.5 pr-2 text-left hover:bg-[#edf2f3]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9eeee] text-lg text-[#168a8a]">
                FM
              </span>
              <span className="hidden leading-tight sm:block">
                <strong className="block text-sm">Farmacia Medina</strong>
                <small className="text-xs text-slate-500">Administrador</small>
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </header>

        <div className="p-8">
          {pagina === "inventario" ? (
            <Inventario />
          ) : pagina === "ventas" ? (
            <Ventas />
          ) : pagina === "historial" ? (
            <Historial />
          ) : pagina === "proveedores" ? (
            <Proveedores />
          ) : pagina === "entradas" ? (
            <Entradas />
          ) : pagina === "movimientos" ? (
            <Salidas />
          ) : moduloPendiente ? (
            <section className="rounded-2xl border border-[#dce4e7] bg-white p-10 shadow-sm">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e4f1f1] text-[#168a8a]">
                {(() => {
                  const Icono =
                    modulos.find((modulo) => modulo.id === pagina)?.icono ??
                    Package
                  return <Icono className="h-7 w-7" />
                })()}
              </div>
              <h2 className="text-3xl font-bold text-[#334952]">
                {moduloPendiente.titulo}
              </h2>
              <p className="mt-3 max-w-xl text-slate-500">
                {moduloPendiente.descripcion}
              </p>
              <div className="mt-8 rounded-xl border border-dashed border-[#c5d8d8] bg-[#f7fbfb] p-5 text-sm text-[#527070]">
                Módulo preparado para el siguiente pase de desarrollo.
              </div>
            </section>
          ) : (
            <>
              <div className="flex items-start gap-4">
                <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-[#e4f1f1] text-[#168a8a] sm:flex">
                  <Store className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="mt-1 text-3xl font-bold text-[#334952]">
                    ¡Bienvenido a Farmacia Medina!
                  </h2>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    titulo: "Ventas de hoy",
                    valor: `$${(resumen.ventas_hoy_centavos / 100).toFixed(2)}`,
                    detalle:
                      resumen.ventas_hoy_centavos > 0
                        ? "Ventas completadas hoy"
                        : "Sin ventas registradas",
                    icono: CircleDollarSign,
                    color: "bg-[#e9f7f1] text-[#3d9877]"
                  },
                  {
                    titulo: "Productos registrados",
                    valor: String(resumen.medicamentos_registrados),
                    detalle: "Medicamentos activos",
                    icono: Package,
                    color: "bg-[#e4f1f1] text-[#168a8a]"
                  },
                  {
                    titulo: "Stock bajo",
                    valor: String(resumen.stock_bajo),
                    detalle:
                      resumen.stock_bajo > 0
                        ? "Requieren revisión"
                        : "Todo en orden",
                    icono: AlertTriangle,
                    color: "bg-[#fff7e6] text-[#b18435]"
                  },
                  {
                    titulo: "Próximas caducidades",
                    valor: String(resumen.caducidades_proximas),
                    detalle:
                      resumen.caducidades_proximas > 0
                        ? "En los próximos 30 días"
                        : "Sin alertas",
                    icono: CalendarDays,
                    color: "bg-[#f9eef0] text-[#b06b76]"
                  }
                ].map((tarjeta) => (
                  <div
                    key={tarjeta.titulo}
                    className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          {tarjeta.titulo}
                        </p>
                        <h3 className="mt-2 text-2xl font-bold text-[#334952]">
                          {tarjeta.valor}
                        </h3>
                      </div>
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${tarjeta.color}`}
                      >
                        <tarjeta.icono className="h-5 w-5" strokeWidth={1.8} />
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      {tarjeta.detalle}
                    </p>
                  </div>
                ))}
              </div>

              <section className="mt-6 rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-[#334952]">
                      Productos recientes
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Los medicamentos aparecerán aquí al registrarlos.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPagina("entradas")}
                      className="flex items-center gap-2 rounded-xl border border-[#bcd1d1] px-4 py-2 text-sm font-medium text-[#527070] hover:bg-[#f7fbfb]"
                    >
                      <Download className="h-4 w-4" /> Registrar entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => setPagina("inventario")}
                      className="flex items-center gap-2 rounded-xl bg-[#18a7a7] px-4 py-2 text-sm font-medium text-white hover:bg-[#168f8f]"
                    >
                      <Plus className="h-4 w-4" /> Nuevo producto
                    </button>
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-xl border border-[#e1e7e8]">
                  <div className="grid grid-cols-4 bg-[#f5f7f7] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Código</span>
                    <span>Medicamento</span>
                    <span>Categoría</span>
                    <span>Estado</span>
                  </div>
                  <div className="px-4 py-10 text-center text-sm text-slate-400">
                    No hay medicamentos registrados todavía.
                  </div>
                </div>
              </section>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
                  <h3 className="text-xl font-bold text-[#334952]">
                    Resumen de ventas
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Tus ventas semanales aparecerán aquí.
                  </p>
                  <div className="mt-5 flex h-28 items-center justify-center rounded-xl bg-[#f7f9f9] text-sm text-slate-400">
                    Aún no hay datos para mostrar
                  </div>
                </section>
                <section className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
                  <h3 className="text-xl font-bold text-[#334952]">
                    Alertas de inventario
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Productos que requieren tu atención.
                  </p>
                  <div className="mt-5 flex h-28 items-center justify-center rounded-xl bg-[#f7f9f9] text-sm text-slate-400">
                    No hay alertas pendientes
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
