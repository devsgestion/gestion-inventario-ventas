-- =====================================================
-- VERIFICAR SI LOS CAMBIOS SE ESTÁN CONTANDO EN CAJA
-- =====================================================

-- 1. Ver tus cambios/devoluciones de hoy
SELECT 
    created_at,
    valor_devolucion,
    valor_nuevos,
    diferencia,
    motivo
FROM cambios_devoluciones
WHERE empresa_id = 'TU_EMPRESA_ID_AQUI'
AND DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- 2. Ver ventas de hoy
SELECT 
    fecha_venta,
    total_venta,
    numero_venta
FROM ventas
WHERE empresa_id = 'TU_EMPRESA_ID_AQUI'
AND DATE(fecha_venta) = CURRENT_DATE
ORDER BY fecha_venta DESC;

-- 3. Ejecutar la función get_ventas_del_dia
SELECT * FROM get_ventas_del_dia('TU_EMPRESA_ID_AQUI');

-- 4. Ver el último cierre de caja
SELECT 
    fecha_cierre,
    total_ingresos,
    total_transacciones
FROM cierres_caja
WHERE empresa_id = 'TU_EMPRESA_ID_AQUI'
ORDER BY fecha_cierre DESC
LIMIT 1;

-- =====================================================
-- CÓMO USAR ESTE SCRIPT:
-- =====================================================
-- 1. Reemplaza 'TU_EMPRESA_ID_AQUI' con tu empresa_id real
--    Para obtenerlo: SELECT id FROM empresas;
--
-- 2. Ejecuta cada consulta por separado
--
-- 3. Verifica:
--    - Consulta 1: ¿Hay cambios registrados? ¿Cuál es la diferencia?
--    - Consulta 2: ¿Cuánto suman las ventas?
--    - Consulta 3: ¿El total incluye ventas + diferencias?
--    - Consulta 4: ¿El cierre refleja el total correcto?

-- =====================================================
-- EJEMPLO DE RESULTADO ESPERADO:
-- =====================================================
-- Consulta 1 (Cambios):
-- diferencia: +50000 (cliente pagó extra)
--
-- Consulta 2 (Ventas):
-- total_venta: 100000 + 200000 = 300000
--
-- Consulta 3 (Función):
-- total_ventas: 350000 (300000 + 50000) ✅
--
-- Consulta 4 (Cierre):
-- total_ingresos: 350000 ✅
