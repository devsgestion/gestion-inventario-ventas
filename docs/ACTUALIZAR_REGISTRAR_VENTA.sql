-- =====================================================
-- ACTUALIZAR FUNCIÓN registrar_venta
-- Incluye asignación automática de numero_venta
-- =====================================================

CREATE OR REPLACE FUNCTION public.registrar_venta(
    p_empresa_id UUID,
    p_usuario_id UUID,
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_venta_id UUID;
    v_numero_venta INTEGER;
    v_total_venta NUMERIC(10, 2) := 0.00;
    v_fecha_local TIMESTAMPTZ := now() AT TIME ZONE 'America/Bogota';
    v_item RECORD;
BEGIN
    -- 1. Calcular el total de la venta
    SELECT COALESCE(
        SUM(ROUND( (item->>'cantidad')::NUMERIC * (item->>'precio_unitario')::NUMERIC, 2)), 0
    ) INTO v_total_venta
    FROM jsonb_array_elements(p_items) AS item(item);

    -- 2. Obtener el siguiente número de venta
    v_numero_venta := obtener_siguiente_numero_venta(p_empresa_id);

    -- 3. Registrar la Venta (ahora con numero_venta)
    INSERT INTO public.ventas (empresa_id, usuario_id, total_venta, fecha_venta, numero_venta)
    VALUES (p_empresa_id, p_usuario_id, v_total_venta, v_fecha_local, v_numero_venta)
    RETURNING id INTO v_venta_id;

    -- 4. Iterar sobre el detalle, actualizar stock y registrar movimientos
    FOR v_item IN SELECT item FROM jsonb_array_elements(p_items) AS item(item)
    LOOP
        -- 4a. Registrar el Detalle
        INSERT INTO public.detalle_venta (venta_id, producto_id, empresa_id, cantidad, precio_unitario, costo_unitario)
        VALUES (
            v_venta_id, 
            (v_item.item->>'producto_id')::UUID, 
            p_empresa_id, 
            (v_item.item->>'cantidad')::INTEGER, 
            (v_item.item->>'precio_unitario')::NUMERIC, 
            (v_item.item->>'costo_unitario')::NUMERIC
        );

        -- 4b. Restar del Inventario 
        UPDATE public.productos
        SET stock_actual = stock_actual - (v_item.item->>'cantidad')::INTEGER
        WHERE id = (v_item.item->>'producto_id')::UUID; 

        -- 4c. Registrar Movimiento
        INSERT INTO public.movimientos_inventario (empresa_id, producto_id, usuario_id, tipo_movimiento, cantidad_cambio, razon, fecha)
        VALUES (
            p_empresa_id, (v_item.item->>'producto_id')::UUID, p_usuario_id, 'VENTA', 
            -(v_item.item->>'cantidad')::INTEGER, 'Venta #' || v_numero_venta || ' - ID: ' || v_venta_id, v_fecha_local
        );
    END LOOP;

    -- 5. Retornar información de la venta (ahora incluye numero_venta)
    RETURN jsonb_build_object(
        'venta_id', v_venta_id, 
        'numero_venta', v_numero_venta,
        'total', v_total_venta
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fallo la transacción de venta: %', SQLERRM;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIN - La función ahora asigna numero_venta automáticamente
-- =====================================================
