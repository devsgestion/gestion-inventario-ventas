-- =====================================================
-- SCRIPT PARA ELIMINAR FUNCIONES NO USADAS
-- =====================================================
-- Fecha: 6 de Noviembre, 2025
-- Propósito: Limpiar funciones legacy que no están siendo usadas en el código

-- ⚠️ ADVERTENCIA: Ejecutar solo si estás seguro
-- Verifica que estas funciones no estén en políticas RLS antes de eliminar

-- =====================================================
-- FUNCIONES LEGACY CONFIRMADAS COMO NO USADAS
-- =====================================================

-- 1. add_profile_to_tenant
-- Razón: No hay código que la llame, la funcionalidad de multi-usuario
--        por empresa no está implementada actualmente
DROP FUNCTION IF EXISTS public.add_profile_to_tenant(UUID, TEXT, VARCHAR, UUID);

-- 2. get_ventas_por_fecha
-- Razón: Similar a get_ventas_del_dia, no está en uso
--        Funcionalidad duplicada
DROP FUNCTION IF EXISTS public.get_ventas_por_fecha(UUID, DATE);

-- 3. get_reporte_ventas
-- Razón: Funcionalidad duplicada, no está en uso
--        Usar get_ventas_del_dia para reportes
DROP FUNCTION IF EXISTS public.get_reporte_ventas(UUID);

-- 4. get_current_tenant_id (VERIFICAR PRIMERO)
-- Razón: No se usa en código JavaScript, pero podría estar en políticas RLS
-- ⚠️ IMPORTANTE: Ejecutar esta query primero para verificar:
/*
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    definition 
FROM pg_policies 
WHERE definition LIKE '%get_current_tenant_id%';
*/
-- Si la query anterior no devuelve resultados, es seguro eliminar:
-- DROP FUNCTION IF EXISTS public.get_current_tenant_id();

-- =====================================================
-- VERIFICACIÓN POST-ELIMINACIÓN
-- =====================================================

-- Listar todas las funciones que quedan en public schema
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Después de ejecutar este script, solo deberían quedar estas funciones:
--
-- FUNCIONES ACTIVAS:
-- ✅ anular_cambio_devolucion
-- ✅ create_tenant_and_profile
-- ✅ create_user_profile_admin
-- ✅ es_superadmin
-- ✅ get_all_users
-- ✅ get_detalle_venta_by_date
-- ✅ get_products_count_by_empresa
-- ✅ get_utilidad_del_dia
-- ✅ get_ventas_del_dia
-- ✅ procesar_cambio_devolucion
-- ✅ registrar_compra
-- ✅ registrar_venta
-- ✅ toggle_user_status
-- ✅ update_cambios_devoluciones_updated_at
-- ✅ update_last_login
-- ✅ update_updated_at_column
-- ✅ update_user_role
--
-- TRIGGERS:
-- ✅ on_auth_user_created
-- ✅ trigger_cambios_devoluciones_updated_at
-- ✅ update_perfiles_updated_at

SELECT '✅ Funciones legacy eliminadas correctamente' as status;
