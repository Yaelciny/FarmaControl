import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Power, Search, Trash2, X } from 'lucide-react'
import type { DatosProveedor, Proveedor } from '../../../preload/global'

const formularioInicial: DatosProveedor = {
  nombre: '',
  contacto: '',
  telefono: '',
  correo: '',
  rfc: '',
  direccion: ''
}

function Proveedores(): React.JSX.Element {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [formulario, setFormulario] = useState<DatosProveedor>(formularioInicial)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function cargarProveedores(): Promise<void> {
    try {
      setProveedores(await window.api.proveedores.listar())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los proveedores')
    }
  }

  useEffect(() => {
    let activo = true

    window.api.proveedores
      .listar()
      .then((datos) => {
        if (activo) setProveedores(datos)
      })
      .catch((err: unknown) => {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudieron cargar los proveedores')
      })

    return () => {
      activo = false
    }
  }, [])

  async function guardarProveedor(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError('')

    try {
      setCargando(true)
      if (editandoId === null) {
        await window.api.proveedores.crear(formulario)
      } else {
        await window.api.proveedores.actualizar({ ...formulario, id: editandoId })
      }
      cerrarModal()
      await cargarProveedores()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el proveedor')
    } finally {
      setCargando(false)
    }
  }

  function cerrarModal(): void {
    setModalAbierto(false)
    setEditandoId(null)
    setFormulario(formularioInicial)
    setError('')
  }

  function abrirNuevo(): void {
    setEditandoId(null)
    setFormulario(formularioInicial)
    setError('')
    setModalAbierto(true)
  }

  function editarProveedor(proveedor: Proveedor): void {
    setEditandoId(proveedor.id)
    setFormulario({
      nombre: proveedor.nombre,
      contacto: proveedor.contacto ?? '',
      telefono: proveedor.telefono ?? '',
      correo: proveedor.correo ?? '',
      rfc: proveedor.rfc ?? '',
      direccion: proveedor.direccion ?? ''
    })
    setError('')
    setModalAbierto(true)
  }

  async function cambiarEstado(proveedor: Proveedor): Promise<void> {
    const accion = proveedor.activo === 1 ? 'desactivar' : 'activar'
    if (!window.confirm(`¿Deseas ${accion} “${proveedor.nombre}”?`)) return
    try {
      await window.api.proveedores.cambiarEstado(proveedor.id, proveedor.activo !== 1)
      await cargarProveedores()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado')
    }
  }

  async function eliminarProveedor(proveedor: Proveedor): Promise<void> {
    if (!window.confirm(`¿Eliminar definitivamente “${proveedor.nombre}”?`)) return
    try {
      await window.api.proveedores.eliminar(proveedor.id)
      await cargarProveedores()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el proveedor')
    }
  }

  const filtrados = proveedores.filter((proveedor) =>
    `${proveedor.nombre} ${proveedor.contacto ?? ''} ${proveedor.telefono ?? ''} ${proveedor.correo ?? ''}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#168a8a]">Administración</p>
        <h2 className="mt-1 text-3xl font-bold text-[#334952]">Proveedores</h2>
        <p className="mt-2 max-w-2xl text-gray-500">Registra y administra los distribuidores que surten a Farmacia Medina.</p>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2d33]/55 p-4 backdrop-blur-[2px]">
          <form onSubmit={(event) => void guardarProveedor(event)} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between border-b border-[#e1e7e8] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#168a8a]">Directorio de proveedores</p>
                <h3 className="mt-1 text-2xl font-semibold text-[#334952]">{editandoId === null ? 'Nuevo proveedor' : 'Editar proveedor'}</h3>
                <p className="mt-1 text-sm text-slate-500">El proveedor quedará disponible para registrar entradas de mercancía.</p>
              </div>
              <button type="button" onClick={cerrarModal} aria-label="Cerrar ventana" className="rounded-xl p-2 text-slate-400 hover:bg-[#f1f4f5]"><X className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              {[
                { campo: 'nombre', titulo: 'Nombre del proveedor', ejemplo: 'Ej. Distribuidora Farmacéutica del Centro', obligatorio: true },
                { campo: 'contacto', titulo: 'Persona de contacto', ejemplo: 'Ej. María López' },
                { campo: 'telefono', titulo: 'Teléfono', ejemplo: 'Ej. 477 123 4567' },
                { campo: 'correo', titulo: 'Correo electrónico', ejemplo: 'Ej. ventas@distribuidora.com' },
                { campo: 'rfc', titulo: 'RFC', ejemplo: 'Ej. DFC010203AB1' },
                { campo: 'direccion', titulo: 'Dirección', ejemplo: 'Ej. Av. Central #123, León, Guanajuato' }
              ].map(({ campo, titulo, ejemplo, obligatorio }) => (
                <label key={campo} className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">{titulo}{obligatorio && <b className="text-[#d35d68]"> *</b>}</span>
                  <input
                    className="w-full rounded-lg border border-[#d1dcdf] p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
                    placeholder={ejemplo}
                    required={obligatorio}
                    value={formulario[campo as keyof DatosProveedor] ?? ''}
                    onChange={(event) => setFormulario({ ...formulario, [campo]: event.target.value })}
                  />
                </label>
              ))}
            </div>

            {error && <p className="mt-4 rounded-lg bg-[#fff5f5] p-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-3 border-t border-[#e1e7e8] pt-4">
              <button type="button" onClick={cerrarModal} className="rounded-xl border border-[#c5d4d7] px-5 py-2.5 text-sm font-medium text-[#527070] hover:bg-[#f7fbfb]">Cancelar</button>
              <button type="submit" disabled={cargando} className="rounded-xl bg-[#18a7a7] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#168f8f] disabled:opacity-50">{cargando ? 'Guardando...' : 'Guardar proveedor'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-[280px] flex-1 items-center gap-3 rounded-xl border border-[#d1dcdf] px-4 py-2.5 text-sm text-slate-400 focus-within:border-[#18a7a7]">
            <Search className="h-5 w-5" />
            <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre, contacto o teléfono..." className="min-w-0 flex-1 outline-none" />
          </div>
          <button type="button" onClick={abrirNuevo} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#18a7a7] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#168f8f]"><Plus className="h-4 w-4" /> Registrar proveedor</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
        <div className="mb-4 flex justify-end"><span className="text-xs text-slate-500">{filtrados.length} proveedores</span></div>
        <div className="overflow-x-auto">
          <table className="min-w-[950px] w-full text-left text-sm">
            <thead className="bg-[#f5f7f7] text-[11px] uppercase tracking-wide text-[#6b7d83]"><tr>
              <th className="px-4 py-3 font-semibold">Proveedor</th><th className="px-4 py-3 font-semibold">Contacto</th><th className="px-4 py-3 font-semibold">Teléfono</th><th className="px-4 py-3 font-semibold">Correo</th><th className="px-4 py-3 font-semibold">Estado</th><th className="px-4 py-3 font-semibold">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-[#edf0f1]">
              {filtrados.map((proveedor) => (
                <tr key={proveedor.id} className="transition hover:bg-[#fbfdfd]">
                  <td className="px-4 py-4"><p className="font-semibold text-[#334952]">{proveedor.nombre}</p><p className="mt-0.5 text-xs text-slate-400">{proveedor.rfc || 'RFC no registrado'}</p></td>
                  <td className="px-4 py-4 text-slate-600">{proveedor.contacto || '—'}</td><td className="px-4 py-4 text-slate-600">{proveedor.telefono || '—'}</td><td className="px-4 py-4 text-slate-600">{proveedor.correo || '—'}</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${proveedor.activo === 1 ? 'bg-[#e5f7ef] text-[#29835f]' : 'bg-slate-100 text-slate-500'}`}>{proveedor.activo === 1 ? 'Activo' : 'Desactivado'}</span></td>
                  <td className="px-4 py-4"><div className="flex flex-wrap gap-1"><button type="button" onClick={() => editarProveedor(proveedor)} className="flex items-center gap-1.5 rounded-lg bg-[#e4f1f1] px-3 py-2 text-xs font-semibold text-[#168a8a] hover:bg-[#cfe8e8]"><Pencil className="h-3.5 w-3.5" /> Editar</button><button type="button" onClick={() => void cambiarEstado(proveedor)} className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold ${proveedor.activo === 1 ? 'bg-[#fff0f0] text-[#b06b76]' : 'bg-[#edf2f3] text-[#527070]'}`}><Power className="h-3 w-3" /> {proveedor.activo === 1 ? 'Desactivar' : 'Activar'}</button><button type="button" onClick={() => void eliminarProveedor(proveedor)} className="flex items-center gap-1 rounded-md bg-[#fff0f0] px-2 py-1.5 text-[11px] font-semibold text-[#b06b76]"><Trash2 className="h-3 w-3" /> Eliminar</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtrados.length === 0 && <p className="py-8 text-center text-gray-500">No se encontraron proveedores.</p>}
        </div>
      </div>
    </div>
  )
}

export default Proveedores
