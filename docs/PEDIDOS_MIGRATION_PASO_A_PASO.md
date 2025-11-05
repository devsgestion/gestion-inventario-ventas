# 🔧 Migración de Tablas de Pedidos - Paso a Paso

## ⚠️ IMPORTANTE: Ejecuta en este ORDEN exacto

---

## 📝 PASO 1: Crear/Actualizar Tabla PEDIDOS

```sql
-- 1.1 Si la tabla ya existe, primero renombra las columnas
ALTER TABLE pedidos RENAME COLUMN usuario_asignado TO usuario_id;
ALTER TABLE pedidos RENAME COLUMN fecha_creacion TO created_at;

-- 1.2 Agregar nuevas columnas si no existen
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS total_pedido NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());

-- 1.3 Si necesitas crear la tabla desde cero (solo si no existe)
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NULL,
  canal TEXT NOT NULL DEFAULT 'WhatsApp',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  usuario_id UUID NULL,
  comentarios TEXT NULL,
  total_pedido NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  fecha_entrega DATE NULL,
  updated_at TIMESTAMPTZ NULL DEFAULT timezone('utc', now()),
  
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT pedidos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES perfiles(id) ON DELETE SET NULL
);
```

---

## 📝 PASO 2: Crear/Actualizar Tabla ITEMS_PEDIDO

```sql
-- 2.1 Agregar empresa_id si la tabla ya existe
ALTER TABLE items_pedido ADD COLUMN IF NOT EXISTS empresa_id UUID;

-- 2.2 Llenar empresa_id desde pedidos
UPDATE items_pedido 
SET empresa_id = p.empresa_id
FROM pedidos p
WHERE items_pedido.pedido_id = p.id
AND items_pedido.empresa_id IS NULL;

-- 2.3 Si necesitas crear la tabla desde cero (solo si no existe)
CREATE TABLE IF NOT EXISTS public.items_pedido (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  producto_id UUID NULL,
  nombre_producto TEXT NOT NULL,
  talla TEXT NULL,
  color TEXT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC(10, 2) NOT NULL,
  tipo_venta TEXT NULL DEFAULT 'detal',
  observaciones TEXT NULL,
  
  CONSTRAINT items_pedido_pkey PRIMARY KEY (id),
  CONSTRAINT items_pedido_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT items_pedido_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL,
  CONSTRAINT items_pedido_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- 2.4 Hacer empresa_id NOT NULL (solo si ya llenaste los datos)
ALTER TABLE items_pedido ALTER COLUMN empresa_id SET NOT NULL;
```

---

## 📝 PASO 3: Agregar CONSTRAINTS de Validación

```sql
-- 3.1 Constraints para pedidos
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check 
  CHECK (estado IN ('pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado', 'cancelado'));

ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_canal_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_canal_check 
  CHECK (canal IN ('WhatsApp', 'Facebook', 'Instagram', 'Tienda', 'Teléfono', 'Otro'));

-- 3.2 Constraints para items_pedido
ALTER TABLE items_pedido DROP CONSTRAINT IF EXISTS items_pedido_cantidad_check;
ALTER TABLE items_pedido ADD CONSTRAINT items_pedido_cantidad_check CHECK (cantidad > 0);

ALTER TABLE items_pedido DROP CONSTRAINT IF EXISTS items_pedido_precio_check;
ALTER TABLE items_pedido ADD CONSTRAINT items_pedido_precio_check CHECK (precio_unitario >= 0);

ALTER TABLE items_pedido DROP CONSTRAINT IF EXISTS items_pedido_tipo_venta_check;
ALTER TABLE items_pedido ADD CONSTRAINT items_pedido_tipo_venta_check 
  CHECK (tipo_venta IN ('detal', 'mayorista'));
```

---

## 📝 PASO 4: Crear ÍNDICES

```sql
-- 4.1 Índices para pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_id ON pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(created_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_estado ON pedidos(empresa_id, estado);

-- 4.2 Índices para items_pedido
CREATE INDEX IF NOT EXISTS idx_items_pedido_pedido_id ON items_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_items_pedido_producto_id ON items_pedido(producto_id);
CREATE INDEX IF NOT EXISTS idx_items_pedido_empresa_id ON items_pedido(empresa_id);
```

---

## 📝 PASO 5: Crear FUNCIONES (¡IMPORTANTE! Antes de usarlas)

