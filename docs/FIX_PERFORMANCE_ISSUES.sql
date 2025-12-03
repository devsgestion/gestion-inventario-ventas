-- ==============================================================================
-- 🚀 OPTIMIZACIÓN DE RENDIMIENTO Y CORRECCIÓN DE ERRORES (TIMEOUTS)
-- ==============================================================================
-- Este script optimiza las funciones críticas que están causando timeouts (Error 57014)
-- y errores 500 en el servidor.
--
-- INSTRUCCIONES:
-- 1. Copia todo el contenido de este archivo.
-- 2. Ve al Editor SQL de Supabase.
-- 3. Pega el contenido y ejecútalo.
-- ==============================================================================

-- 1. CREACIÓN DE ÍNDICES (CRÍTICO PARA EL RENDIMIENTO)
-- Estos índices aceleran drásticamente las consultas por fecha y empresa.

CREATE INDEX IF NOT EXISTS idx_ventas_empresa_fecha ON public.ventas (empresa_id, fecha_venta);
CREATE INDEX IF NOT EXISTS idx_cambios_empresa_fecha ON public.cambios_devoluciones (empresa_id, created_at);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta_id ON public.detalle_venta (venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_empresa ON public.detalle_venta (empresa_id);

-- 2. OPTIMIZACIÓN DE get_ventas_del_dia
-- Reemplaza la versión lenta que usaba casting de fechas por una versión optimizada
-- que usa rangos de fechas y CTEs (Common Table Expressions).

DROP FUNCTION IF EXISTS public.get_ventas_del_dia(UUID);

CREATE OR REPLACE FUNCTION public.get_ventas_del_dia(
    p_empresa_id UUID
) RETURNS TABLE(
    total_ventas NUMERIC,
    cantidad_transacciones BIGINT,
    total_items_vendidos BIGINT,
    total_diferencia_cambios NUMERIC
) AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    -- Calcular inicio y fin del día una sola vez
    -- 🛑 CORRECCIÓN TIMEZONE: Se asegura que sea medianoche en Bogotá, no en UTC
    v_start_date := date_trunc('day', now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota';
    v_end_date := v_start_date + interval '1 day';

    RETURN QUERY
    WITH ventas_dia AS (
        SELECT id, total_venta
        FROM public.ventas
        WHERE empresa_id = p_empresa_id
        AND fecha_venta >= v_start_date
        AND fecha_venta < v_end_date
    ),
    items_dia AS (
        SELECT SUM(dv.cantidad) as total_items
        FROM public.detalle_venta dv
        WHERE dv.venta_id IN (SELECT id FROM ventas_dia)
    ),
    cambios_dia AS (
        SELECT SUM(diferencia) as total_diferencia
        FROM public.cambios_devoluciones
        WHERE empresa_id = p_empresa_id
        AND created_at >= v_start_date
        AND created_at < v_end_date
        AND anulado = FALSE
    )
    SELECT
        COALESCE((SELECT SUM(total_venta) FROM ventas_dia), 0) AS total_ventas,
        COALESCE((SELECT COUNT(*) FROM ventas_dia), 0) AS cantidad_transacciones,
        COALESCE((SELECT total_items FROM items_dia), 0) AS total_items_vendidos,
        COALESCE((SELECT total_diferencia FROM cambios_dia), 0) AS total_diferencia_cambios;
END;
$$ LANGUAGE plpgsql;

-- 3. OPTIMIZACIÓN DE get_utilidad_del_dia
-- Optimiza el cálculo de utilidad usando rangos de fechas en lugar de funciones en el WHERE.

DROP FUNCTION IF EXISTS public.get_utilidad_del_dia(UUID);

CREATE OR REPLACE FUNCTION public.get_utilidad_del_dia(
    p_empresa_id UUID
) RETURNS TABLE(
    total_ventas NUMERIC,
    total_costos NUMERIC,
    utilidad_neta NUMERIC
) AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    -- 🛑 CORRECCIÓN TIMEZONE: Se asegura que sea medianoche en Bogotá, no en UTC
    v_start_date := date_trunc('day', now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota';
    v_end_date := v_start_date + interval '1 day';

    RETURN QUERY
    SELECT
        COALESCE(SUM(dv.precio_unitario * dv.cantidad), 0) AS total_ventas,
        COALESCE(SUM(dv.costo_unitario * dv.cantidad), 0) AS total_costos,
        COALESCE(SUM((dv.precio_unitario - dv.costo_unitario) * dv.cantidad), 0) AS utilidad_neta
    FROM public.detalle_venta dv
    JOIN public.ventas v ON v.id = dv.venta_id
    WHERE 
        dv.empresa_id = p_empresa_id 
        AND v.fecha_venta >= v_start_date
        AND v.fecha_venta < v_end_date;
END;
$$ LANGUAGE plpgsql;

-- 4. OPTIMIZACIÓN DE get_detalle_venta_by_date (Opcional pero recomendado)
-- Asegura que use índices correctamente.

DROP FUNCTION IF EXISTS public.get_detalle_venta_by_date(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_detalle_venta_by_date(
    p_empresa_id UUID,
    p_fecha_inicio TIMESTAMPTZ,
    p_fecha_fin TIMESTAMPTZ
) RETURNS TABLE(
    producto_id UUID,
    nombre_producto VARCHAR,
    referencia VARCHAR,
    cantidad_vendida BIGINT,
    precio_unitario NUMERIC,
    total_linea NUMERIC
) AS $$
    SELECT
        dv.producto_id,
        p.nombre AS nombre_producto,
        p.codigo_referencia AS referencia,
        SUM(dv.cantidad) AS cantidad_vendida,
        dv.precio_unitario,
        SUM(dv.cantidad * dv.precio_unitario) AS total_linea
    FROM public.detalle_venta dv
    JOIN public.productos p ON dv.producto_id = p.id
    JOIN public.ventas v ON dv.venta_id = v.id
    WHERE 
        dv.empresa_id = p_empresa_id 
        AND v.fecha_venta >= p_fecha_inicio
        AND v.fecha_venta < p_fecha_fin
    GROUP BY 
        dv.producto_id, p.nombre, p.codigo_referencia, dv.precio_unitario
    ORDER BY 
        cantidad_vendida DESC;
$$ LANGUAGE sql;
