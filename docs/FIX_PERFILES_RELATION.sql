-- ========================================================
-- REPARAR RELACIÓN ENTRE PERFILES Y AUTH.USERS
-- ========================================================

-- 1. Eliminar la restricción actual (que podría estar defectuosa)
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_id_fkey;

-- 2. Eliminar restricción de created_by si existe (para evitar ciclos)
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_created_by_fkey;

-- 3. Recrear la restricción apuntando EXPLÍCITAMENTE a auth.users
-- Esto asegura que el ID del perfil DEBE existir en la tabla de usuarios de Supabase
ALTER TABLE public.perfiles 
    ADD CONSTRAINT perfiles_id_fkey 
    FOREIGN KEY (id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- 4. Recrear la restricción de created_by (autorreferencia a perfiles)
ALTER TABLE public.perfiles 
    ADD CONSTRAINT perfiles_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES public.perfiles(id) 
    ON DELETE SET NULL;

-- 5. Verificar que la función de creación de perfil esté correcta
CREATE OR REPLACE FUNCTION public.create_user_profile_admin(
    p_user_id UUID,
    p_nombre_completo VARCHAR,
    p_empresa_id UUID,
    p_rol user_role DEFAULT 'vendedor',
    p_created_by UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Intentar insertar, si ya existe (race condition), actualizar
    INSERT INTO public.perfiles (
        id, 
        nombre, 
        rol, 
        empresa_id, 
        nombre_completo, 
        activo,
        created_by
    )
    VALUES (
        p_user_id, 
        p_nombre_completo, 
        p_rol, 
        p_empresa_id, 
        p_nombre_completo, 
        true,
        p_created_by
    )
    ON CONFLICT (id) DO UPDATE SET
        nombre_completo = EXCLUDED.nombre_completo,
        rol = EXCLUDED.rol,
        empresa_id = EXCLUDED.empresa_id,
        activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;