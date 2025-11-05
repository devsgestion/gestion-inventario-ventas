-- =====================================================
-- MÓDULO: CAMBIOS Y DEVOLUCIONES
-- Script de configuración de base de datos
-- =====================================================

-- 1. Crear tabla para registrar cambios y devoluciones
CREATE TABLE IF NOT EXISTS cambios_devoluciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES perfiles(id),
    venta_original_id UUID NOT NULL REFERENCES ventas(id),
    
    -- Productos devueltos (JSON array)
    productos_devueltos JSONB NOT NULL,
    -- Ejemplo: [{"producto_id": "uuid", "nombre": "Bermuda", "cantidad": 2, "precio_unitario": 50000}]
    
    -- Productos nuevos entregados (JSON array)
    productos_nuevos JSONB NOT NULL,
    -- Ejemplo: [{"producto_id": "uuid", "nombre": "Pantalón", "cantidad": 2, "precio_unitario": 70000}]
    
    -- Valores calculados
    valor_devolucion DECIMAL(15, 2) NOT NULL,    -- Total de productos devueltos
    valor_nuevos DECIMAL(15, 2) NOT NULL,        -- Total de productos nuevos
    diferencia DECIMAL(15, 2) NOT NULL,          -- valor_nuevos - valor_devolucion (puede ser + o -)
    
    -- Información adicional
    motivo TEXT,                                 -- Razón del cambio
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'procesado',       -- procesado, cancelado
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices
    CONSTRAINT fk_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    CONSTRAINT fk_usuario FOREIGN KEY (usuario_id) REFERENCES perfiles(id),
    CONSTRAINT fk_venta_original FOREIGN KEY (venta_original_id) REFERENCES ventas(id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_cambios_empresa ON cambios_devoluciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cambios_usuario ON cambios_devoluciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cambios_venta_original ON cambios_devoluciones(venta_original_id);
CREATE INDEX IF NOT EXISTS idx_cambios_created_at ON cambios_devoluciones(created_at);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_cambios_devoluciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cambios_devoluciones_updated_at
    BEFORE UPDATE ON cambios_devoluciones
    FOR EACH ROW
    EXECUTE FUNCTION update_cambios_devoluciones_updated_at();

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE cambios_devoluciones ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de seguridad

-- SELECT: Los usuarios solo pueden ver cambios de su empresa
CREATE POLICY "Users can view cambios from their empresa"
    ON cambios_devoluciones
    FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
    );

-- INSERT: Los usuarios pueden crear cambios para su empresa
CREATE POLICY "Users can create cambios for their empresa"
    ON cambios_devoluciones
    FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
        AND usuario_id = auth.uid()
    );

-- UPDATE: Solo el usuario que creó el cambio puede actualizarlo
CREATE POLICY "Users can update their own cambios"
    ON cambios_devoluciones
    FOR UPDATE
    USING (usuario_id = auth.uid())
    WITH CHECK (usuario_id = auth.uid());

-- DELETE: Solo superadmin puede eliminar (opcional)
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

-- 4. Comentarios para documentación
COMMENT ON TABLE cambios_devoluciones IS 'Registra cambios y devoluciones de productos, vinculando con venta original';
COMMENT ON COLUMN cambios_devoluciones.productos_devueltos IS 'Array JSON con productos que el cliente devuelve';
COMMENT ON COLUMN cambios_devoluciones.productos_nuevos IS 'Array JSON con productos que el cliente recibe en el cambio';
COMMENT ON COLUMN cambios_devoluciones.diferencia IS 'Diferencia de precio: positivo si cliente paga más, negativo si se le devuelve dinero';

-- =====================================================
-- FUNCIÓN PARA PROCESAR CAMBIO COMPLETO
-- =====================================================
-- Esta función maneja:
-- 1. Registra el cambio
-- 2. Ajusta inventario (devuelve productos, resta nuevos)
-- 3. Registra movimientos de inventario
-- 4. Actualiza caja con la diferencia

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
        -- Incrementar stock (productos devueltos)
        UPDATE productos
        SET stock_actual = stock_actual + (v_producto->>'cantidad')::INTEGER
        WHERE id = (v_producto->>'producto_id')::UUID
        AND empresa_id = p_empresa_id;

        -- Registrar movimiento de inventario (DEVOLUCIÓN)
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
        -- Decrementar stock (productos nuevos entregados)
        UPDATE productos
        SET stock_actual = stock_actual - (v_producto->>'cantidad')::INTEGER
        WHERE id = (v_producto->>'producto_id')::UUID
        AND empresa_id = p_empresa_id;

        -- Registrar movimiento de inventario (SALIDA)
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

    -- 4. Actualizar estado de caja con la diferencia (si hay diferencia de dinero)
    IF p_diferencia != 0 THEN
        -- Actualizar el monto_actual de estado_caja
        UPDATE estado_caja
        SET monto_actual = monto_actual + p_diferencia
        WHERE empresa_id = p_empresa_id
        AND caja_abierta = true;
    END IF;

    -- Retornar el ID del cambio creado
    RETURN v_cambio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de la función
COMMENT ON FUNCTION procesar_cambio_devolucion IS 'Procesa un cambio/devolución completo: registra cambio, ajusta inventario y caja';

-- =====================================================
-- VERIFICACIÓN Y CONSULTAS DE EJEMPLO
-- =====================================================

-- Ver todos los cambios de una empresa
-- SELECT * FROM cambios_devoluciones WHERE empresa_id = 'tu-empresa-id' ORDER BY created_at DESC;

-- Ver cambios de hoy
-- SELECT * FROM cambios_devoluciones WHERE DATE(created_at) = CURRENT_DATE;

-- Estadísticas de cambios
-- SELECT 
--     COUNT(*) as total_cambios,
--     SUM(CASE WHEN diferencia > 0 THEN diferencia ELSE 0 END) as total_cobrado,
--     SUM(CASE WHEN diferencia < 0 THEN ABS(diferencia) ELSE 0 END) as total_devuelto
-- FROM cambios_devoluciones
-- WHERE empresa_id = 'tu-empresa-id';
