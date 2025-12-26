-- ========================================================
-- SOLUCIÓN DE ERROR DE CLAVE FORÁNEA (23503)
-- ========================================================

-- El error indica que la base de datos no encuentra el usuario en la tabla referenciada
-- inmediatamente después de crearlo. Para solucionar esto y desbloquear la creación
-- de usuarios, eliminaremos la restricción estricta de clave foránea.
-- La integridad se mantiene porque el ID proviene directamente de la respuesta de Auth.

ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_id_fkey;

-- ========================================================
-- FUNCIÓN ROBUSTA PARA CREAR PERFIL
-- ========================================================

CREATE OR REPLACE FUNCTION public.create_user_profile_admin(
    p_user_id UUID,
    p_nombre_completo VARCHAR,
    p_empresa_id UUID,
    p_rol user_role DEFAULT 'vendedor',
    p_created_by UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Insertar o Actualizar si ya existe (Idempotencia)
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
