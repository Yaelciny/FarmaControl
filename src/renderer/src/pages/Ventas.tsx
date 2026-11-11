import { useEffect, useState } from "react"
import {
  Banknote,
  CreditCard,
  Search,
  ShoppingCart,
  Trash2
} from "lucide-react"
import type { ProductoVenta } from "../../../preload/global"

interface ArticuloCarrito {
  producto: ProductoVenta
  cantidad: number
}

function Ventas(): React.JSX.Element {
  const [productos, setProductos] = useState<ProductoVenta[]>([])
  const [carrito, setCarrito] = useState<ArticuloCarrito[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [metodoPago, setMetodoPago] = useState<
    "efectivo" | "tarjeta" | "transferencia"
  >("efectivo")
  const [montoRecibido, setMontoRecibido] = useState("")
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")
  const [ventaExitosa, setVentaExitosa] = useState<number | null>(null)

  useEffect(() => {
    let activo = true
    window.api.ventas
      .productos("")
      .then((datos) => {
        if (activo) setProductos(datos)
      })
      .catch((err: unknown) => {
        if (activo)
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los productos"
          )
      })
    return () => {
      activo = false
    }
  }, [])

  async function buscarProductos(valor: string): Promise<void> {
    setBusqueda(valor)
    try {
      setProductos(await window.api.ventas.productos(valor))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron buscar los productos"
      )
    }
  }

  function agregarAlCarrito(producto: ProductoVenta): void {
    setError("")
    setVentaExitosa(null)
    setCarrito((actual) => {
      const existente = actual.find(
        (articulo) => articulo.producto.id === producto.id
      )
      if (existente) {
        if (existente.cantidad >= producto.stock_actual) {
          setError("No puedes agregar más unidades de las disponibles")
          return actual
        }
        return actual.map((articulo) =>
          articulo.producto.id === producto.id
            ? { ...articulo, cantidad: articulo.cantidad + 1 }
            : articulo
        )
      }
      return [...actual, { producto, cantidad: 1 }]
    })
  }

  function cambiarCantidad(productoId: number, cantidad: number): void {
    const articulo = carrito.find((item) => item.producto.id === productoId)
    if (!articulo) return
    const nuevaCantidad = Math.max(
      1,
      Math.min(cantidad, articulo.producto.stock_actual)
    )
    setCarrito((actual) =>
      actual.map((item) =>
        item.producto.id === productoId
          ? { ...item, cantidad: nuevaCantidad }
          : item
      )
    )
  }

  const totalCentavos = carrito.reduce(
    (total, articulo) =>
      total + articulo.producto.precio_venta_centavos * articulo.cantidad,
    0
  )
  const recibidoCentavos = Math.round(Number(montoRecibido || 0) * 100)
  const cambioCentavos =
    metodoPago === "efectivo"
      ? Math.max(0, recibidoCentavos - totalCentavos)
      : 0

  async function confirmarVenta(): Promise<void> {
    if (carrito.length === 0) {
      setError("Agrega al menos un medicamento al carrito")
      return
    }
    if (metodoPago === "efectivo" && recibidoCentavos < totalCentavos) {
      setError("El monto recibido es menor al total")
      return
    }

    try {
      setCargando(true)
      setError("")
      const resultado = await window.api.ventas.crear({
        articulos: carrito.map((articulo) => ({
          producto_id: articulo.producto.id,
          cantidad: articulo.cantidad
        })),
        metodo_pago: metodoPago,
        monto_recibido_centavos:
          metodoPago === "efectivo" ? recibidoCentavos : totalCentavos
      })
      setVentaExitosa(resultado.id)
      setCarrito([])
      setMontoRecibido("")
      await buscarProductos(busqueda)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo registrar la venta"
      )
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#168a8a]">Operación</p>
        <h2 className="mt-1 text-3xl font-bold text-[#334952]">
          Punto de venta
        </h2>
        <p className="mt-2 text-gray-500">
          Busca medicamentos, arma el carrito y registra el cobro.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-[#fff5f5] p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {ventaExitosa !== null && (
        <div className="rounded-xl bg-[#e5f7ef] p-3 text-sm font-medium text-[#29835f]">
          Venta #{ventaExitosa} registrada correctamente.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
          <label className="flex items-center gap-3 rounded-xl border border-[#d1dcdf] px-4 py-3 text-slate-400 focus-within:border-[#18a7a7]">
            <Search className="h-5 w-5" />
            <input
              autoFocus
              value={busqueda}
              onChange={(event) => void buscarProductos(event.target.value)}
              placeholder="Buscar por nombre o código de barras..."
              className="min-w-0 flex-1 outline-none"
            />
            <kbd className="hidden rounded-md bg-[#f5f7f7] px-2 py-1 text-xs sm:block">
              Ctrl + K
            </kbd>
          </label>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {productos.map((producto) => (
              <button
                key={producto.id}
                type="button"
                onClick={() => agregarAlCarrito(producto)}
                className="rounded-xl border border-[#e1e7e8] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#18a7a7] hover:bg-[#f7fbfb]"
              >
                <div className="flex items-start justify-between gap-2">
                  <PackageIcon />
                  <span className="rounded-full bg-[#e9f7f1] px-2 py-1 text-xs font-semibold text-[#29835f]">
                    {producto.stock_actual} disponibles
                  </span>
                </div>
                <p className="mt-3 font-semibold text-[#334952]">
                  {producto.nombre}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {producto.presentacion ?? "Sin presentación"}
                </p>
                <p className="mt-3 text-lg font-bold text-[#168a8a]">
                  ${(producto.precio_venta_centavos / 100).toFixed(2)}
                </p>
              </button>
            ))}
          </div>
          {productos.length === 0 && (
            <p className="py-12 text-center text-slate-400">
              No hay medicamentos disponibles para vender.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[#dce4e7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e1e7e8] pb-4">
            <h3 className="flex items-center gap-2 text-xl font-semibold text-[#334952]">
              <ShoppingCart className="h-5 w-5 text-[#168a8a]" /> Carrito
            </h3>
            <span className="text-sm text-slate-500">
              {carrito.length} productos
            </span>
          </div>
          <div className="min-h-48 py-3">
            {carrito.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">
                Selecciona un medicamento para comenzar.
              </p>
            ) : (
              carrito.map((articulo) => (
                <div
                  key={articulo.producto.id}
                  className="flex items-center gap-2 border-b border-[#edf0f1] py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#334952]">
                      {articulo.producto.nombre}
                    </p>
                    <p className="text-xs text-slate-500">
                      $
                      {(articulo.producto.precio_venta_centavos / 100).toFixed(
                        2
                      )}{" "}
                      c/u
                    </p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={articulo.producto.stock_actual}
                    value={articulo.cantidad}
                    onChange={(event) =>
                      cambiarCantidad(
                        articulo.producto.id,
                        Number(event.target.value)
                      )
                    }
                    className="w-14 rounded-lg border border-[#d1dcdf] p-1.5 text-center text-sm"
                  />
                  <p className="w-16 text-right text-sm font-semibold">
                    $
                    {(
                      (articulo.producto.precio_venta_centavos *
                        articulo.cantidad) /
                      100
                    ).toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setCarrito((actual) =>
                        actual.filter(
                          (item) => item.producto.id !== articulo.producto.id
                        )
                      )
                    }
                    className="rounded-lg p-1.5 text-[#b06b76] hover:bg-[#fff0f0]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-[#e1e7e8] pt-4">
            <div className="flex justify-between text-xl font-bold text-[#334952]">
              <span>Total</span>
              <span>${(totalCentavos / 100).toFixed(2)}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(
                [
                  ["efectivo", "Efectivo", Banknote],
                  ["tarjeta", "Tarjeta", CreditCard],
                  ["transferencia", "Transferencia", Banknote]
                ] as const
              ).map(([valor, nombre, Icono]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setMetodoPago(valor)}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2 text-xs font-medium ${metodoPago === valor ? "bg-[#e4f1f1] text-[#168a8a]" : "bg-[#f5f7f7] text-slate-500"}`}
                >
                  <Icono className="h-4 w-4" />
                  {nombre}
                </button>
              ))}
            </div>
            {metodoPago === "efectivo" && (
              <label className="mt-4 block text-sm font-medium text-slate-600">
                Monto recibido
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ej. 100.00"
                  value={montoRecibido}
                  onChange={(event) => setMontoRecibido(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#d1dcdf] p-2.5 outline-[#18a7a7]"
                />
                <span className="mt-2 block text-sm text-slate-500">
                  Cambio:{" "}
                  <b className="text-[#29835f]">
                    ${(cambioCentavos / 100).toFixed(2)}
                  </b>
                </span>
              </label>
            )}
            <button
              type="button"
              disabled={cargando || carrito.length === 0}
              onClick={() => void confirmarVenta()}
              className="mt-5 w-full rounded-xl bg-[#18a7a7] py-3 font-semibold text-white hover:bg-[#168f8f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando ? "Procesando..." : "Confirmar venta"}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function PackageIcon(): React.JSX.Element {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4f1f1] text-[#168a8a]">
      ▣
    </span>
  )
}

export default Ventas
