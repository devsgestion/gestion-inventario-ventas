-- ============================================
-- FUNCIÓN: Crear usuario completo desde panel de admin (VERSIÓN FINAL)
-- ============================================
-- ⚠️ EJECUTAR EN SUPABASE SQL EDITOR

-- 1️⃣ Eliminar versiones anteriores
DROP FUNCTION IF EXISTS create_user_from_admin(UUID, TEXT, TEXT, TEXT, TEXT, user_role);
DROP FUNCTION IF EXISTS create_user_from_admin(UUID, TEXT, TEXT, TEXT, user_role);
DROP FUNCTION IF EXISTS complete_user_profile_from_admin(UUID, UUID, TEXT, user_role, UUID);

-- 2️⃣ Crear función para insertar perfil con permisos elevados
CREATE OR REPLACE FUNCTION create_user_profile_admin(
    p_user_id UUID,
    p_nombre_completo TEXT,
    p_empresa_id UUID,
    p_rol user_role,
    p_created_by UUID
)
RETURNS VOID AS $$
BEGIN
    -- Insertar perfil con SECURITY DEFINER para bypass RLS
    INSERT INTO public.perfiles (
        id,
        nombre,
        nombre_completo,
        empresa_id,
        rol,
        activo,
        created_by
    )
    VALUES (
        p_user_id,
        p_nombre_completo,
        p_nombre_completo,
        p_empresa_id,
        p_rol,
        true,
        p_created_by
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3️⃣ Comentario
COMMENT ON FUNCTION create_user_profile_admin IS 
'Crea perfil de usuario con permisos elevados (bypass RLS). Solo para admin.';

-- ✅ Verificar
SELECT '✅ Función create_user_profile_admin creada correctamente' as status;
