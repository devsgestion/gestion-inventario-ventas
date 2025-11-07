-- ========================================================
-- ACTUALIZACIÓN DE FUNCIONES DE VENTAS POR HORA
-- Ejecuta este archivo en Supabase SQL Editor
-- ========================================================

-- 1. Actualizar función básica (asegurando zona horaria Colombia)
CREATE OR REPLACE FUNCTION get_ventas_por_hora(
    p_empresa_id UUID,
    p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    hora INTEGER,
    total_ventas NUMERIC,
    cantidad_transacciones BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(HOUR FROM v.fecha_venta AT TIME ZONE 'America/Bogota')::INTEGER as hora,
        COALESCE(SUM(v.total_venta), 0) as total_ventas,
        COUNT(v.id) as cantidad_transacciones
    FROM ventas v
    WHERE 
        v.empresa_id = p_empresa_id
        AND DATE(v.fecha_venta AT TIME ZONE 'America/Bogota') = p_fecha
    GROUP BY EXTRACT(HOUR FROM v.fecha_venta AT TIME ZONE 'America/Bogota')
    ORDER BY hora;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Actualizar función con productos (corrigiendo nombres de tabla y campos)
CREATE OR REPLACE FUNCTION get_ventas_por_hora_con_productos(
    p_empresa_id UUID,
    p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    hora TEXT,
    hora_numero INTEGER,
    total_ventas NUMERIC,
    transacciones INTEGER,
    productos JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH ventas_hora AS (
        SELECT 
            EXTRACT(HOUR FROM v.fecha_venta AT TIME ZONE 'America/Bogota')::INTEGER as hora_num,
            v.id as venta_id,
            v.total_venta
        FROM ventas v
        WHERE 
            v.empresa_id = p_empresa_id
            AND DATE(v.fecha_venta AT TIME ZONE 'America/Bogota') = p_fecha
    ),
    productos_vendidos AS (
        SELECT 
            vh.hora_num,
            jsonb_agg(
                jsonb_build_object(
                    'nombre', p.nombre,
                    'cantidad', dv.cantidad,
                    'precio_unitario', dv.precio_unitario,
                    'subtotal', (dv.cantidad * dv.precio_unitario)
                ) ORDER BY dv.cantidad DESC
            ) as productos_list
        FROM ventas_hora vh
        INNER JOIN detalle_venta dv ON dv.venta_id = vh.venta_id
        INNER JOIN productos p ON p.id = dv.producto_id
        GROUP BY vh.hora_num
    ),
    horas_completas AS (
        SELECT generate_series(0, 23) as hora_num
    )
    SELECT 
        LPAD(hc.hora_num::TEXT, 2, '0') || ':00' as hora,
        hc.hora_num as hora_numero,
        COALESCE(SUM(vh.total_venta), 0) as total_ventas,
        COUNT(DISTINCT vh.venta_id)::INTEGER as transacciones,
        COALESCE(pv.productos_list, '[]'::jsonb) as productos
    FROM horas_completas hc
    LEFT JOIN ventas_hora vh ON vh.hora_num = hc.hora_num
    LEFT JOIN productos_vendidos pv ON pv.hora_num = hc.hora_num
    GROUP BY hc.hora_num, pv.productos_list
    ORDER BY hc.hora_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Otorgar permisos
GRANT EXECUTE ON FUNCTION get_ventas_por_hora(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ventas_por_hora(UUID, DATE) TO anon;

GRANT EXECUTE ON FUNCTION get_ventas_por_hora_con_productos(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ventas_por_hora_con_productos(UUID, DATE) TO anon;

-- 4. Recargar schema de PostgREST
NOTIFY pgrst, 'reload schema';

-- ========================================================
-- TEST: Verifica que funciona correctamente
-- ========================================================

-- Reemplaza 'tu-empresa-id' con tu ID real de empresa
-- SELECT * FROM get_ventas_por_hora_con_productos('tu-empresa-id'::UUID, CURRENT_DATE);
