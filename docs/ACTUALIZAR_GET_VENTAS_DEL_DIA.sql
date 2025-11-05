-- =====================================================
-- ACTUALIZAR FUNCIÓN get_ventas_del_dia
-- Para incluir cambios/devoluciones en el cierre de caja
-- =====================================================

-- 1. Eliminar la función existente
DROP FUNCTION IF EXISTS get_ventas_del_dia(UUID);

-- 2. Crear la función actualizada
CREATE OR REPLACE FUNCTION get_ventas_del_dia(p_empresa_id UUID)
RETURNS TABLE(
    total_ventas NUMERIC,
    cantidad_transacciones INTEGER
) AS $$
DECLARE
    v_total_ventas NUMERIC;
    v_total_cambios NUMERIC;
    v_cantidad_ventas INTEGER;
    v_cantidad_cambios INTEGER;
    v_total_final NUMERIC;
    v_cantidad_final INTEGER;
BEGIN
    -- 1. Calcular total de ventas normales del día
    SELECT 
        COALESCE(SUM(total_venta), 0),
        COALESCE(COUNT(*), 0)
    INTO 
        v_total_ventas,
        v_cantidad_ventas
    FROM ventas
    WHERE empresa_id = p_empresa_id
    AND DATE(fecha_venta) = CURRENT_DATE;

    -- 2. Calcular diferencias de cambios/devoluciones del día
    -- (Solo afecta el dinero que entró o salió)
    SELECT 
        COALESCE(SUM(diferencia), 0),
        COALESCE(COUNT(*), 0)
    INTO 
        v_total_cambios,
        v_cantidad_cambios
    FROM cambios_devoluciones
    WHERE empresa_id = p_empresa_id
    AND DATE(created_at) = CURRENT_DATE;

    -- 3. Calcular totales finales
    -- El total de ingresos = ventas + diferencias de cambios
    -- Si diferencia > 0: cliente pagó extra (suma)
    -- Si diferencia < 0: se devolvió dinero (resta)
    v_total_final := v_total_ventas + v_total_cambios;
    v_cantidad_final := v_cantidad_ventas;  -- Solo contamos ventas, no cambios

    -- 4. Retornar resultados
    RETURN QUERY SELECT v_total_final, v_cantidad_final;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTARIOS EXPLICATIVOS:
-- =====================================================

-- Esta función actualizada incluye:
-- 1. Total de ventas normales del día
-- 2. + Diferencias de cambios/devoluciones (pueden ser + o -)
-- 
-- Ejemplo:
-- - Ventas del día: $500,000
-- - Cambio 1: Cliente devolvió $100,000 y llevó $150,000 → diferencia: +$50,000
-- - Cambio 2: Cliente devolvió $80,000 y llevó $60,000 → diferencia: -$20,000
-- - Total en caja: $500,000 + $50,000 - $20,000 = $530,000 ✅
--
-- Esto garantiza que el historial de caja refleje
-- EXACTAMENTE el dinero que debe haber en la caja física.

-- =====================================================
-- VERIFICACIÓN:
-- =====================================================
-- SELECT * FROM get_ventas_del_dia('tu-empresa-id-aqui');