```sql
-- 5.1 Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_pedidos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Función para calcular total del pedido
CREATE OR REPLACE FUNCTION calcular_total_pedido(pedido_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    total NUMERIC(10, 2);
BEGIN
    SELECT COALESCE(SUM(cantidad * precio_unitario), 0)
    INTO total
    FROM items_pedido
    WHERE pedido_id = pedido_uuid;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- 5.3 Función para actualizar total_pedido automáticamente
CREATE OR REPLACE FUNCTION update_total_pedido()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pedidos
    SET total_pedido = calcular_total_pedido(
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.pedido_id
            ELSE NEW.pedido_id
        END
    )
    WHERE id = CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.pedido_id
        ELSE NEW.pedido_id
    END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

---

## 📝 PASO 6: Crear TRIGGERS

```sql
-- 6.1 Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_pedidos_updated_at ON pedidos;
CREATE TRIGGER trigger_update_pedidos_updated_at
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION update_pedidos_updated_at();

-- 6.2 Trigger para total_pedido
DROP TRIGGER IF EXISTS trigger_update_total_pedido ON items_pedido;
CREATE TRIGGER trigger_update_total_pedido
    AFTER INSERT OR UPDATE OR DELETE ON items_pedido
    FOR EACH ROW
    EXECUTE FUNCTION update_total_pedido();
```

---

## 📝 PASO 7: Calcular TOTALES de Pedidos Existentes

```sql
-- 7.1 Ahora SÍ puedes usar la función porque ya existe
UPDATE pedidos SET total_pedido = calcular_total_pedido(id);
```

---

## 📝 PASO 8: Habilitar ROW LEVEL SECURITY

```sql
-- 8.1 Habilitar RLS
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_pedido ENABLE ROW LEVEL SECURITY;

-- 8.2 Políticas para PEDIDOS
DROP POLICY IF EXISTS "Los usuarios pueden ver pedidos de su empresa" ON pedidos;
CREATE POLICY "Los usuarios pueden ver pedidos de su empresa"
    ON pedidos FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Los usuarios pueden crear pedidos en su empresa" ON pedidos;
CREATE POLICY "Los usuarios pueden crear pedidos en su empresa"
    ON pedidos FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Los usuarios pueden actualizar pedidos de su empresa" ON pedidos;
CREATE POLICY "Los usuarios pueden actualizar pedidos de su empresa"
    ON pedidos FOR UPDATE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Los usuarios pueden eliminar pedidos de su empresa" ON pedidos;
CREATE POLICY "Los usuarios pueden eliminar pedidos de su empresa"
    ON pedidos FOR DELETE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
    );

-- 8.3 Políticas para ITEMS_PEDIDO
DROP POLICY IF EXISTS "Los usuarios pueden ver items de pedidos de su empresa" ON items_pedido;
CREATE POLICY "Los usuarios pueden ver items de pedidos de su empresa"
    ON items_pedido FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Los usuarios pueden crear items en pedidos de su empresa" ON items_pedido;
CREATE POLICY "Los usuarios pueden crear items en pedidos de su empresa"
    ON items_pedido FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Los usuarios pueden actualizar items de su empresa" ON items_pedido;
CREATE POLICY "Los usuarios pueden actualizar items de su empresa"
    ON items_pedido FOR UPDATE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Los usuarios pueden eliminar items de su empresa" ON items_pedido;
CREATE POLICY "Los usuarios pueden eliminar items de su empresa"
    ON items_pedido FOR DELETE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
    );
```

---

## 📝 PASO 9: Crear VISTA (Opcional)

```sql
CREATE OR REPLACE VIEW vista_pedidos_completos AS
SELECT 
    p.*,
    COUNT(ip.id) as cantidad_items,
    COALESCE(SUM(ip.cantidad), 0) as total_unidades,
    u.nombre as nombre_usuario
FROM pedidos p
LEFT JOIN items_pedido ip ON p.id = ip.pedido_id
LEFT JOIN perfiles u ON p.usuario_id = u.id
GROUP BY p.id, u.nombre;
```

---

## ✅ VERIFICACIÓN

Ejecuta esto al final para verificar que todo está OK:

```sql
-- Ver la estructura de la tabla pedidos
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pedidos' 
ORDER BY ordinal_position;

-- Ver la estructura de la tabla items_pedido
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'items_pedido' 
ORDER BY ordinal_position;

-- Ver las funciones creadas
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%pedido%';

-- Ver los triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('pedidos', 'items_pedido');
```

---

## 🎯 RESUMEN DEL ORDEN CORRECTO:

1. ✅ Crear/Actualizar tablas
2. ✅ Agregar columnas faltantes
3. ✅ Agregar constraints
4. ✅ Crear índices
5. ✅ **Crear funciones PRIMERO** ⚠️
6. ✅ Crear triggers (que usan las funciones)
7. ✅ Actualizar datos existentes (usando las funciones)
8. ✅ Configurar RLS
9. ✅ Crear vistas

---

**¡IMPORTANTE!** El error que tenías era porque intentaste usar `calcular_total_pedido()` antes de crearla. Ejecuta primero el PASO 5 (crear funciones) y luego el PASO 7 (usar la función).
