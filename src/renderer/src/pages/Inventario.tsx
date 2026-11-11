import { useEffect, useState, type FormEvent } from "react"
import { Pencil, Plus, Power, Trash2, X } from "lucide-react"
import type { Producto } from "../../../preload/global"

const formularioInicial = {
  codigo_barras: "",
  nombre: "",
  categoria: "",
  presentacion: "",
  otra_presentacion: "",
  precio_venta: "",
  stock_minimo: "5"
}

const presentacionesDisponibles = [
  "Caja",
  "Blíster",
  "Frasco",
  "Tubo",
  "Ampolleta",
  "Sobre",
  "Pieza"
]

function Inventario(): React.JSX.Element {
  const [productos, setProductos] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [formulario, setFormulario] = useState(formularioInicial)
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  async function cargarProductos(): Promise<void> {
    try {
      const datos = await window.api.productos.listar()
      setProductos(datos)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar productos")
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
          setError(
            err instanceof Error ? err.message : "Error al cargar productos"
          )
        }
      })

    return () => {
      activo = false
    }
  }, [])

  async function guardarProducto(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault()
    setError("")

    const precio = Number(formulario.precio_venta)
    const stockMinimo = Number(formulario.stock_minimo)
    const presentacion =
      formulario.presentacion === "Otro"
        ? formulario.otra_presentacion.trim()
        : formulario.presentacion.trim()

    if (
      formulario.precio_venta.trim() === "" ||
      !Number.isFinite(precio) ||
      precio < 0 ||
      !Number.isSafeInteger(Math.round(precio * 100))
    ) {
      setError("Ingresa un precio válido")
      return
    }

    if (
      formulario.stock_minimo.trim() === "" ||
      !Number.isSafeInteger(stockMinimo) ||
      stockMinimo < 0
    ) {
      setError("Ingresa un stock mínimo válido")
      return
    }

    if (formulario.presentacion === "Otro" && presentacion === "") {
      setError("Especifica la presentación del medicamento")
      return
    }

    try {
      setCargando(true)

      const datos = {
        codigo_barras: formulario.codigo_barras.trim() || null,
        nombre: formulario.nombre.trim(),
        categoria: formulario.categoria.trim() || null,
        presentacion: presentacion || null,
        precio_venta_centavos: Math.round(precio * 100),
        stock_minimo: stockMinimo
      }

      if (editandoId === null) {
        await window.api.productos.crear(datos)
      } else {
        await window.api.productos.actualizar({ ...datos, id: editandoId })
      }

      setFormulario(formularioInicial)
      setEditandoId(null)
      setModalAbierto(false)
      await cargarProductos()
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "No se pudo guardar el producto"
      setError(
        mensaje.includes("UNIQUE")
          ? "Ese código de barras ya está registrado"
          : mensaje
      )
    } finally {
      setCargando(false)
    }
  }

  const filtrados = productos.filter((producto) => {
    const coincideBusqueda =
      `${producto.nombre} ${producto.codigo_barras ?? ""} ${producto.categoria ?? ""}`
        .toLowerCase()
        .includes(busqueda.toLowerCase())

    return coincideBusqueda
  })

  function editarProducto(producto: Producto): void {
    const presentacionEspecifica = producto.presentacion ?? ""
    const esPresentacionConocida = presentacionesDisponibles.includes(
      presentacionEspecifica
    )

    setEditandoId(producto.id)
    setFormulario({
      codigo_barras: producto.codigo_barras ?? "",
      nombre: producto.nombre,
      categoria: producto.categoria ?? "",
      presentacion: esPresentacionConocida
        ? presentacionEspecifica
        : presentacionEspecifica
          ? "Otro"
          : "",
      otra_presentacion: esPresentacionConocida ? "" : presentacionEspecifica,
      precio_venta: (producto.precio_venta_centavos / 100).toFixed(2),
      stock_minimo: String(producto.stock_minimo)
    })
    setError("")
    setModalAbierto(true)
  }

  async function cambiarEstado(producto: Producto): Promise<void> {
    const accion = producto.activo === 1 ? "desactivar" : "activar"
    if (!window.confirm(`¿Deseas ${accion} “${producto.nombre}”?`)) return

    try {
      setError("")
      await window.api.productos.cambiarEstado(
        producto.id,
        producto.activo !== 1
      )
      await cargarProductos()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cambiar el estado"
      )
    }
  }

  async function eliminarProducto(producto: Producto): Promise<void> {
    if (
      !window.confirm(
        `¿Eliminar definitivamente “${producto.nombre}”? Esta acción no se puede deshacer.`
      )
    )
      return

    try {
      setError("")
      await window.api.productos.eliminar(producto.id)
      await cargarProductos()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el medicamento"
      )
    }
  }

  function cancelarEdicion(): void {
    setEditandoId(null)
    setFormulario(formularioInicial)
    setError("")
    setModalAbierto(false)
  }

  function abrirNuevo(): void {
    setEditandoId(null)
    setFormulario(formularioInicial)
    setError("")
    setModalAbierto(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#168a8a]">
          Catálogo de productos
        </p>
        <h2 className="mt-1 text-3xl font-bold text-[#334952]">Inventario</h2>
        <p className="mt-2 max-w-2xl text-gray-500">
          Da de alta los medicamentos en el catálogo antes de que lleguen a la
          farmacia. Las existencias se registran después desde Entradas de
          mercancía.
        </p>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2d33]/55 p-4 backdrop-blur-[2px]">
          <form
            onSubmit={(event) => void guardarProducto(event)}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#e1e7e8] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#168a8a]">
                  Catálogo de productos
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-[#334952]">
                  {editandoId === null
                    ? "Registrar medicamento"
                    : "Editar medicamento"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Registra la información base del medicamento. La cantidad
                  disponible se agregará después al registrar una entrada.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelarEdicion}
                aria-label="Cerrar ventana"
                className="rounded-xl p-2 text-slate-400 hover:bg-[#f1f4f5] hover:text-[#334952]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  campo: "nombre",
                  titulo: "Nombre del medicamento",
                  ejemplo: "Ej. Paracetamol 500 mg"
                },
                {
                  campo: "codigo_barras",
                  titulo: "Código de barras",
                  ejemplo: "Ej. 7501234567890"
                },
                {
                  campo: "categoria",
                  titulo: "Categoría",
                  ejemplo: "Ej. Analgésicos"
                },
                {
                  campo: "precio_venta",
                  titulo: "Precio de venta (MXN)",
                  ejemplo: "Ej. 25.50"
                },
                {
                  campo: "stock_minimo",
                  titulo: "Stock mínimo para alerta",
                  ejemplo: "Ej. 5"
                }
              ].map(({ campo, titulo, ejemplo }) => (
                <label key={campo} className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">
                    {titulo} <b className="text-[#d35d68]">*</b>
                  </span>
                  <input
                    className="w-full rounded-lg border border-[#d1dcdf] p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
                    type={
                      campo === "precio_venta" || campo === "stock_minimo"
                        ? "number"
                        : "text"
                    }
                    step={campo === "precio_venta" ? "0.01" : "1"}
                    min={
                      campo === "precio_venta" || campo === "stock_minimo"
                        ? "0"
                        : undefined
                    }
                    placeholder={ejemplo}
                    required
                    value={formulario[campo as keyof typeof formulario]}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        [campo]: event.target.value
                      })
                    }
                  />
                  {campo === "stock_minimo" && (
                    <span className="block text-xs text-slate-400">
                      Cuando las existencias lleguen a esta cantidad, se
                      mostrará una alerta.
                    </span>
                  )}
                </label>
              ))}

              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">
                  Presentación <b className="text-[#d35d68]">*</b>
                </span>
                <select
                  className="w-full rounded-lg border border-[#d1dcdf] bg-white p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
                  required
                  value={formulario.presentacion}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      presentacion: event.target.value,
                      otra_presentacion:
                        event.target.value === "Otro"
                          ? formulario.otra_presentacion
                          : ""
                    })
                  }
                >
                  <option value="">Selecciona una presentación</option>
                  {presentacionesDisponibles.map((presentacionDisponible) => (
                    <option
                      key={presentacionDisponible}
                      value={presentacionDisponible}
                    >
                      {presentacionDisponible}
                    </option>
                  ))}
                  <option value="Otro">Otro</option>
                </select>
              </label>

              {formulario.presentacion === "Otro" && (
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700">
                    Especifica la presentación
                  </span>
                  <input
                    className="w-full rounded-lg border border-[#d1dcdf] p-2.5 text-slate-700 outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
                    type="text"
                    placeholder="Ej. Bolsa con 10 unidades"
                    value={formulario.otra_presentacion}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        otra_presentacion: event.target.value
                      })
                    }
                    required
                  />
                </label>
              )}
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-[#fff5f5] p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3 border-t border-[#e1e7e8] pt-4">
              <button
                type="button"
                onClick={cancelarEdicion}
                className="rounded-xl border border-[#c5d4d7] px-5 py-2.5 text-sm font-medium text-[#527070] hover:bg-[#f7fbfb]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="rounded-xl bg-[#18a7a7] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#168f8f] disabled:opacity-50"
              >
                {cargando
                  ? "Guardando..."
                  : editandoId === null
                    ? "Guardar medicamento"
                    : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-[#334952]">
              Medicamentos registrados
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Consulta y administra el catálogo de la farmacia.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar medicamento..."
              className="rounded-xl border border-[#d1dcdf] p-2.5 text-sm outline-[#18a7a7] focus:border-[#18a7a7] focus:ring-2 focus:ring-[#d9eeee]"
            />
            <button
              type="button"
              onClick={abrirNuevo}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[#18a7a7] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#168f8f]"
            >
              <Plus className="h-4 w-4" /> Registrar medicamento
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-[#f5f7f7] text-[11px] uppercase tracking-wide text-[#6b7d83]">
              <tr>
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Medicamento</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Presentación</th>
                <th className="px-4 py-3 font-semibold">Precio</th>
                <th className="px-4 py-3 font-semibold">Existencias</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f1]">
              {filtrados.map((producto) => (
                <tr key={producto.id} className="transition hover:bg-[#fbfdfd]">
                  <td className="px-4 py-4 font-mono text-xs text-slate-500">
                    {producto.codigo_barras || "Sin código"}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[#334952]">
                      {producto.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Medicamento registrado
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {producto.categoria ? (
                      <span className="rounded-full bg-[#edf4f4] px-2.5 py-1 text-xs font-medium text-[#527070]">
                        {producto.categoria}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {producto.presentacion || "—"}
                  </td>
                  <td className="px-4 py-4 font-semibold text-[#334952]">
                    ${(producto.precio_venta_centavos / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${producto.stock_actual <= producto.stock_minimo ? "bg-[#fff7e6] text-[#b18435]" : "bg-[#e9f7f1] text-[#29835f]"}`}
                    >
                      {producto.stock_actual}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      mín. {producto.stock_minimo}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${producto.activo === 1 ? "bg-[#e5f7ef] text-[#29835f]" : "bg-slate-100 text-slate-500"}`}
                    >
                      {producto.activo === 1 ? "Activo" : "Desactivado"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => editarProducto(producto)}
                        title="Editar medicamento"
                        aria-label={`Editar ${producto.nombre}`}
                        className="flex items-center gap-1.5 rounded-lg bg-[#e4f1f1] px-3 py-2 text-xs font-semibold text-[#168a8a] transition hover:bg-[#cfe8e8]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void cambiarEstado(producto)}
                        title={
                          producto.activo === 1
                            ? "Desactivar medicamento"
                            : "Activar medicamento"
                        }
                        aria-label={`${producto.activo === 1 ? "Desactivar" : "Activar"} ${producto.nombre}`}
                        className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${producto.activo === 1 ? "bg-[#fff0f0] text-[#b06b76] hover:bg-[#f9dddd]" : "bg-[#edf2f3] text-[#527070] hover:bg-[#dfe9ea]"}`}
                      >
                        <Power className="h-3 w-3" />{" "}
                        {producto.activo === 1 ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void eliminarProducto(producto)}
                        title="Eliminar medicamento"
                        aria-label={`Eliminar ${producto.nombre}`}
                        className="flex items-center gap-1 rounded-md bg-[#fff0f0] px-2 py-1.5 text-[11px] font-semibold text-[#b06b76] transition hover:bg-[#f9dddd]"
                      >
                        <Trash2 className="h-3 w-3" /> Eliminar
                      </button>
                    </div>
                  </td>
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
