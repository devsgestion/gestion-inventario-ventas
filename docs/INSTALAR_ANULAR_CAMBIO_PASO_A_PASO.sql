-- =====================================================
-- VERIFICAR SI LA FUNCIÓN EXISTE
-- =====================================================
-- Ejecuta esta query primero para verificar:

SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'anular_cambio_devolucion';

-- Si devuelve 0 filas, la función NO existe y necesitas ejecutar el script completo
-- Si devuelve 1 fila, la función SÍ existe

-- =====================================================
-- VERIFICAR SI LAS COLUMNAS EXISTEN
-- =====================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cambios_devoluciones'
AND column_name IN ('anulado', 'fecha_anulacion', 'usuario_anula_id', 'motivo_anulacion')
ORDER BY column_name;

-- Debe devolver 4 filas. Si devuelve menos, faltan columnas.

-- =====================================================
-- SI TODO FALLA, EJECUTA ESTO PASO POR PASO
-- =====================================================

-- PASO 1: Agregar columnas (ejecutar UNA SOLA VEZ)
DO $$
BEGIN
    -- Verificar y agregar columna 'anulado'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cambios_devoluciones' AND column_name = 'anulado'
    ) THEN
        ALTER TABLE cambios_devoluciones ADD COLUMN anulado BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Columna anulado agregada';
    ELSE
        RAISE NOTICE 'Columna anulado ya existe';
    END IF;

    -- Verificar y agregar columna 'fecha_anulacion'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cambios_devoluciones' AND column_name = 'fecha_anulacion'
    ) THEN
        ALTER TABLE cambios_devoluciones ADD COLUMN fecha_anulacion TIMESTAMPTZ;
        RAISE NOTICE 'Columna fecha_anulacion agregada';
    ELSE
        RAISE NOTICE 'Columna fecha_anulacion ya existe';
    END IF;

    -- Verificar y agregar columna 'usuario_anula_id'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cambios_devoluciones' AND column_name = 'usuario_anula_id'
    ) THEN
        ALTER TABLE cambios_devoluciones ADD COLUMN usuario_anula_id UUID REFERENCES perfiles(id);
        RAISE NOTICE 'Columna usuario_anula_id agregada';
    ELSE
        RAISE NOTICE 'Columna usuario_anula_id ya existe';
    END IF;

    -- Verificar y agregar columna 'motivo_anulacion'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cambios_devoluciones' AND column_name = 'motivo_anulacion'
    ) THEN
        ALTER TABLE cambios_devoluciones ADD COLUMN motivo_anulacion TEXT;
        RAISE NOTICE 'Columna motivo_anulacion agregada';
    ELSE
        RAISE NOTICE 'Columna motivo_anulacion ya existe';
    END IF;
END $$;

-- PASO 2: Crear la función (ejecutar después del PASO 1)
CREATE OR REPLACE FUNCTION anular_cambio_devolucion(
    p_cambio_id UUID,
    p_usuario_anula_id UUID,
    p_motivo_anulacion TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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

    -- 3. REVERTIR INVENTARIO: Devolver productos que fueron devueltos (RESTAR)
    FOR v_producto IN 
        SELECT * FROM jsonb_to_recordset(v_cambio.productos_devueltos) 
        AS x(producto_id UUID, cantidad INTEGER)
    LOOP
        -- Quitar del inventario (porque cuando se hizo el cambio, se SUMARON)
        UPDATE productos
        SET stock_actual = stock_actual - v_producto.cantidad
        WHERE id = v_producto.producto_id;
        
        RAISE NOTICE 'Revertido producto devuelto: % (-%)', v_producto.producto_id, v_producto.cantidad;
    END LOOP;

    -- 4. REVERTIR INVENTARIO: Quitar productos nuevos (SUMAR)
    FOR v_producto IN 
        SELECT * FROM jsonb_to_recordset(v_cambio.productos_nuevos) 
        AS x(producto_id UUID, cantidad INTEGER)
    LOOP
        -- Devolver al inventario (porque cuando se hizo el cambio, se RESTARON)
        UPDATE productos
        SET stock_actual = stock_actual + v_producto.cantidad
        WHERE id = v_producto.producto_id;
        
        RAISE NOTICE 'Revertido producto nuevo: % (+%)', v_producto.producto_id, v_producto.cantidad;
    END LOOP;

    -- 5. REVERTIR DIFERENCIA EN CAJA (solo si hay caja abierta)
    IF v_estado_caja_id IS NOT NULL THEN
        UPDATE estado_caja
        SET monto_inicial = monto_inicial - v_cambio.diferencia
        WHERE id = v_estado_caja_id;
        
        RAISE NOTICE 'Diferencia revertida en caja: %', v_cambio.diferencia;
    ELSE
        RAISE NOTICE 'No hay caja abierta. Solo se revirtió inventario.';
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
-- PASO 3: Dar permisos (IMPORTANTE)
-- =====================================================

-- Permitir que usuarios autenticados ejecuten la función
GRANT EXECUTE ON FUNCTION anular_cambio_devolucion TO authenticated;

-- =====================================================
-- PASO 4: Verificar que todo funcionó
-- =====================================================

-- Ver la función creada
SELECT 
    routine_name,
    routine_type,
    security_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'anular_cambio_devolucion';

-- Ver las columnas agregadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cambios_devoluciones'
AND column_name IN ('anulado', 'fecha_anulacion', 'usuario_anula_id', 'motivo_anulacion');

-- =====================================================
-- PRUEBA MANUAL (Opcional)
-- =====================================================

-- Para probar la función manualmente, necesitas:
-- 1. Un ID de cambio existente
-- 2. Un ID de usuario existente
-- 3. Un motivo

-- Ejemplo (REEMPLAZA los UUIDs con datos reales):
/*
SELECT anular_cambio_devolucion(
    'ID_DEL_CAMBIO_AQUI'::UUID,
    'ID_DEL_USUARIO_AQUI'::UUID,
    'Prueba de anulación desde SQL'
);
*/
