-- ============================================
-- MIGRACIÓN SIMPLIFICADA - SISTEMA DE ADMINISTRACIÓN
-- ============================================
-- ⚠️ EJECUTA TODO ESTE ARCHIVO EN SUPABASE SQL EDITOR

-- 1️⃣ Crear tipo ENUM para roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'usuario');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2️⃣ Agregar columnas nuevas a la tabla perfiles
ALTER TABLE perfiles 
ADD COLUMN IF NOT EXISTS nombre_completo TEXT,
ADD COLUMN IF NOT EXISTS rol user_role DEFAULT 'usuario',
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES perfiles(id),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 3️⃣ Migrar datos existentes (nombre → nombre_completo)
UPDATE perfiles 
SET nombre_completo = COALESCE(nombre_completo, nombre)
WHERE nombre_completo IS NULL AND nombre IS NOT NULL;

-- 4️⃣ Migrar roles existentes (is_admin → rol)
UPDATE perfiles 
SET rol = CASE 
    WHEN is_admin = true THEN 'admin'::user_role
    ELSE 'usuario'::user_role
END
WHERE rol IS NULL OR rol = 'usuario';

-- 5️⃣ Eliminar funciones antiguas si existen
DROP FUNCTION IF EXISTS es_superadmin(UUID);
DROP FUNCTION IF EXISTS get_all_users(UUID);
DROP FUNCTION IF EXISTS toggle_user_status(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS update_user_role(UUID, UUID, user_role);

-- 6️⃣ Crear función: verificar si un usuario es superadmin
CREATE OR REPLACE FUNCTION es_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = user_id AND rol = 'superadmin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7️⃣ Crear RPC: obtener todos los usuarios (solo para admins)
CREATE OR REPLACE FUNCTION get_all_users(p_admin_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    nombre_completo TEXT,
    empresa_id UUID,
    empresa_nombre TEXT,
    rol TEXT,
    activo BOOLEAN,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Verificar que quien llama sea superadmin
    IF NOT es_superadmin(p_admin_id) THEN
        RAISE EXCEPTION 'Solo los superadmins pueden ver todos los usuarios';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        u.email::TEXT,
        p.nombre_completo,
        p.empresa_id,
        e.nombre::TEXT as empresa_nombre,
        p.rol::TEXT,
        p.activo,
        p.last_login,
        u.created_at
    FROM perfiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN empresas e ON e.id = p.empresa_id
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8️⃣ Crear RPC: cambiar estado activo/inactivo de un usuario
CREATE OR REPLACE FUNCTION toggle_user_status(
    p_admin_id UUID,
    p_user_id UUID,
    p_activo BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    -- Verificar que quien llama sea superadmin
    IF NOT es_superadmin(p_admin_id) THEN
        RAISE EXCEPTION 'Solo los superadmins pueden cambiar el estado de usuarios';
    END IF;

    -- No permitir desactivarse a sí mismo
    IF p_admin_id = p_user_id THEN
        RAISE EXCEPTION 'No puedes desactivarte a ti mismo';
    END IF;

    -- Actualizar estado
    UPDATE perfiles
    SET activo = p_activo
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9️⃣ Crear RPC: cambiar rol de un usuario
CREATE OR REPLACE FUNCTION update_user_role(
    p_admin_id UUID,
    p_user_id UUID,
    p_new_role user_role
)
RETURNS VOID AS $$
BEGIN
    -- Verificar que quien llama sea superadmin
    IF NOT es_superadmin(p_admin_id) THEN
        RAISE EXCEPTION 'Solo los superadmins pueden cambiar roles';
    END IF;

    -- No permitir cambiar su propio rol
    IF p_admin_id = p_user_id THEN
        RAISE EXCEPTION 'No puedes cambiar tu propio rol';
    END IF;

    -- Actualizar rol
    UPDATE perfiles
    SET rol = p_new_role
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔟 Eliminar trigger antiguo si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 1️⃣1️⃣ Crear trigger: actualizar last_login automáticamente
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE perfiles
    SET last_login = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1️⃣2️⃣ Crear nuevo trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION update_last_login();

-- 1️⃣3️⃣ Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_perfiles_rol ON perfiles(rol);
CREATE INDEX IF NOT EXISTS idx_perfiles_activo ON perfiles(activo);
CREATE INDEX IF NOT EXISTS idx_perfiles_empresa_rol ON perfiles(empresa_id, rol);

-- ============================================
-- ✅ MIGRACIÓN COMPLETADA
-- ============================================

SELECT '✅ Migración completada exitosamente' as status;

-- ============================================
-- 🔧 SIGUIENTE PASO: Configurar tu usuario como SUPERADMIN
-- ============================================
-- ⚠️ EJECUTA ESTE COMANDO DESPUÉS (reemplaza con tu email):

/*
UPDATE perfiles 
SET rol = 'superadmin', 
    activo = true,
    nombre_completo = COALESCE(nombre_completo, nombre)
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'TU-EMAIL-AQUI@ejemplo.com'
);
*/

-- Luego verifica:
/*
SELECT 
    u.email,
    p.nombre_completo,
    p.rol,
    p.activo
FROM perfiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'TU-EMAIL-AQUI@ejemplo.com';
*/
