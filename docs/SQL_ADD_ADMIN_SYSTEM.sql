-- =====================================================
-- MIGRACIÓN: Sistema de Administrador y Roles
-- Fecha: 2025-10-28
-- Descripción: Agrega roles de usuario y sistema de administrador
-- =====================================================

-- 1. Crear tipo ENUM para roles si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'usuario');
    END IF;
END $$;

-- 2. Agregar columna de rol a la tabla perfiles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'perfiles' 
        AND column_name = 'rol'
    ) THEN
        ALTER TABLE perfiles 
        ADD COLUMN rol user_role DEFAULT 'usuario';
    END IF;
END $$;

-- 3. Agregar columna de estado activo/inactivo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'perfiles' 
        AND column_name = 'activo'
    ) THEN
        ALTER TABLE perfiles 
        ADD COLUMN activo BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 4. Agregar columnas de auditoría
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'perfiles' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE perfiles 
        ADD COLUMN created_by UUID REFERENCES perfiles(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'perfiles' 
        AND column_name = 'last_login'
    ) THEN
        ALTER TABLE perfiles 
        ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 5. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_perfiles_rol ON perfiles(rol);
CREATE INDEX IF NOT EXISTS idx_perfiles_activo ON perfiles(activo);
CREATE INDEX IF NOT EXISTS idx_perfiles_empresa_rol ON perfiles(empresa_id, rol);

-- 6. Comentarios para documentación
COMMENT ON COLUMN perfiles.rol IS 'Rol del usuario: superadmin (acceso total), admin (gestión de empresa), usuario (solo uso básico)';
COMMENT ON COLUMN perfiles.activo IS 'Indica si el usuario está activo y puede acceder al sistema';
COMMENT ON COLUMN perfiles.created_by IS 'ID del administrador que creó este usuario';
COMMENT ON COLUMN perfiles.last_login IS 'Fecha y hora del último inicio de sesión';

-- 7. Función para verificar si un usuario es superadmin
CREATE OR REPLACE FUNCTION es_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM perfiles 
        WHERE id = user_id 
        AND rol = 'superadmin' 
        AND activo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Función RPC para listar todos los usuarios (solo superadmin)
CREATE OR REPLACE FUNCTION get_all_users(p_admin_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    nombre_completo TEXT,
    rol user_role,
    activo BOOLEAN,
    empresa_id UUID,
    empresa_nombre TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Verificar que el usuario que llama sea superadmin
    IF NOT es_superadmin(p_admin_id) THEN
        RAISE EXCEPTION 'Acceso denegado: Solo superadmins pueden ver todos los usuarios';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id,
        (SELECT email FROM auth.users WHERE id = p.id) as email,
        p.nombre_completo,
        p.rol,
        p.activo,
        p.empresa_id,
        e.nombre as empresa_nombre,
        p.created_at,
        p.last_login
    FROM perfiles p
    LEFT JOIN empresas e ON p.empresa_id = e.id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Función RPC para crear usuario (solo superadmin)
CREATE OR REPLACE FUNCTION create_user_as_admin(
    p_admin_id UUID,
    p_email TEXT,
    p_password TEXT,
    p_nombre_completo TEXT,
    p_empresa_id UUID,
    p_rol user_role DEFAULT 'usuario'
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Verificar que el usuario que llama sea superadmin
    IF NOT es_superadmin(p_admin_id) THEN
        RAISE EXCEPTION 'Acceso denegado: Solo superadmins pueden crear usuarios';
    END IF;
    
    -- Nota: La creación del usuario en auth.users debe hacerse desde el código
    -- Esta función solo maneja la lógica de permisos
    
    RETURN json_build_object(
        'success', true,
        'message', 'Usuario puede ser creado'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Función RPC para actualizar estado de usuario
CREATE OR REPLACE FUNCTION toggle_user_status(
    p_admin_id UUID,
    p_user_id UUID,
    p_activo BOOLEAN
)
RETURNS JSON AS $$
BEGIN
    -- Verificar que el usuario que llama sea superadmin
    IF NOT es_superadmin(p_admin_id) THEN
        RAISE EXCEPTION 'Acceso denegado: Solo superadmins pueden modificar usuarios';
    END IF;
    
    -- No permitir desactivar al propio superadmin
    IF p_user_id = p_admin_id THEN
        RAISE EXCEPTION 'No puedes desactivarte a ti mismo';
    END IF;
    
    -- Actualizar estado
    UPDATE perfiles
    SET activo = p_activo
    WHERE id = p_user_id;
    
    RETURN json_build_object(
        'success', true,
        'message', CASE 
            WHEN p_activo THEN 'Usuario activado correctamente'
            ELSE 'Usuario desactivado correctamente'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Función RPC para actualizar rol de usuario
CREATE OR REPLACE FUNCTION update_user_role(
    p_admin_id UUID,
    p_user_id UUID,
    p_new_role user_role
)
RETURNS JSON AS $$
BEGIN
    -- Verificar que el usuario que llama sea superadmin
    IF NOT es_superadmin(p_admin_id) THEN
        RAISE EXCEPTION 'Acceso denegado: Solo superadmins pueden modificar roles';
    END IF;
    
    -- No permitir cambiar el rol del propio superadmin
    IF p_user_id = p_admin_id THEN
        RAISE EXCEPTION 'No puedes cambiar tu propio rol';
    END IF;
    
    -- Actualizar rol
    UPDATE perfiles
    SET rol = p_new_role
    WHERE id = p_user_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Rol actualizado correctamente'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger para actualizar last_login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_login = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_last_login'
    ) THEN
        CREATE TRIGGER trigger_update_last_login
        BEFORE UPDATE ON perfiles
        FOR EACH ROW
        WHEN (OLD.* IS DISTINCT FROM NEW.*)
        EXECUTE FUNCTION update_last_login();
    END IF;
END $$;

-- 13. IMPORTANTE: Crear el primer superadmin
-- DEBES reemplazar 'TU_EMAIL@example.com' con tu email real
-- Este script debe ejecutarse UNA VEZ después de crear tu cuenta

-- Descomentar y modificar las siguientes líneas:
/*
UPDATE perfiles 
SET rol = 'superadmin' 
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'TU_EMAIL@example.com' 
    LIMIT 1
);
*/

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada: Sistema de administrador creado';
    RAISE NOTICE '⚠️  IMPORTANTE: Debes ejecutar el UPDATE para asignar el rol superadmin a tu usuario';
    RAISE NOTICE '📝 Edita el SQL y descomenta las líneas finales con tu email';
END $$;
