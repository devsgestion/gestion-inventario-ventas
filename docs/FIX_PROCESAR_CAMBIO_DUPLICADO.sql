-- ========================================================
-- FIX: Eliminar duplicación de registros en historial_transacciones
-- al procesar cambios/devoluciones
-- Problema: La función actualizaba monto_inicial y el trigger
-- también registraba la transacción, causando duplicación
-- ========================================================

CREATE OR REPLACE FUNCTION public.procesar_cambio_devolucion(
    p_empresa_id uuid, 
    p_usuario_id uuid, 
    p_venta_original_id uuid, 
    p_productos_devueltos jsonb, 
    p_productos_nuevos jsonb, 
    p_valor_devolucion numeric, 
    p_valor_nuevos numeric, 
    p_diferencia numeric, 
    p_motivo text, 
    p_observaciones text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_cambio_id UUID;
    v_producto JSONB;
    v_estado_caja_id UUID;
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

    -- 4. Actualizar caja con la diferencia (SIN TRIGGER)
    -- ⚠️ CAMBIO: Ahora actualiza monto_inicial directamente
    -- No se usa historial_transacciones porque esa tabla no existe
    IF p_diferencia != 0 THEN
        UPDATE estado_caja
        SET monto_inicial = monto_inicial + p_diferencia
        WHERE empresa_id = p_empresa_id
        AND estado = 'ABIERTA';
    END IF;

    RETURN v_cambio_id;
END;
$function$;

-- Comentario de la función actualizada
COMMENT ON FUNCTION public.procesar_cambio_devolucion IS 
'Procesa cambios y devoluciones de productos. 
Ajusta inventario y actualiza monto_inicial en estado_caja directamente.
La función es igual a la original - el problema de duplicación estaba en otro lugar.';

-- ========================================================
-- DIAGNÓSTICO: ¿Dónde está el problema de duplicación?
-- ========================================================
-- Si ves cambios/devoluciones duplicados en el historial de caja,
-- el problema puede estar en:
-- 1. Un TRIGGER en la tabla estado_caja que registra cada UPDATE
-- 2. Código del frontend que llama dos veces a la función
-- 3. Una vista o función que muestra los datos duplicados

-- Para diagnosticar, ejecuta esto:
SELECT 
    cd.id as cambio_id,
    cd.diferencia,
    cd.motivo,
    cd.created_at,
    COUNT(*) as veces_que_aparece
FROM cambios_devoluciones cd
WHERE cd.created_at >= NOW() - INTERVAL '7 days'
GROUP BY cd.id, cd.diferencia, cd.motivo, cd.created_at
HAVING COUNT(*) > 1
ORDER BY cd.created_at DESC;

-- Si esta query NO muestra duplicados, entonces el problema está
-- en CÓMO se muestra la información en el frontend, no en la BD.

-- ========================================================
-- NOTA: NO HAY TABLA historial_transacciones
-- ========================================================
-- La tabla historial_transacciones NO existe en tu base de datos.
-- La diferencia de cambios/devoluciones se guarda directamente
-- en el campo monto_inicial de la tabla estado_caja.
-- 
-- Si ves información duplicada, revisa:
-- 1. El componente React que muestra los cambios
-- 2. La query que obtiene los datos
-- 3. Triggers en estado_caja o cambios_devoluciones
