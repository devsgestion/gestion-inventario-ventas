-- =====================================================
-- MIGRACIÓN Y MEJORA DE TABLAS DE PEDIDOS
-- =====================================================
-- Este script actualiza las tablas de pedidos para que
-- estén alineadas con el resto del sistema
-- =====================================================

-- 1. ELIMINAR TABLAS EXISTENTES (si necesitas empezar de cero)
-- ⚠️ CUIDADO: Esto eliminará todos los datos existentes
-- DROP TABLE IF EXISTS public.items_pedido CASCADE;
-- DROP TABLE IF EXISTS public.pedidos CASCADE;

-- 2. CREAR TABLA PEDIDOS (MEJORADA)
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  
  -- Información del cliente
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NULL,
  
  -- Canal y seguimiento
  canal TEXT NOT NULL DEFAULT 'WhatsApp',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  usuario_id UUID NULL, -- Usuario que creó/gestiona el pedido (renombrado de usuario_asignado)
  
  -- Información adicional
  comentarios TEXT NULL,
  total_pedido NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Total calculado del pedido
  
  -- Fechas
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()), -- Consistencia con otras tablas
  fecha_entrega DATE NULL,
  updated_at TIMESTAMPTZ NULL DEFAULT timezone('utc', now()),
  
  -- Constraints
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT pedidos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES perfiles(id) ON DELETE SET NULL,
  
  -- Validaciones
  CONSTRAINT pedidos_estado_check CHECK (estado IN ('pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado', 'cancelado')),
  CONSTRAINT pedidos_canal_check CHECK (canal IN ('WhatsApp', 'Facebook', 'Instagram', 'Tienda', 'Teléfono', 'Otro'))
) TABLESPACE pg_default;

-- 3. CREAR TABLA ITEMS_PEDIDO (MEJORADA)
CREATE TABLE IF NOT EXISTS public.items_pedido (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL,
  empresa_id UUID NOT NULL, -- Redundancia para optimización de consultas
  
  -- Referencia al producto
  producto_id UUID NULL,
  nombre_producto TEXT NOT NULL, -- Almacenar nombre para histórico
  
  -- Detalles del producto
  talla TEXT NULL,
  color TEXT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC(10, 2) NOT NULL,
  
  -- Información adicional
  tipo_venta TEXT NULL DEFAULT 'detal',
  observaciones TEXT NULL,
  
  -- Constraints
  CONSTRAINT items_pedido_pkey PRIMARY KEY (id),
  CONSTRAINT items_pedido_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT items_pedido_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL,
  CONSTRAINT items_pedido_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Validaciones
  CONSTRAINT items_pedido_cantidad_check CHECK (cantidad > 0),
  CONSTRAINT items_pedido_precio_check CHECK (precio_unitario >= 0),
  CONSTRAINT items_pedido_tipo_venta_check CHECK (tipo_venta IN ('detal', 'mayorista'))
) TABLESPACE pg_default;

-- 4. CREAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_id ON pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(created_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_estado ON pedidos(empresa_id, estado);

CREATE INDEX IF NOT EXISTS idx_items_pedido_pedido_id ON items_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_items_pedido_producto_id ON items_pedido(producto_id);
CREATE INDEX IF NOT EXISTS idx_items_pedido_empresa_id ON items_pedido(empresa_id);

-- 5. CREAR TRIGGER PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_pedidos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pedidos_updated_at ON pedidos;
CREATE TRIGGER trigger_update_pedidos_updated_at
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION update_pedidos_updated_at();

-- 6. CREAR FUNCIÓN PARA CALCULAR TOTAL DEL PEDIDO
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

-- 7. CREAR TRIGGER PARA ACTUALIZAR TOTAL_PEDIDO AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION update_total_pedido()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar el total del pedido cuando se insertan/actualizan/eliminan items
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

DROP TRIGGER IF EXISTS trigger_update_total_pedido ON items_pedido;
CREATE TRIGGER trigger_update_total_pedido
    AFTER INSERT OR UPDATE OR DELETE ON items_pedido
    FOR EACH ROW
    EXECUTE FUNCTION update_total_pedido();

-- 8. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_pedido ENABLE ROW LEVEL SECURITY;

-- 9. CREAR POLÍTICAS DE SEGURIDAD
-- Política para pedidos: Los usuarios solo ven pedidos de su empresa
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

-- Políticas para items_pedido
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

-- 10. CREAR VISTA PARA PEDIDOS CON TOTALES
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

-- =====================================================
-- SCRIPT DE MIGRACIÓN DE DATOS (si ya tienes datos)
-- =====================================================
-- Si ya tienes datos en las tablas antiguas, ejecuta:

-- Actualizar nombre de columna usuario_asignado -> usuario_id
-- ALTER TABLE pedidos RENAME COLUMN usuario_asignado TO usuario_id;

-- Actualizar nombre de columna fecha_creacion -> created_at
-- ALTER TABLE pedidos RENAME COLUMN fecha_creacion TO created_at;

-- Agregar columna total_pedido si no existe
-- ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS total_pedido NUMERIC(10, 2) DEFAULT 0.00;

-- Agregar columna updated_at si no existe
-- ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());

-- Agregar columna empresa_id a items_pedido si no existe
-- ALTER TABLE items_pedido ADD COLUMN IF NOT EXISTS empresa_id UUID;

-- Actualizar empresa_id en items_pedido desde pedidos
-- UPDATE items_pedido 
-- SET empresa_id = p.empresa_id
-- FROM pedidos p
-- WHERE items_pedido.pedido_id = p.id
-- AND items_pedido.empresa_id IS NULL;

-- Calcular totales existentes
-- UPDATE pedidos SET total_pedido = calcular_total_pedido(id);

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
