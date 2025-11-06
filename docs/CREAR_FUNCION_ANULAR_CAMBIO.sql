-- =====================================================
-- FUNCIÓN PARA ANULAR CAMBIOS/DEVOLUCIONES
-- =====================================================
-- Esta función revierte completamente un cambio/devolución:
-- 1. Devuelve productos devueltos al inventario
-- 2. Quita productos nuevos del inventario
-- 3. Revierte la diferencia en estado_caja
-- 4. Marca el cambio como anulado

CREATE OR REPLACE FUNCTION anular_cambio_devolucion(
    p_cambio_id UUID,
    p_usuario_anula_id UUID,
    p_motivo_anulacion TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER  -- IMPORTANTE: Permite ejecutar con permisos elevados
AS $$
DECLARE
    v_cambio RECORD;
    v_producto RECORD;
    v_estado_caja_id UUID;
BEGIN
    -- 1. Obtener información del cambio
    SELECT * INTO v_cambio
    FROM cambios_devoluciones
    WHERE id = p_cambio_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cambio no encontrado';
    END IF;

    -- Verificar que no esté ya anulado
    IF v_cambio.anulado = TRUE THEN
        RAISE EXCEPTION 'Este cambio ya fue anulado anteriormente';
    END IF;

    -- 2. Obtener estado de caja activo (si existe)
    SELECT id INTO v_estado_caja_id
    FROM estado_caja
    WHERE empresa_id = v_cambio.empresa_id
    AND estado = 'abierta'
    LIMIT 1;

    -- Si no hay caja abierta, solo se revertirá el inventario (sin modificar caja)
    -- Esto permite anular cambios históricos sin necesidad de tener caja abierta

    -- 3. REVERTIR INVENTARIO: Devolver productos que fueron devueltos (SUMAR)
    FOR v_producto IN 
        SELECT * FROM jsonb_to_recordset(v_cambio.productos_devueltos) 
        AS x(producto_id UUID, cantidad INTEGER)
    LOOP
        -- Quitar del inventario (porque cuando se hizo el cambio, se SUMARON)
        UPDATE productos
        SET stock_actual = stock_actual - v_producto.cantidad
        WHERE id = v_producto.producto_id;
    END LOOP;

    -- 4. REVERTIR INVENTARIO: Quitar productos nuevos (RESTAR)
    FOR v_producto IN 
        SELECT * FROM jsonb_to_recordset(v_cambio.productos_nuevos) 
        AS x(producto_id UUID, cantidad INTEGER)
    LOOP
        -- Devolver al inventario (porque cuando se hizo el cambio, se RESTARON)
        UPDATE productos
        SET stock_actual = stock_actual + v_producto.cantidad
        WHERE id = v_producto.producto_id;
    END LOOP;

    -- 5. REVERTIR DIFERENCIA EN CAJA (solo si hay caja abierta)
    -- Si la diferencia fue positiva (+$10.000), ahora hay que restarla
    -- Si la diferencia fue negativa (-$5.000), ahora hay que sumarla (quitar el negativo)
    IF v_estado_caja_id IS NOT NULL THEN
        UPDATE estado_caja
        SET monto_inicial = monto_inicial - v_cambio.diferencia
        WHERE id = v_estado_caja_id;
        
        RAISE NOTICE 'Diferencia revertida en caja abierta: %', v_cambio.diferencia;
    ELSE
        RAISE NOTICE 'No hay caja abierta. Solo se revirtió el inventario.';
    END IF;

    -- 6. Marcar cambio como anulado
    UPDATE cambios_devoluciones
    SET 
        anulado = TRUE,
        fecha_anulacion = NOW(),
        usuario_anula_id = p_usuario_anula_id,
        motivo_anulacion = p_motivo_anulacion
    WHERE id = p_cambio_id;

    RETURN 'Cambio anulado correctamente';
END;
$$;

-- =====================================================
-- AGREGAR COLUMNAS A LA TABLA cambios_devoluciones
-- =====================================================
-- Ejecutar estos ALTER TABLE si las columnas no existen

ALTER TABLE cambios_devoluciones 
ADD COLUMN IF NOT EXISTS anulado BOOLEAN DEFAULT FALSE;

ALTER TABLE cambios_devoluciones 
ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMPTZ;

ALTER TABLE cambios_devoluciones 
ADD COLUMN IF NOT EXISTS usuario_anula_id UUID REFERENCES perfiles(id);

ALTER TABLE cambios_devoluciones 
ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION anular_cambio_devolucion IS 
'Revierte completamente un cambio/devolución: devuelve inventario a estado original, revierte diferencia en caja, y marca como anulado';

COMMENT ON COLUMN cambios_devoluciones.anulado IS 
'Indica si este cambio fue anulado (TRUE) o está activo (FALSE)';

COMMENT ON COLUMN cambios_devoluciones.fecha_anulacion IS 
'Fecha y hora en que se anuló el cambio';

COMMENT ON COLUMN cambios_devoluciones.usuario_anula_id IS 
'Usuario que realizó la anulación del cambio';

COMMENT ON COLUMN cambios_devoluciones.motivo_anulacion IS 
'Razón por la cual se anuló el cambio';

-- =====================================================
-- PERMISOS
-- =====================================================
-- Permitir que usuarios autenticados ejecuten la función

GRANT EXECUTE ON FUNCTION anular_cambio_devolucion TO authenticated;
GRANT EXECUTE ON FUNCTION anular_cambio_devolucion TO service_role;
