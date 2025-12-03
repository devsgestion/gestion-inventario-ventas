-- ========================================================
-- FIX: Error "relation historial_transacciones does not exist"
-- ========================================================
-- Este script corrige la función procesar_cambio_devolucion
-- para que NO intente usar la tabla historial_transacciones
-- que no existe en la base de datos.
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

    -- 4. Actualizar caja con la diferencia
    -- Se actualiza directamente el monto_inicial de la caja abierta
    IF p_diferencia != 0 THEN
        UPDATE estado_caja
        SET monto_inicial = monto_inicial + p_diferencia
        WHERE empresa_id = p_empresa_id
        AND estado = 'ABIERTA';
    END IF;

    RETURN v_cambio_id;
END;
$function$;

COMMENT ON FUNCTION public.procesar_cambio_devolucion IS 
'Procesa cambios y devoluciones de productos. Ajusta inventario y actualiza monto_inicial en estado_caja directamente.';
