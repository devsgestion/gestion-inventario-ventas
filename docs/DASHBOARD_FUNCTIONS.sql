-- ========================================================
-- FUNCIONES RPC PARA DASHBOARD
-- Sistema de Gestión de Inventario y Ventas
-- Fecha de creación: 7 de Noviembre, 2025
-- ========================================================

-- ========================================================
-- 1. GET_VENTAS_ULTIMOS_30_DIAS
-- Obtiene las ventas agrupadas por día de los últimos 30 días
-- ========================================================

CREATE OR REPLACE FUNCTION get_ventas_ultimos_30_dias(p_empresa_id UUID)
RETURNS TABLE(
    fecha DATE,
    total_ventas NUMERIC,
    total_costos NUMERIC,
    utilidad NUMERIC,
    cantidad_transacciones BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(v.fecha_venta AT TIME ZONE 'America/Bogota') as fecha,
        COALESCE(SUM(dv.precio_unitario * dv.cantidad), 0) as total_ventas,
        COALESCE(SUM(dv.costo_unitario * dv.cantidad), 0) as total_costos,
        COALESCE(SUM((dv.precio_unitario - dv.costo_unitario) * dv.cantidad), 0) as utilidad,
        COUNT(DISTINCT v.id) as cantidad_transacciones
    FROM ventas v
    LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
    WHERE 
        v.empresa_id = p_empresa_id
        AND v.fecha_venta >= (NOW() AT TIME ZONE 'America/Bogota' - INTERVAL '30 days')
    GROUP BY DATE(v.fecha_venta AT TIME ZONE 'America/Bogota')
    ORDER BY fecha DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 2. GET_PRODUCTOS_MAS_VENDIDOS
-- Obtiene los productos más vendidos (top N) en un rango de fechas
-- ========================================================

CREATE OR REPLACE FUNCTION get_productos_mas_vendidos(
    p_empresa_id UUID,
    p_limite INTEGER DEFAULT 10,
    p_dias INTEGER DEFAULT 30
)
RETURNS TABLE(
    producto_id UUID,
    producto_nombre VARCHAR,
    producto_referencia VARCHAR,
    cantidad_vendida BIGINT,
    total_ingresos NUMERIC,
    total_utilidad NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as producto_id,
        p.nombre as producto_nombre,
        p.codigo_referencia as producto_referencia,
        SUM(dv.cantidad)::BIGINT as cantidad_vendida,
        SUM(dv.precio_unitario * dv.cantidad) as total_ingresos,
        SUM((dv.precio_unitario - dv.costo_unitario) * dv.cantidad) as total_utilidad
    FROM productos p
    INNER JOIN detalle_venta dv ON p.id = dv.producto_id
    INNER JOIN ventas v ON dv.venta_id = v.id
    WHERE 
        p.empresa_id = p_empresa_id
        AND v.fecha_venta >= (NOW() AT TIME ZONE 'America/Bogota' - (p_dias || ' days')::INTERVAL)
    GROUP BY p.id, p.nombre, p.codigo_referencia
    ORDER BY cantidad_vendida DESC
    LIMIT p_limite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 3. GET_PRODUCTOS_BAJO_STOCK
-- Obtiene productos con stock igual o menor al mínimo configurado
-- ========================================================

CREATE OR REPLACE FUNCTION get_productos_bajo_stock(p_empresa_id UUID)
RETURNS TABLE(
    producto_id UUID,
    producto_nombre VARCHAR,
    producto_referencia VARCHAR,
    stock_actual INTEGER,
    stock_minimo INTEGER,
    deficit INTEGER,
    valor_reposicion NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as producto_id,
        p.nombre as producto_nombre,
        p.codigo_referencia as producto_referencia,
        p.stock_actual,
        p.alerta_stock_min as stock_minimo,
        (p.alerta_stock_min - p.stock_actual) as deficit,
        ((p.alerta_stock_min - p.stock_actual) * p.precio_costo) as valor_reposicion
    FROM productos p
    WHERE 
        p.empresa_id = p_empresa_id
        AND p.activo = true
        AND p.stock_actual <= p.alerta_stock_min
    ORDER BY deficit DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 4. GET_COMPARACION_MENSUAL
-- Compara el mes actual vs el mes anterior
-- ========================================================

CREATE OR REPLACE FUNCTION get_comparacion_mensual(p_empresa_id UUID)
RETURNS TABLE(
    mes_actual_ventas NUMERIC,
    mes_actual_utilidad NUMERIC,
    mes_actual_transacciones BIGINT,
    mes_anterior_ventas NUMERIC,
    mes_anterior_utilidad NUMERIC,
    mes_anterior_transacciones BIGINT,
    variacion_ventas NUMERIC,
    variacion_utilidad NUMERIC,
    variacion_transacciones NUMERIC
) AS $$
DECLARE
    v_mes_actual_ventas NUMERIC;
    v_mes_actual_utilidad NUMERIC;
    v_mes_actual_transacciones BIGINT;
    v_mes_anterior_ventas NUMERIC;
    v_mes_anterior_utilidad NUMERIC;
    v_mes_anterior_transacciones BIGINT;
BEGIN
    -- Datos del mes actual
    SELECT 
        COALESCE(SUM(dv.precio_unitario * dv.cantidad), 0),
        COALESCE(SUM((dv.precio_unitario - dv.costo_unitario) * dv.cantidad), 0),
        COUNT(DISTINCT v.id)
    INTO v_mes_actual_ventas, v_mes_actual_utilidad, v_mes_actual_transacciones
    FROM ventas v
    LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
    WHERE 
        v.empresa_id = p_empresa_id
        AND DATE_TRUNC('month', v.fecha_venta AT TIME ZONE 'America/Bogota') = 
            DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Bogota');

    -- Datos del mes anterior
    SELECT 
        COALESCE(SUM(dv.precio_unitario * dv.cantidad), 0),
        COALESCE(SUM((dv.precio_unitario - dv.costo_unitario) * dv.cantidad), 0),
        COUNT(DISTINCT v.id)
    INTO v_mes_anterior_ventas, v_mes_anterior_utilidad, v_mes_anterior_transacciones
    FROM ventas v
    LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
    WHERE 
        v.empresa_id = p_empresa_id
        AND DATE_TRUNC('month', v.fecha_venta AT TIME ZONE 'America/Bogota') = 
            DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Bogota' - INTERVAL '1 month');

    RETURN QUERY
    SELECT 
        v_mes_actual_ventas,
        v_mes_actual_utilidad,
        v_mes_actual_transacciones,
        v_mes_anterior_ventas,
        v_mes_anterior_utilidad,
        v_mes_anterior_transacciones,
        -- Variación porcentual de ventas
        CASE 
            WHEN v_mes_anterior_ventas > 0 THEN 
                ROUND(((v_mes_actual_ventas - v_mes_anterior_ventas) / v_mes_anterior_ventas * 100), 2)
            ELSE 0 
        END as variacion_ventas,
        -- Variación porcentual de utilidad
        CASE 
            WHEN v_mes_anterior_utilidad > 0 THEN 
                ROUND(((v_mes_actual_utilidad - v_mes_anterior_utilidad) / v_mes_anterior_utilidad * 100), 2)
            ELSE 0 
        END as variacion_utilidad,
        -- Variación porcentual de transacciones
        CASE 
            WHEN v_mes_anterior_transacciones > 0 THEN 
                ROUND(((v_mes_actual_transacciones::NUMERIC - v_mes_anterior_transacciones::NUMERIC) / v_mes_anterior_transacciones::NUMERIC * 100), 2)
            ELSE 0 
        END as variacion_transacciones;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 5. GET_RESUMEN_GENERAL
-- Obtiene estadísticas generales del negocio
-- ========================================================

CREATE OR REPLACE FUNCTION get_resumen_general(p_empresa_id UUID)
RETURNS TABLE(
    total_productos INTEGER,
    productos_activos INTEGER,
    productos_bajo_stock INTEGER,
    valor_inventario NUMERIC,
    total_ventas_hoy NUMERIC,
    total_ventas_mes NUMERIC,
    utilidad_mes NUMERIC,
    ticket_promedio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Total de productos
        (SELECT COUNT(*)::INTEGER FROM productos WHERE empresa_id = p_empresa_id),
        -- Productos activos
        (SELECT COUNT(*)::INTEGER FROM productos WHERE empresa_id = p_empresa_id AND activo = true),
        -- Productos bajo stock
        (SELECT COUNT(*)::INTEGER FROM productos 
         WHERE empresa_id = p_empresa_id AND activo = true AND stock_actual <= alerta_stock_min),
        -- Valor del inventario (stock * costo)
        (SELECT COALESCE(SUM(stock_actual * precio_costo), 0) 
         FROM productos WHERE empresa_id = p_empresa_id AND activo = true),
        -- Ventas de hoy
        (SELECT COALESCE(SUM(total_venta), 0) 
         FROM ventas 
         WHERE empresa_id = p_empresa_id 
         AND DATE(fecha_venta AT TIME ZONE 'America/Bogota') = CURRENT_DATE),
        -- Ventas del mes
        (SELECT COALESCE(SUM(dv.precio_unitario * dv.cantidad), 0)
         FROM ventas v
         LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
         WHERE v.empresa_id = p_empresa_id
         AND DATE_TRUNC('month', v.fecha_venta AT TIME ZONE 'America/Bogota') = 
             DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Bogota')),
        -- Utilidad del mes
        (SELECT COALESCE(SUM((dv.precio_unitario - dv.costo_unitario) * dv.cantidad), 0)
         FROM ventas v
         LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
         WHERE v.empresa_id = p_empresa_id
         AND DATE_TRUNC('month', v.fecha_venta AT TIME ZONE 'America/Bogota') = 
             DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Bogota')),
        -- Ticket promedio del mes
        (SELECT CASE 
            WHEN COUNT(v.id) > 0 THEN ROUND(SUM(v.total_venta) / COUNT(v.id), 2)
            ELSE 0 
         END
         FROM ventas v
         WHERE v.empresa_id = p_empresa_id
         AND DATE_TRUNC('month', v.fecha_venta AT TIME ZONE 'America/Bogota') = 
             DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Bogota'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 6. GET_VENTAS_POR_HORA
-- Obtiene las ventas agrupadas por hora del día (útil para ver picos de venta)
-- ========================================================

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

-- ========================================================
-- PERMISOS
-- Otorgar permisos de ejecución a usuarios autenticados
-- ========================================================

GRANT EXECUTE ON FUNCTION get_ventas_ultimos_30_dias(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_productos_mas_vendidos(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_productos_bajo_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_comparacion_mensual(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_resumen_general(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ventas_por_hora(UUID, DATE) TO authenticated;

-- ========================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ========================================================

-- Índice compuesto para ventas por fecha
CREATE INDEX IF NOT EXISTS idx_ventas_empresa_fecha_venta 
ON ventas(empresa_id, fecha_venta DESC);

-- Índice para productos bajo stock
CREATE INDEX IF NOT EXISTS idx_productos_stock_alerta 
ON productos(empresa_id, stock_actual, alerta_stock_min) 
WHERE activo = true;

-- Índice para detalle de venta por fecha (a través de ventas)
CREATE INDEX IF NOT EXISTS idx_detalle_venta_producto_empresa 
ON detalle_venta(producto_id, empresa_id);

-- ========================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ========================================================

COMMENT ON FUNCTION get_ventas_ultimos_30_dias IS 
'Retorna las ventas diarias de los últimos 30 días con totales, costos, utilidad y cantidad de transacciones';

COMMENT ON FUNCTION get_productos_mas_vendidos IS 
'Retorna los N productos más vendidos en los últimos X días con sus totales e ingresos';

COMMENT ON FUNCTION get_productos_bajo_stock IS 
'Retorna productos cuyo stock actual está en o por debajo del stock mínimo configurado';

COMMENT ON FUNCTION get_comparacion_mensual IS 
'Compara las métricas del mes actual vs el mes anterior con porcentajes de variación';

COMMENT ON FUNCTION get_resumen_general IS 
'Retorna un resumen general de las estadísticas clave del negocio';

COMMENT ON FUNCTION get_ventas_por_hora IS 
'Retorna las ventas agrupadas por hora para un día específico';

-- ========================================================
-- SCRIPT DE VERIFICACIÓN
-- Para verificar que las funciones funcionan correctamente
-- ========================================================

/*
-- Prueba de funciones (reemplaza 'tu-empresa-id' con un UUID válido):

SELECT * FROM get_ventas_ultimos_30_dias('tu-empresa-id');
SELECT * FROM get_productos_mas_vendidos('tu-empresa-id', 10, 30);
SELECT * FROM get_productos_bajo_stock('tu-empresa-id');
SELECT * FROM get_comparacion_mensual('tu-empresa-id');
SELECT * FROM get_resumen_general('tu-empresa-id');
SELECT * FROM get_ventas_por_hora('tu-empresa-id', CURRENT_DATE);
*/

-- ========================================================
-- FIN DEL SCRIPT
-- ========================================================
