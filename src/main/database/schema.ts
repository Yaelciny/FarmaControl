import { getDatabase } from "./connection"

export function initializeDatabase(): void {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_barras TEXT UNIQUE,
        nombre TEXT NOT NULL,
        categoria TEXT,
        presentacion TEXT,
        precio_venta_centavos INTEGER NOT NULL DEFAULT 0
        CHECK (precio_venta_centavos >= 0),
        stock_minimo INTEGER NOT NULL DEFAULT 5
        CHECK (stock_minimo >= 0),
        activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1)),
        fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proveedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        telefono TEXT,
        correo TEXT,
        contacto TEXT,
        rfc TEXT,
        direccion TEXT,
        activo INTEGER NOT NULL DEFAULT 1
            CHECK (activo IN (0, 1)),
        fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        nombre TEXT NOT NULL DEFAULT 'Administrador',
        usuario TEXT NOT NULL UNIQUE DEFAULT 'Administrador',
        password_hash TEXT,
        password_salt TEXT,
        fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );


CREATE TABLE IF NOT EXISTS lotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    proveedor_id INTEGER,
    numero_lote TEXT NOT NULL,
    fecha_caducidad TEXT NOT NULL,
    fecha_llegada TEXT NOT NULL DEFAULT CURRENT_DATE,
    costo_unitario_centavos INTEGER NOT NULL
        CHECK (costo_unitario_centavos >= 0),
    cantidad_actual INTEGER NOT NULL DEFAULT 0
        CHECK (cantidad_actual >= 0),
    fecha_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (producto_id)
        REFERENCES productos(id),

    FOREIGN KEY (proveedor_id)
        REFERENCES proveedores(id),

    UNIQUE (producto_id, numero_lote)
);


    CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    subtotal_centavos INTEGER NOT NULL
        CHECK (subtotal_centavos >= 0),

    total_centavos INTEGER NOT NULL
        CHECK (total_centavos >= 0),

    metodo_pago TEXT NOT NULL
        CHECK (metodo_pago IN (
            'efectivo',
            'tarjeta',
            'transferencia'
        )),

    monto_recibido_centavos INTEGER NOT NULL
        CHECK (monto_recibido_centavos >= 0),

    cambio_centavos INTEGER NOT NULL DEFAULT 0
        CHECK (cambio_centavos >= 0),

    estado TEXT NOT NULL DEFAULT 'completada'
        CHECK (estado IN (
            'completada',
            'cancelada'
        ))
    );

    CREATE TABLE IF NOT EXISTS cortes_caja (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha_apertura TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_cierre TEXT,
        fondo_inicial_centavos INTEGER NOT NULL DEFAULT 0
            CHECK (fondo_inicial_centavos >= 0),
        ventas_efectivo_centavos INTEGER NOT NULL DEFAULT 0
            CHECK (ventas_efectivo_centavos >= 0),
        ventas_tarjeta_centavos INTEGER NOT NULL DEFAULT 0
            CHECK (ventas_tarjeta_centavos >= 0),
        ventas_transferencia_centavos INTEGER NOT NULL DEFAULT 0
            CHECK (ventas_transferencia_centavos >= 0),
        total_ventas_centavos INTEGER NOT NULL DEFAULT 0
            CHECK (total_ventas_centavos >= 0),
        efectivo_esperado_centavos INTEGER NOT NULL DEFAULT 0
            CHECK (efectivo_esperado_centavos >= 0),
        efectivo_contado_centavos INTEGER,
        diferencia_centavos INTEGER,
        observacion TEXT,
        estado TEXT NOT NULL DEFAULT 'abierta'
            CHECK (estado IN ('abierta', 'cerrada'))
    );


CREATE TABLE IF NOT EXISTS detalle_ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    venta_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,

    cantidad INTEGER NOT NULL
        CHECK (cantidad > 0),

    precio_unitario_centavos INTEGER NOT NULL
        CHECK (precio_unitario_centavos >= 0),

    subtotal_centavos INTEGER NOT NULL
        CHECK (subtotal_centavos >= 0),

    FOREIGN KEY (venta_id)
        REFERENCES ventas(id),

    FOREIGN KEY (producto_id)
        REFERENCES productos(id)
);


CREATE TABLE IF NOT EXISTS detalle_venta_lotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    detalle_venta_id INTEGER NOT NULL,
    lote_id INTEGER NOT NULL,

    cantidad INTEGER NOT NULL
        CHECK (cantidad > 0),

    costo_unitario_centavos INTEGER NOT NULL
        CHECK (costo_unitario_centavos >= 0),

    FOREIGN KEY (detalle_venta_id)
        REFERENCES detalle_ventas(id),

    FOREIGN KEY (lote_id)
        REFERENCES lotes(id)
);


CREATE TABLE IF NOT EXISTS movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    lote_id INTEGER NOT NULL,
    venta_id INTEGER,

    tipo TEXT NOT NULL
        CHECK (tipo IN (
            'entrada',
            'venta',
            'merma',
            'ajuste_entrada',
            'ajuste_salida',
            'devolucion'
        )),

    cantidad INTEGER NOT NULL
        CHECK (cantidad > 0),

    costo_unitario_centavos INTEGER NOT NULL
        CHECK (costo_unitario_centavos >= 0),

    motivo TEXT,
    fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    cancelado INTEGER NOT NULL DEFAULT 0
        CHECK (cancelado IN (0, 1)),

    FOREIGN KEY (lote_id)
        REFERENCES lotes(id),

    FOREIGN KEY (venta_id)
        REFERENCES ventas(id)
);


CREATE INDEX IF NOT EXISTS idx_lotes_producto
ON lotes(producto_id, fecha_caducidad);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha
ON ventas(fecha);

CREATE INDEX IF NOT EXISTS idx_cortes_caja_estado
ON cortes_caja(estado, fecha_apertura);

CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta
ON detalle_ventas(venta_id);

CREATE INDEX IF NOT EXISTS idx_detalle_lotes_detalle
ON detalle_venta_lotes(detalle_venta_id);

CREATE INDEX IF NOT EXISTS idx_movimientos_lote
ON movimientos(lote_id);

CREATE INDEX IF NOT EXISTS idx_movimientos_fecha
ON movimientos(fecha);

  `)

  const columnasProveedor = db
    .prepare("PRAGMA table_info(proveedores)")
    .all() as Array<{ name: string }>
  const nombresColumnas = new Set(
    columnasProveedor.map((columna) => columna.name)
  )

  for (const columna of ["contacto", "rfc", "direccion"]) {
    if (!nombresColumnas.has(columna)) {
      db.exec(`ALTER TABLE proveedores ADD COLUMN ${columna} TEXT`)
    }
  }

  const columnasMovimientos = db
    .prepare("PRAGMA table_info(movimientos)")
    .all() as Array<{ name: string }>
  if (!columnasMovimientos.some((columna) => columna.name === "cancelado")) {
    db.exec(
      "ALTER TABLE movimientos ADD COLUMN cancelado INTEGER NOT NULL DEFAULT 0"
    )
  }

  const columnasLotes = db.prepare("PRAGMA table_info(lotes)").all() as Array<{
    name: string
  }>
  if (!columnasLotes.some((columna) => columna.name === "fecha_llegada")) {
    db.exec("ALTER TABLE lotes ADD COLUMN fecha_llegada TEXT")
    db.exec(
      "UPDATE lotes SET fecha_llegada = substr(fecha_registro, 1, 10) WHERE fecha_llegada IS NULL"
    )
  }

  console.log("Tablas creadas correctamente")
}
