-- Función para actualizar el rol de un usuario
-- Solo puede ser ejecutada por un superadmin

CREATE OR REPLACE FUNCTION update_user_role(
    p_admin_id UUID,
    p_user_id UUID,
    p_new_rol TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_rol TEXT;
    v_current_user_rol TEXT;
    v_result JSONB;
BEGIN
    -- Validar que el admin existe y obtener su rol
    SELECT rol INTO v_admin_rol
    FROM auth.users au
    INNER JOIN public.perfiles p ON p.id = au.id
    WHERE au.id = p_admin_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Admin no encontrado';
    END IF;

    -- Solo superadmin puede cambiar roles
    IF v_admin_rol != 'superadmin' THEN
        RAISE EXCEPTION 'Solo los superadministradores pueden cambiar roles de usuarios';
    END IF;

    -- Validar que el rol es válido
    IF p_new_rol NOT IN ('vendedor', 'gestor', 'admin_vendedor', 'admin_gestor', 'admin', 'superadmin') THEN
        RAISE EXCEPTION 'Rol no válido: %', p_new_rol;
    END IF;

    -- Obtener el rol actual del usuario
    SELECT rol INTO v_current_user_rol
    FROM public.perfiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;

    -- No permitir que un admin cambie su propio rol (validación adicional)
    IF p_admin_id = p_user_id THEN
        RAISE EXCEPTION 'No puedes cambiar tu propio rol';
    END IF;

    -- Actualizar el rol en la tabla perfiles
    UPDATE public.perfiles
    SET 
        rol = p_new_rol::user_role,  -- Cast explícito a tipo ENUM
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Registrar el cambio en un log (opcional, solo si la tabla existe)
    BEGIN
        INSERT INTO public.audit_log (
            admin_id,
            user_id,
            action,
            details,
            created_at
        ) VALUES (
            p_admin_id,
            p_user_id,
            'update_role',
            jsonb_build_object(
                'previous_role', v_current_user_rol,
                'new_role', p_new_rol
            ),
            NOW()
        );
    EXCEPTION
        WHEN undefined_table THEN
            -- Si la tabla audit_log no existe, continuar sin error
            NULL;
    END;

    -- Retornar resultado exitoso
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Rol actualizado correctamente',
        'user_id', p_user_id,
        'previous_role', v_current_user_rol,
        'new_role', p_new_rol
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error al actualizar rol: %', SQLERRM;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION update_user_role IS 'Actualiza el rol de un usuario. Solo puede ser ejecutada por superadmin.';


-- NOTA: Si la tabla audit_log no existe, puedes crearla con:
/*
CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGSERIAL PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin_id ON public.audit_log(admin_id);
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);

COMMENT ON TABLE public.audit_log IS 'Registro de auditoría de acciones administrativas';
*/
