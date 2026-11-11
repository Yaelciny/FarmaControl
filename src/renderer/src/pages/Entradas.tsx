import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, PackagePlus, Pencil, Plus, RotateCcw, Search, X } from 'lucide-react'
import type { CrearEntrada, Entrada, Producto, Proveedor } from '../../../preload/global'

const formularioInicial = {
  producto_id: '',
  proveedor_id: '',
  numero_lote: '',
  fecha_caducidad: '',
  costo_unitario: '',
  cantidad: ''
}

function Entradas(): React.JSX.Element {
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [formulario, setFormulario] = useState(formularioInicial)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)

  async function cargarDatos(): Promise<void> {
    const [entradasCargadas, productosCargados, proveedoresCargados] = await Promise.all([
      window.api.entradas.listar(),
      window.api.productos.listar(),
      window.api.proveedores.listar()
    ])
    setEntradas(entradasCargadas)
    setProductos(productosCargados.filter((producto) => producto.activo === 1))
    setProveedores(proveedoresCargados.filter((proveedor) => proveedor.activo === 1))
  }

  useEffect(() => {
    let activo = true
    Promise.all([window.api.entradas.listar(), window.api.productos.listar(), window.api.proveedores.listar()])
      .then(([entradasCargadas, productosCargados, proveedoresCargados]) => {
        if (!activo) return
        setEntradas(entradasCargadas)
        setProductos(productosCargados.filter((producto) => producto.activo === 1))
        setProveedores(proveedoresCargados.filter((proveedor) => proveedor.activo === 1))
      })
      .catch((err: unknown) => {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudieron cargar las entradas')
      })
    return () => {
      activo = false
    }
  }, [])

  function cerrarModal(): void {
    setModalAbierto(false)
    setEditandoId(null)
    setFormulario(formularioInicial)
    setError('')
  }

  async function guardarEntrada(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError('')
    const costo = Number(formulario.costo_unitario)
    const cantidad = Number(formulario.cantidad)

    if (!Number.isFinite(costo) || costo < 0) {
      setError('Ingresa un costo de compra válido')
      return
    }
    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
      setError('Ingresa una cantidad entera mayor a cero')
      return
    }

    const datos: CrearEntrada = {
      producto_id: Number(formulario.producto_id),
      proveedor_id: Number(formulario.proveedor_id),
      numero_lote: formulario.numero_lote.trim(),
      fecha_caducidad: formulario.fecha_caducidad,
      costo_unitario_centavos: Math.round(costo * 100),
      cantidad
    }

    try {
      setCargando(true)
      if (editandoId === null) {
        await window.api.entradas.crear(datos)
      } else {
        await window.api.entradas.actualizar({ ...datos, movimiento_id: editandoId })
      }
      cerrarModal()
      await cargarDatos()
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo registrar la entrada'
      setError(mensaje.includes('UNIQUE') ? 'Ese lote ya está registrado para el medicamento seleccionado' : mensaje)
    } finally {
      setCargando(false)
    }
  }

  function editarEntrada(entrada: Entrada): void {
    if (entrada.tiene_salidas === 1 || entrada.cancelado === 1) return
    setEditandoId(entrada.movimiento_id)
    setFormulario({
      producto_id: String(entrada.producto_id),
      proveedor_id: String(entrada.proveedor_id),
      numero_lote: entrada.numero_lote,
      fecha_caducidad: entrada.fecha_caducidad,
      costo_unitario: (entrada.costo_unitario_centavos / 100).toFixed(2),
      cantidad: String(entrada.cantidad)
    })
    setError('')
    setModalAbierto(true)
  }

  async function cancelarEntrada(entrada: Entrada): Promise<void> {
    if (entrada.tiene_salidas === 1 || entrada.cancelado === 1) return
    if (!window.confirm(`¿Cancelar la entrada del lote “${entrada.numero_lote}”? El stock se revertirá.`)) return

    try {
      setError('')
      await window.api.entradas.cancelar(entrada.movimiento_id)
      await cargarDatos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la entrada')
    }
  }

  const filtradas = entradas.filter((entrada) =>
    `${entrada.producto_nombre} ${entrada.proveedor_nombre} ${entrada.numero_lote}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  )

  const hoy = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#168a8a]">Operación</p>
        <h2 className="mt-1 text-3xl font-bold text-[#334952]">Entradas de mercancía</h2>
        <p className="mt-2 max-w-2xl text-gray-500">Registra los medicamentos que llegan a la farmacia para aumentar existencias y conservar el control por lote.</p>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2d33]/55 p-4 backdrop-blur-[2px]">
          <form onSubmit={(event) => void guardarEntrada(event)} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between border-b border-[#e1e7e8] pb-4">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-[#168a8a]">Control de existencias</p><h3 className="mt-1 text-2xl font-semibold text-[#334952]">{editandoId === null ? 'Registrar entrada' : 'Editar entrada'}</h3><p className="mt-1 text-sm text-slate-500">{editandoId === null ? 'La cantidad registrada aumentará el stock del lote seleccionado.' : 'Solo se pueden editar entradas que aún no tengan salidas.'}</p></div>
              <button type="button" onClick={cerrarModal} aria-label="Cerrar ventana" className="rounded-xl p-2 text-slate-400 hover:bg-[#f1f4f5]"><X className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              <label className="space-y-1"><span className="text-sm font-medium text-gray-700">Medicamento <b className="text-[#d35d68]">*</b></span><select required value={formulario.producto_id} onChange={(event) => setFormulario({ ...formulario, producto_id: event.target.value })} className="w-full rounded-lg border border-[#d1dcdf] bg-white p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"><option value="">Selecciona un medicamento</option>{productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre} — {producto.codigo_barras}</option>)}</select></label>
              <label className="space-y-1"><span className="text-sm font-medium text-gray-700">Proveedor <b className="text-[#d35d68]">*</b></span><select required value={formulario.proveedor_id} onChange={(event) => setFormulario({ ...formulario, proveedor_id: event.target.value })} className="w-full rounded-lg border border-[#d1dcdf] bg-white p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"><option value="">Selecciona un proveedor</option>{proveedores.map((proveedor) => <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>)}</select></label>
              <label className="space-y-1"><span className="text-sm font-medium text-gray-700">Número de lote <b className="text-[#d35d68]">*</b></span><input required placeholder="Ej. PAR-2026-01" value={formulario.numero_lote} onChange={(event) => setFormulario({ ...formulario, numero_lote: event.target.value })} className="w-full rounded-lg border border-[#d1dcdf] p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]" /></label>
              <label className="space-y-1"><span className="text-sm font-medium text-gray-700">Fecha de caducidad <b className="text-[#d35d68]">*</b></span><div className="relative"><input required type="date" min={hoy} value={formulario.fecha_caducidad} onChange={(event) => setFormulario({ ...formulario, fecha_caducidad: event.target.value })} className="w-full rounded-lg border border-[#d1dcdf] p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]" /><CalendarDays className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" /></div></label>
              <label className="space-y-1"><span className="text-sm font-medium text-gray-700">Costo unitario (MXN) <b className="text-[#d35d68]">*</b></span><input required type="number" min="0" step="0.01" placeholder="Ej. 18.00" value={formulario.costo_unitario} onChange={(event) => setFormulario({ ...formulario, costo_unitario: event.target.value })} className="w-full rounded-lg border border-[#d1dcdf] p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]" /></label>
              <label className="space-y-1"><span className="text-sm font-medium text-gray-700">Cantidad recibida <b className="text-[#d35d68]">*</b></span><input required type="number" min="1" step="1" placeholder="Ej. 50" value={formulario.cantidad} onChange={(event) => setFormulario({ ...formulario, cantidad: event.target.value })} className="w-full rounded-lg border border-[#d1dcdf] p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]" /></label>
            </div>

            {error && <p className="mt-4 rounded-lg bg-[#fff5f5] p-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-3 border-t border-[#e1e7e8] pt-4"><button type="button" onClick={cerrarModal} className="rounded-xl border border-[#c5d4d7] px-5 py-2.5 text-sm font-medium text-[#527070] hover:bg-[#f7fbfb]">Cancelar</button><button type="submit" disabled={cargando} className="flex items-center gap-2 rounded-xl bg-[#18a7a7] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#168f8f] disabled:opacity-50"><PackagePlus className="h-4 w-4" />{cargando ? 'Guardando...' : editandoId === null ? 'Registrar entrada' : 'Guardar cambios'}</button></div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex min-w-[280px] flex-1 items-center gap-3 rounded-xl border border-[#d1dcdf] px-4 py-2.5 text-sm text-slate-400 focus-within:border-[#18a7a7]"><Search className="h-5 w-5" /><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por medicamento, proveedor o lote..." className="min-w-0 flex-1 outline-none" /></div><button type="button" onClick={() => { setError(''); setModalAbierto(true) }} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#18a7a7] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#168f8f]"><Plus className="h-4 w-4" /> Registrar entrada</button></div></div>

      <div className="overflow-hidden rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm"><div className="mb-4 flex justify-end"><span className="text-xs text-slate-500">{filtradas.length} entradas</span></div><div className="overflow-x-auto"><table className="min-w-[1150px] w-full text-left text-sm"><thead className="bg-[#f5f7f7] text-[11px] uppercase tracking-wide text-[#6b7d83]"><tr><th className="px-4 py-3 font-semibold">Medicamento</th><th className="px-4 py-3 font-semibold">Proveedor</th><th className="px-4 py-3 font-semibold">Lote</th><th className="px-4 py-3 font-semibold">Caducidad</th><th className="px-4 py-3 font-semibold">Cantidad</th><th className="px-4 py-3 font-semibold">Costo unitario</th><th className="px-4 py-3 font-semibold">Estado</th><th className="px-4 py-3 font-semibold">Acciones</th></tr></thead><tbody className="divide-y divide-[#edf0f1]">{filtradas.map((entrada) => <tr key={entrada.id} className="hover:bg-[#fbfdfd]"><td className="px-4 py-4 font-semibold text-[#334952]">{entrada.producto_nombre}</td><td className="px-4 py-4 text-slate-600">{entrada.proveedor_nombre}</td><td className="px-4 py-4 font-mono text-xs text-slate-500">{entrada.numero_lote}</td><td className="px-4 py-4 text-slate-600">{entrada.fecha_caducidad}</td><td className="px-4 py-4 font-semibold text-[#29835f]">+{entrada.cantidad}</td><td className="px-4 py-4 text-slate-600">${(entrada.costo_unitario_centavos / 100).toFixed(2)}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entrada.cancelado === 1 ? 'bg-slate-100 text-slate-500' : entrada.tiene_salidas === 1 ? 'bg-[#fff7e6] text-[#b18435]' : 'bg-[#e5f7ef] text-[#29835f]'}`}>{entrada.cancelado === 1 ? 'Cancelada' : entrada.tiene_salidas === 1 ? 'Con salidas' : 'Registrada'}</span></td><td className="px-4 py-4"><div className="flex gap-1"><button type="button" disabled={entrada.tiene_salidas === 1 || entrada.cancelado === 1} onClick={() => editarEntrada(entrada)} title="Editar entrada" className="flex items-center gap-1 rounded-lg bg-[#e4f1f1] px-2.5 py-1.5 text-xs font-semibold text-[#168a8a] disabled:cursor-not-allowed disabled:opacity-40"><Pencil className="h-3 w-3" /> Editar</button><button type="button" disabled={entrada.tiene_salidas === 1 || entrada.cancelado === 1} onClick={() => void cancelarEntrada(entrada)} title="Cancelar entrada" className="flex items-center gap-1 rounded-lg bg-[#fff0f0] px-2.5 py-1.5 text-xs font-semibold text-[#b06b76] disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw className="h-3 w-3" /> Cancelar</button></div></td></tr>)}</tbody></table>{filtradas.length === 0 && <p className="py-8 text-center text-gray-500">No se encontraron entradas registradas.</p>}</div></div>
    </div>
  )
}

export default Entradas
