-- ========================================================
-- CORRECCIÓN DE FECHA EN FUNCIÓN registrar_venta
-- Ejecuta este archivo en Supabase SQL Editor
-- ========================================================

-- El problema: now() AT TIME ZONE 'America/Bogota' NO guarda en hora local
-- Solución: Usar CURRENT_TIMESTAMP que guarda en UTC automáticamente
-- Las consultas con AT TIME ZONE convertirán correctamente al leer

CREATE OR REPLACE FUNCTION public.registrar_venta(
    p_empresa_id UUID,
    p_usuario_id UUID,
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_venta_id UUID;
    v_total_venta NUMERIC(10, 2) := 0.00;
    v_fecha_local TIMESTAMPTZ := CURRENT_TIMESTAMP; -- ✅ Guardar en UTC (estándar PostgreSQL)
    v_item RECORD;
BEGIN
    -- 1. Calcular el total de la venta
    SELECT COALESCE(
        SUM(ROUND( (item->>'cantidad')::NUMERIC * (item->>'precio_unitario')::NUMERIC, 2)), 0
    ) INTO v_total_venta
    FROM jsonb_array_elements(p_items) AS item(item);

    -- 2. Registrar la Venta
    INSERT INTO public.ventas (empresa_id, usuario_id, total_venta, fecha_venta)
    VALUES (p_empresa_id, p_usuario_id, v_total_venta, v_fecha_local)
    RETURNING id INTO v_venta_id;

    -- 3. Iterar sobre el detalle, actualizar stock y registrar movimientos
    FOR v_item IN SELECT item FROM jsonb_array_elements(p_items) AS item(item)
    LOOP
        -- 3a. Registrar el Detalle
        INSERT INTO public.detalle_venta (venta_id, producto_id, empresa_id, cantidad, precio_unitario, costo_unitario)
        VALUES (
            v_venta_id, 
            (v_item.item->>'producto_id')::UUID, 
            p_empresa_id, 
            (v_item.item->>'cantidad')::INTEGER, 
            (v_item.item->>'precio_unitario')::NUMERIC, 
            (v_item.item->>'costo_unitario')::NUMERIC
        );

        -- 3b. Restar del Inventario 
        UPDATE public.productos
        SET stock_actual = stock_actual - (v_item.item->>'cantidad')::INTEGER
        WHERE id = (v_item.item->>'producto_id')::UUID; 

        -- 3c. Registrar Movimiento
        INSERT INTO public.movimientos_inventario (empresa_id, producto_id, usuario_id, tipo_movimiento, cantidad_cambio, razon, fecha)
        VALUES (
            p_empresa_id, (v_item.item->>'producto_id')::UUID, p_usuario_id, 'VENTA', 
            -(v_item.item->>'cantidad')::INTEGER, 'Venta Registrada: ' || v_venta_id, v_fecha_local
        );
    END LOOP;

    RETURN jsonb_build_object('venta_id', v_venta_id, 'total', v_total_venta);
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fallo la transacción de venta: %', SQLERRM;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.registrar_venta(UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_venta(UUID, UUID, JSONB) TO anon;

-- Recargar schema de PostgREST
NOTIFY pgrst, 'reload schema';

-- ========================================================
-- ¿CÓMO FUNCIONA LA CORRECCIÓN?
-- ========================================================
-- ❌ ANTES: now() AT TIME ZONE 'America/Bogota'
--    Resultado: Toma hora UTC, la muestra como si fuera Colombia, pero sigue siendo UTC
--    Ejemplo: Si son 6:48 PM Colombia (11:48 PM UTC), guardaba 6:48 PM UTC (1:48 PM Colombia)
--
-- ✅ AHORA: CURRENT_TIMESTAMP
--    Resultado: Guarda la hora actual en UTC (estándar PostgreSQL)
--    Ejemplo: Si son 6:48 PM Colombia (11:48 PM UTC), guarda 11:48 PM UTC
--    Al consultar con "AT TIME ZONE 'America/Bogota'" convierte correctamente a 6:48 PM
--
-- Las funciones get_ventas_por_hora ya usan "AT TIME ZONE 'America/Bogota'" al LEER
-- Esto convierte UTC → Colombia correctamente
-- ========================================================
