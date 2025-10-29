-- ============================================
-- ELIMINAR USUARIO COMPLETO (Auth + Perfil + Empresa)
-- ============================================
-- ⚠️ USAR SOLO PARA PRUEBAS - ELIMINA PERMANENTEMENTE

-- INSTRUCCIONES:
-- 1. Reemplaza 'TU-EMAIL-AQUI@ejemplo.com' con el email del usuario
-- 2. Ejecuta todo el script en Supabase SQL Editor

DO $$
DECLARE
    v_user_id UUID;
    v_empresa_id UUID;
    v_email TEXT := 'TU-EMAIL-AQUI@ejemplo.com'; -- ⚠️ CAMBIAR ESTE EMAIL
BEGIN
    RAISE NOTICE '🗑️ Iniciando eliminación de usuario: %', v_email;

    -- 1. Obtener el ID del usuario por email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_email;

    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ Usuario no encontrado con email: %', v_email;
        RETURN;
    END IF;

    RAISE NOTICE '📋 Usuario encontrado: %', v_user_id;

    -- 2. Obtener empresa_id del perfil
    SELECT empresa_id INTO v_empresa_id
    FROM perfiles
    WHERE id = v_user_id;

    -- 3. Eliminar registros relacionados
    
    -- 3a. Eliminar movimientos de inventario
    DELETE FROM movimientos_inventario WHERE usuario_id = v_user_id;
    RAISE NOTICE '   ✓ Movimientos de inventario eliminados';

    -- 3b. Eliminar ventas y detalles
    DELETE FROM detalle_venta WHERE venta_id IN (
        SELECT id FROM ventas WHERE usuario_id = v_user_id
    );
    DELETE FROM ventas WHERE usuario_id = v_user_id;
    RAISE NOTICE '   ✓ Ventas eliminadas';

    -- 3c. Eliminar perfil
    DELETE FROM perfiles WHERE id = v_user_id;
    RAISE NOTICE '   ✓ Perfil eliminado';

    -- 4. Eliminar empresa (si no tiene otros usuarios)
    IF v_empresa_id IS NOT NULL THEN
        -- Verificar si hay otros usuarios en la empresa
        IF NOT EXISTS (SELECT 1 FROM perfiles WHERE empresa_id = v_empresa_id) THEN
            -- Eliminar datos de la empresa
            DELETE FROM configuraciones_empresa WHERE empresa_id = v_empresa_id;
            DELETE FROM cierres_caja WHERE empresa_id = v_empresa_id;
            DELETE FROM estado_caja WHERE empresa_id = v_empresa_id;
            DELETE FROM movimientos_inventario WHERE empresa_id = v_empresa_id;
            DELETE FROM detalle_venta WHERE empresa_id = v_empresa_id;
            DELETE FROM ventas WHERE empresa_id = v_empresa_id;
            DELETE FROM productos WHERE empresa_id = v_empresa_id;
            DELETE FROM empresas WHERE id = v_empresa_id;
            RAISE NOTICE '   ✓ Empresa y todos sus datos eliminados';
        ELSE
            RAISE NOTICE '   ⚠ Empresa NO eliminada (tiene otros usuarios)';
        END IF;
    END IF;

    -- 5. Eliminar usuario de auth
    DELETE FROM auth.users WHERE id = v_user_id;
    RAISE NOTICE '   ✓ Usuario eliminado de auth.users';

    RAISE NOTICE '✅ Usuario % eliminado completamente', v_email;
END $$;

-- Verificar que no exista el usuario
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'TU-EMAIL-AQUI@ejemplo.com')
        THEN '❌ El usuario aún existe'
        ELSE '✅ Usuario eliminado correctamente'
    END as resultado;
