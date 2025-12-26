-- ========================================================
-- FUNCIÓN CORREGIDA PARA CREAR PERFIL DE USUARIO (ADMIN)
-- ========================================================

-- Esta función permite a un administrador crear el perfil de un nuevo usuario
-- incluyendo el campo 'created_by' para auditoría.

CREATE OR REPLACE FUNCTION public.create_user_profile_admin(
    p_user_id UUID,
    p_nombre_completo VARCHAR,
    p_empresa_id UUID,
    p_rol user_role DEFAULT 'vendedor',
    p_created_by UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Crear el PERFIL del nuevo usuario con el rol especificado
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
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- FUNCIÓN PARA CAMBIAR ESTADO DE USUARIO (ACTIVAR/DESACTIVAR)
-- ========================================================

DROP FUNCTION IF EXISTS public.toggle_user_status(uuid, uuid, boolean);

CREATE OR REPLACE FUNCTION public.toggle_user_status(
    p_admin_id UUID,
    p_user_id UUID,
    p_activo BOOLEAN
) RETURNS JSONB AS $$
DECLARE
    v_admin_role VARCHAR;
BEGIN
    -- Verificar permisos del admin
    SELECT rol INTO v_admin_role FROM public.perfiles WHERE id = p_admin_id;
    
    IF v_admin_role IS DISTINCT FROM 'superadmin' AND v_admin_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'No tienes permisos para realizar esta acción.';
    END IF;

    -- Actualizar estado
    UPDATE public.perfiles
    SET activo = p_activo
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Estado del usuario actualizado correctamente.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
