-- =====================================================
-- SCRIPT PARA EJECUTAR EN SUPABASE SQL EDITOR
-- Módulo: Cambios y Devoluciones
-- =====================================================

-- 1. Crear tabla cambios_devoluciones
CREATE TABLE IF NOT EXISTS cambios_devoluciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES perfiles(id),
    venta_original_id UUID NOT NULL REFERENCES ventas(id),
    
    productos_devueltos JSONB NOT NULL,
    productos_nuevos JSONB NOT NULL,
    
    valor_devolucion DECIMAL(15, 2) NOT NULL,
    valor_nuevos DECIMAL(15, 2) NOT NULL,
    diferencia DECIMAL(15, 2) NOT NULL,
    
    motivo TEXT,
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'procesado',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_cambios_empresa ON cambios_devoluciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cambios_usuario ON cambios_devoluciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cambios_venta_original ON cambios_devoluciones(venta_original_id);
CREATE INDEX IF NOT EXISTS idx_cambios_created_at ON cambios_devoluciones(created_at);

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_cambios_devoluciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cambios_devoluciones_updated_at ON cambios_devoluciones;

CREATE TRIGGER trigger_cambios_devoluciones_updated_at
    BEFORE UPDATE ON cambios_devoluciones
    FOR EACH ROW
    EXECUTE FUNCTION update_cambios_devoluciones_updated_at();

-- 4. Habilitar RLS
ALTER TABLE cambios_devoluciones ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS (eliminar si existen y crear nuevas)
DROP POLICY IF EXISTS "Users can view cambios from their empresa" ON cambios_devoluciones;
DROP POLICY IF EXISTS "Users can create cambios for their empresa" ON cambios_devoluciones;
DROP POLICY IF EXISTS "Users can update their own cambios" ON cambios_devoluciones;
DROP POLICY IF EXISTS "Only superadmin can delete cambios" ON cambios_devoluciones;

CREATE POLICY "Users can view cambios from their empresa"
    ON cambios_devoluciones
    FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create cambios for their empresa"
    ON cambios_devoluciones
    FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
        AND usuario_id = auth.uid()
    );

CREATE POLICY "Users can update their own cambios"
    ON cambios_devoluciones
    FOR UPDATE
    USING (usuario_id = auth.uid())
    WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Only superadmin can delete cambios"
    ON cambios_devoluciones
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM perfiles 
            WHERE id = auth.uid() 
            AND rol = 'superadmin'
        )
    );

-- 6. Función para procesar cambio completo
CREATE OR REPLACE FUNCTION procesar_cambio_devolucion(
    p_empresa_id UUID,
    p_usuario_id UUID,
    p_venta_original_id UUID,
    p_productos_devueltos JSONB,
    p_productos_nuevos JSONB,
    p_valor_devolucion DECIMAL,
    p_valor_nuevos DECIMAL,
    p_diferencia DECIMAL,
    p_motivo TEXT,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_cambio_id UUID;
    v_producto JSONB;
BEGIN
    -- 1. Crear registro del cambio
    INSERT INTO cambios_devoluciones (
        empresa_id,
        usuario_id,
        venta_original_id,
        productos_devueltos,
        productos_nuevos,
        valor_devolucion,
        valor_nuevos,
        diferencia,
        motivo,
        observaciones
    ) VALUES (
        p_empresa_id,
        p_usuario_id,
        p_venta_original_id,
        p_productos_devueltos,
        p_productos_nuevos,
        p_valor_devolucion,
        p_valor_nuevos,
        p_diferencia,
        p_motivo,
        p_observaciones
    ) RETURNING id INTO v_cambio_id;

    -- 2. Ajustar inventario - DEVOLVER productos al stock
    FOR v_producto IN SELECT * FROM jsonb_array_elements(p_productos_devueltos)
    LOOP
        UPDATE productos
        SET stock_actual = stock_actual + (v_producto->>'cantidad')::INTEGER
        WHERE id = (v_producto->>'producto_id')::UUID
        AND empresa_id = p_empresa_id;

        INSERT INTO movimientos_inventario (
            empresa_id,
            producto_id,
            usuario_id,
            tipo_movimiento,
            cantidad_cambio,
            razon
        ) VALUES (
            p_empresa_id,
            (v_producto->>'producto_id')::UUID,
            p_usuario_id,
            'ajuste_stock',
            (v_producto->>'cantidad')::INTEGER,
            'Cambio/Devolución - ' || COALESCE(p_motivo, 'Sin motivo especificado')
        );
    END LOOP;

    -- 3. Ajustar inventario - RESTAR productos nuevos del stock
    FOR v_producto IN SELECT * FROM jsonb_array_elements(p_productos_nuevos)
    LOOP
        UPDATE productos
        SET stock_actual = stock_actual - (v_producto->>'cantidad')::INTEGER
        WHERE id = (v_producto->>'producto_id')::UUID
        AND empresa_id = p_empresa_id;

        INSERT INTO movimientos_inventario (
            empresa_id,
            producto_id,
            usuario_id,
            tipo_movimiento,
            cantidad_cambio,
            razon
        ) VALUES (
            p_empresa_id,
            (v_producto->>'producto_id')::UUID,
            p_usuario_id,
            'ajuste_stock',
            -(v_producto->>'cantidad')::INTEGER,
            'Cambio/Devolución - Producto nuevo entregado'
        );
    END LOOP;

    -- 4. Actualizar estado de caja con la diferencia
    IF p_diferencia != 0 THEN
        UPDATE estado_caja
        SET monto_inicial = monto_inicial + p_diferencia
        WHERE empresa_id = p_empresa_id
        AND estado = 'ABIERTA';
    END IF;

    RETURN v_cambio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- Verificación: SELECT * FROM cambios_devoluciones LIMIT 1;
