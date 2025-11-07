-- ========================================================
-- FUNCIÓN: get_ventas_por_hora_con_productos
-- Obtiene ventas por hora del día CON lista de productos vendidos
-- ========================================================

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
                    'precio_venta', dv.precio_venta,
                    'subtotal', dv.subtotal
                ) ORDER BY dv.cantidad DESC
            ) as productos_list
        FROM ventas_hora vh
        INNER JOIN detalle_ventas dv ON dv.venta_id = vh.venta_id
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

-- ========================================================
-- PERMISOS
-- ========================================================

GRANT EXECUTE ON FUNCTION get_ventas_por_hora_con_productos(UUID, DATE) TO authenticated;

-- ========================================================
-- COMENTARIOS
-- ========================================================

COMMENT ON FUNCTION get_ventas_por_hora_con_productos IS 
'Retorna ventas agrupadas por hora del día, incluyendo:
- Hora en formato HH:00
- Total de ventas ($)
- Cantidad de transacciones
- Lista de productos vendidos con cantidad y subtotal (JSONB)';

-- ========================================================
-- EJEMPLO DE USO
-- ========================================================

/*
-- Obtener ventas por hora de hoy con productos
SELECT * FROM get_ventas_por_hora_con_productos('tu-empresa-id', CURRENT_DATE);

-- Resultado esperado:
hora  | hora_numero | total_ventas | transacciones | productos
------|-------------|--------------|---------------|--------------------------------------------------
08:00 | 8           | 150000       | 3             | [{"nombre": "Camisa Polo", "cantidad": 2, ...}]
09:00 | 9           | 0            | 0             | []
10:00 | 10          | 250000       | 5             | [{"nombre": "Jean Slim", "cantidad": 4, ...}]
...
*/
