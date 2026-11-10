
import { useEffect, useState, type FormEvent } from 'react'
import type { Producto } from '../../../preload/global'

const formularioInicial = {
  codigo_barras: '',
  nombre: '',
  categoria: '',
  presentacion: '',
  precio_venta: '',
  stock_minimo: '5'
}

function Inventario(): React.JSX.Element {
  const [productos, setProductos] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [formulario, setFormulario] = useState(formularioInicial)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function cargarProductos(): Promise<void> {
    try {
      const datos = await window.api.productos.listar()
      setProductos(datos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos')
    }
  }

  useEffect(() => {
    let activo = true

    window.api.productos
      .listar()
      .then((datos) => {
        if (activo) setProductos(datos)
      })
      .catch((err: unknown) => {
        if (activo) {
          setError(err instanceof Error ? err.message : 'Error al cargar productos')
        }
      })

    return () => {
      activo = false
    }
  }, [])

  async function guardarProducto(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError('')

    const precio = Number(formulario.precio_venta)
    const stockMinimo = Number(formulario.stock_minimo)

    if (
      formulario.precio_venta.trim() === '' ||
      !Number.isFinite(precio) ||
      precio < 0 ||
      !Number.isSafeInteger(Math.round(precio * 100))
    ) {
      setError('Ingresa un precio válido')
      return
    }

    if (
      formulario.stock_minimo.trim() === '' ||
      !Number.isSafeInteger(stockMinimo) ||
      stockMinimo < 0
    ) {
      setError('Ingresa un stock mínimo válido')
      return
    }

    try {
      setCargando(true)

      await window.api.productos.crear({
        codigo_barras: formulario.codigo_barras.trim() || null,
        nombre: formulario.nombre.trim(),
        categoria: formulario.categoria.trim() || null,
        presentacion: formulario.presentacion.trim() || null,
        precio_venta_centavos: Math.round(precio * 100),
        stock_minimo: stockMinimo
      })

      setFormulario(formularioInicial)
      await cargarProductos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el producto')
    } finally {
      setCargando(false)
    }
  }

  const filtrados = productos.filter((producto) =>
    `${producto.nombre} ${producto.codigo_barras ?? ''}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#6095aa]">Catálogo de productos</p>
        <h2 className="mt-1 text-3xl font-bold text-[#3c5968]">Inventario</h2>
        <p className="mt-2 text-gray-500">
          Administra los medicamentos de la farmacia
        </p>
      </div>

      <form
        onSubmit={(event) => void guardarProducto(event)}
        className="rounded-2xl border border-[#dce8ed] bg-white p-6 shadow-sm"
      >
        <h3 className="mb-4 text-xl font-semibold text-[#3c5968]">Registrar medicamento</h3>

        <div className="grid grid-cols-2 gap-4">
          {[
            { campo: 'nombre', titulo: 'Nombre del medicamento' },
            { campo: 'codigo_barras', titulo: 'Código de barras' },
            { campo: 'categoria', titulo: 'Categoría' },
            { campo: 'presentacion', titulo: 'Presentación' },
            { campo: 'precio_venta', titulo: 'Precio de venta (MXN)' },
            { campo: 'stock_minimo', titulo: 'Stock mínimo' }
          ].map(({ campo, titulo }) => (
            <label key={campo} className="space-y-1">
              <span className="text-sm font-medium text-gray-700">{titulo}</span>
              <input
                 className="w-full rounded-lg border border-[#c9dce4] p-2.5 text-slate-700 outline-[#72aabd] focus:border-[#72aabd] focus:ring-2 focus:ring-[#e5f2f6]"
                type={
                  campo === 'precio_venta' || campo === 'stock_minimo'
                    ? 'number'
                    : 'text'
                }
                step={campo === 'precio_venta' ? '0.01' : '1'}
                min={campo === 'precio_venta' || campo === 'stock_minimo' ? '0' : undefined}
                required={campo === 'nombre' || campo === 'precio_venta'}
                value={formulario[campo as keyof typeof formulario]}
                onChange={(event) =>
                  setFormulario({
                    ...formulario,
                    [campo]: event.target.value
                  })
                }
              />
            </label>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="mt-5 rounded-xl bg-[#6095aa] px-5 py-3 font-medium text-white shadow-sm hover:bg-[#527f91] disabled:opacity-50"
        >
          {cargando ? 'Guardando...' : 'Guardar medicamento'}
        </button>
      </form>

      <div className="rounded-2xl border border-[#dce8ed] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold">Medicamentos registrados</h3>
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar medicamento..."
            className="rounded-lg border border-gray-300 p-2"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Presentación</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Stock mínimo</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((producto) => (
                <tr key={producto.id} className="border-b">
                  <td className="p-3">{producto.codigo_barras || '—'}</td>
                  <td className="p-3">{producto.nombre}</td>
                  <td className="p-3">{producto.categoria || '—'}</td>
                  <td className="p-3">{producto.presentacion || '—'}</td>
                  <td className="p-3">
                    ${(producto.precio_venta_centavos / 100).toFixed(2)}
                  </td>
                  <td className="p-3">{producto.stock_minimo}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtrados.length === 0 && (
            <p className="py-8 text-center text-gray-500">
              No se encontraron medicamentos.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Inventario
