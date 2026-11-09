import type { JSX } from 'react'

function App(): JSX.Element {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Menú lateral */}
      <aside className="w-64 bg-slate-900 p-6 text-white">
        <h1 className="mb-10 text-2xl font-bold">FarmaControl</h1>

        <nav className="space-y-3">
          <div className="rounded-lg bg-blue-600 p-3">Dashboard</div>

          <div className="rounded-lg p-3 hover:bg-slate-800">Punto de venta</div>

          <div className="rounded-lg p-3 hover:bg-slate-800">Inventario</div>

          <div className="rounded-lg p-3 hover:bg-slate-800">Entradas y salidas</div>

          <div className="rounded-lg p-3 hover:bg-slate-800">Reportes</div>
        </nav>


        
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-8">
        <h2 className="text-3xl font-bold text-slate-800">Dashboard</h2>

        <p className="mt-2 text-gray-500">Bienvenido al sistema de farmacia</p>

        <div className="mt-8 grid grid-cols-3 gap-6">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-gray-500">Medicamentos registrados</p>
            <h3 className="mt-3 text-3xl font-bold">0</h3>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-gray-500">Ventas del día</p>
            <h3 className="mt-3 text-3xl font-bold">$0.00</h3>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-gray-500">Productos con stock bajo</p>
            <h3 className="mt-3 text-3xl font-bold">0</h3>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
