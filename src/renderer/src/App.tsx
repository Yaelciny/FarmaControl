import type { JSX } from 'react'
import { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronDown,
  CircleDollarSign,
  Download,
  LayoutDashboard,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Truck,
  type LucideIcon
} from 'lucide-react'
import Inventario from './pages/Inventario'

type Pagina = 'dashboard' | 'inventario' | 'ventas' | 'entradas' | 'movimientos' | 'reportes' | 'proveedores' | 'configuracion'

const modulos: Array<{ id: Pagina; nombre: string; icono: LucideIcon; grupo?: string }> = [
  { id: 'dashboard', nombre: 'Dashboard', icono: LayoutDashboard },
  { id: 'ventas', nombre: 'Punto de venta', icono: ShoppingCart, grupo: 'Operación' },
  { id: 'inventario', nombre: 'Inventario', icono: Package },
  { id: 'entradas', nombre: 'Entradas', icono: Download },
  { id: 'movimientos', nombre: 'Salidas y ajustes', icono: SlidersHorizontal },
  { id: 'proveedores', nombre: 'Proveedores', icono: Truck, grupo: 'Administración' },
  { id: 'reportes', nombre: 'Reportes', icono: ChartNoAxesColumn },
  { id: 'configuracion', nombre: 'Configuración', icono: Settings }
]

const contenidoModulo: Record<Exclude<Pagina, 'dashboard' | 'inventario'>, { titulo: string; descripcion: string }> = {
  ventas: { titulo: 'Punto de venta', descripcion: 'Aquí podrás crear carritos, cobrar y consultar el cambio.' },
  entradas: { titulo: 'Entradas de mercancía', descripcion: 'Registra proveedores, lotes, costos y fechas de caducidad.' },
  movimientos: { titulo: 'Salidas y ajustes', descripcion: 'Controla productos dañados, caducados, perdidos o devueltos.' },
  proveedores: { titulo: 'Proveedores', descripcion: 'Administra los distribuidores de Farmacia Medina.' },
  reportes: { titulo: 'Reportes', descripcion: 'Consulta ventas, utilidad, existencias y alertas.' },
  configuracion: { titulo: 'Configuración', descripcion: 'Configura la farmacia, usuarios y respaldos.' }
}

function App(): JSX.Element {
  const [pagina, setPagina] = useState<Pagina>('dashboard')
  const fechaHoy = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date())

  const moduloPendiente = pagina !== 'dashboard' && pagina !== 'inventario' ? contenidoModulo[pagina] : null

  return (
    <div className="flex min-h-screen bg-[#edf5fb]">
      <aside className="flex w-72 shrink-0 flex-col bg-[#172b4d] px-5 py-6 text-white">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#12b8bf] text-2xl font-bold text-white shadow-lg shadow-[#081b36]/30">✚</div>
          <div>
            <p className="text-lg font-bold leading-tight">Farmacia Medina</p>
            <p className="text-xs tracking-wide text-[#d8ebf0]">FarmaControl</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1" aria-label="Módulos principales">
          {modulos.map((modulo, indice) => (
            <div key={modulo.id}>
              {modulo.grupo && (indice > 0) && (
                <p className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d4e8ed]">{modulo.grupo}</p>
              )}
              <button
                type="button"
                onClick={() => setPagina(modulo.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${pagina === modulo.id
                  ? 'bg-[#079db7] text-white shadow-md shadow-[#081b36]/25'
                  : 'text-[#edf7f9] hover:bg-[#223f68] hover:text-white'
                  }`}
              >
                <modulo.icono className="h-5 w-5" strokeWidth={1.8} />
                {modulo.nombre}
              </button>
            </div>
          ))}
        </nav>

        <div className="mt-8 rounded-2xl border border-[#2d4970] bg-[#203b63] p-4">
          <p className="text-xs font-semibold text-[#e0f0f5]">Sesión local</p>
          <p className="mt-1 text-sm font-medium">Farmacia Medina</p>
          <p className="mt-2 text-xs text-[#d8ebf0]">Sistema disponible sin conexión</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d6e3ef] bg-[#f8fbff] px-8 py-4">
          <label className="flex min-w-[260px] flex-1 items-center gap-3 rounded-xl border border-[#c6d7e8] bg-white px-4 py-2.5 text-sm text-slate-400 shadow-sm focus-within:border-[#42aeca] focus-within:ring-2 focus-within:ring-[#d8f0f5]">
            <span className="text-lg">⌕</span>
            <input className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400" placeholder="Buscar medicamento, código o lote..." />
            <kbd className="hidden rounded-md border border-[#c6d7e8] bg-[#f4f8fc] px-2 py-1 text-xs text-slate-400 sm:block">Ctrl + K</kbd>
          </label>
          <div className="flex items-center gap-4 text-sm text-[#26384f]">
            <div className="hidden items-center gap-2 border-r border-[#d6e3ef] pr-4 lg:flex">
              <CalendarDays className="h-5 w-5 text-[#26384f]" strokeWidth={1.8} />
              <span className="capitalize">{fechaHoy}</span>
            </div>
            <button type="button" aria-label="Notificaciones" className="relative rounded-xl p-2 text-xl text-[#26384f] hover:bg-[#e8f2f8]">
              <Bell className="h-5 w-5" strokeWidth={1.8} /><span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-[#f8fbff] bg-[#e34d5f]" />
            </button>
            <button type="button" className="flex items-center gap-3 rounded-xl p-1.5 pr-2 text-left hover:bg-[#e8f2f8]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9edf3] text-lg text-[#238ca5]">FM</span>
              <span className="hidden leading-tight sm:block"><strong className="block text-sm">Farmacia Medina</strong><small className="text-xs text-slate-500">Administrador</small></span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </header>

        <div className="p-8">
          {pagina === 'inventario' ? (
            <Inventario />
          ) : moduloPendiente ? (
            <section className="rounded-2xl border border-[#dce8ed] bg-white p-10 shadow-sm">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f3f7] text-[#6095aa]">{(() => { const Icono = modulos.find((modulo) => modulo.id === pagina)?.icono ?? Package; return <Icono className="h-7 w-7" /> })()}</div>
              <h2 className="text-3xl font-bold text-[#3c5968]">{moduloPendiente.titulo}</h2>
              <p className="mt-3 max-w-xl text-slate-500">{moduloPendiente.descripcion}</p>
              <div className="mt-8 rounded-xl border border-dashed border-[#b9d6e0] bg-[#f5fafc] p-5 text-sm text-[#52798a]">
                Módulo preparado para el siguiente pase de desarrollo.
              </div>
            </section>
          ) : (
            <>
              <div className="flex items-start gap-4">
                <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-[#e5f2f6] text-[#6095aa] sm:flex"><Store className="h-7 w-7" /></div>
                <div>
                  <h2 className="mt-1 text-3xl font-bold text-[#3c5968]">¡Bienvenido a Farmacia Medina!</h2>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { titulo: 'Ventas de hoy', valor: '$0.00', detalle: 'Sin ventas registradas', icono: CircleDollarSign, color: 'bg-[#e9f7f1] text-[#3d9877]' },
                  { titulo: 'Productos registrados', valor: '0', detalle: 'Catálogo activo', icono: Package, color: 'bg-[#e5f2f6] text-[#6095aa]' },
                  { titulo: 'Stock bajo', valor: '0', detalle: 'Todo en orden', icono: AlertTriangle, color: 'bg-[#fff7e6] text-[#b18435]' },
                  { titulo: 'Próximas caducidades', valor: '0', detalle: 'Sin alertas', icono: CalendarDays, color: 'bg-[#f9eef0] text-[#b06b76]' }
                ].map((tarjeta) => (
                  <div key={tarjeta.titulo} className="rounded-2xl border border-[#dce8ed] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{tarjeta.titulo}</p><h3 className="mt-2 text-2xl font-bold text-[#3c5968]">{tarjeta.valor}</h3></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tarjeta.color}`}><tarjeta.icono className="h-5 w-5" strokeWidth={1.8} /></span></div>
                    <p className="mt-3 text-xs text-slate-400">{tarjeta.detalle}</p>
                  </div>
                ))}
              </div>

              <section className="mt-6 rounded-2xl border border-[#dce8ed] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-xl font-bold text-[#3c5968]">Productos recientes</h3><p className="mt-1 text-sm text-slate-400">Los medicamentos aparecerán aquí al registrarlos.</p></div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPagina('entradas')} className="flex items-center gap-2 rounded-xl border border-[#b9d6e0] px-4 py-2 text-sm font-medium text-[#52798a] hover:bg-[#f5fafc]"><Download className="h-4 w-4" /> Registrar entrada</button>
                    <button type="button" onClick={() => setPagina('inventario')} className="flex items-center gap-2 rounded-xl bg-[#079db7] px-4 py-2 text-sm font-medium text-white hover:bg-[#078da5]"><Plus className="h-4 w-4" /> Nuevo producto</button>
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-xl border border-[#e1ebef]">
                  <div className="grid grid-cols-4 bg-[#f3f8fa] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"><span>Código</span><span>Medicamento</span><span>Categoría</span><span>Estado</span></div>
                  <div className="px-4 py-10 text-center text-sm text-slate-400">No hay medicamentos registrados todavía.</div>
                </div>
              </section>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-[#dce8ed] bg-white p-5 shadow-sm"><h3 className="text-xl font-bold text-[#3c5968]">Resumen de ventas</h3><p className="mt-1 text-sm text-slate-400">Tus ventas semanales aparecerán aquí.</p><div className="mt-5 flex h-28 items-center justify-center rounded-xl bg-[#f7fafb] text-sm text-slate-400">Aún no hay datos para mostrar</div></section>
                <section className="rounded-2xl border border-[#dce8ed] bg-white p-5 shadow-sm"><h3 className="text-xl font-bold text-[#3c5968]">Alertas de inventario</h3><p className="mt-1 text-sm text-slate-400">Productos que requieren tu atención.</p><div className="mt-5 flex h-28 items-center justify-center rounded-xl bg-[#f7fafb] text-sm text-slate-400">No hay alertas pendientes</div></section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
