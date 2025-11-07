-- ========================================================
-- MIGRACIÓN DE ROLES - NUEVA ESTRUCTURA (MÉTODO COLUMNA TEMPORAL)
-- Sistema de Gestión de Inventario y Ventas
-- Fecha: 7 de Noviembre, 2025
-- ========================================================

-- ========================================================
-- PASO 1: DESACTIVAR TEMPORALMENTE RLS
-- ========================================================
ALTER TABLE perfiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE cambios_devoluciones DISABLE ROW LEVEL SECURITY;

-- ========================================================
-- PASO 2: ELIMINAR TODAS LAS POLÍTICAS
-- ========================================================
DROP POLICY IF EXISTS "Only superadmin can delete cambios" ON cambios_devoluciones;
DROP POLICY IF EXISTS "Users can view their own cambios" ON cambios_devoluciones;
DROP POLICY IF EXISTS "Admins can view all cambios" ON cambios_devoluciones;
DROP POLICY IF EXISTS "Users can create cambios" ON cambios_devoluciones;
DROP POLICY IF EXISTS "Only admins can update cambios" ON cambios_devoluciones;
DROP POLICY IF EXISTS "Superadmin can view all profiles" ON perfiles;
DROP POLICY IF EXISTS "Admin can view company profiles" ON perfiles;
DROP POLICY IF EXISTS "Users can view own profile" ON perfiles;
DROP POLICY IF EXISTS "Superadmin can update all profiles" ON perfiles;
DROP POLICY IF EXISTS "Admin can update company profiles" ON perfiles;
DROP POLICY IF EXISTS "Superadmin can delete profiles" ON perfiles;
DROP POLICY IF EXISTS "Superadmin can insert profiles" ON perfiles;

-- ========================================================
-- PASO 3: CREAR COLUMNA TEMPORAL Y MIGRAR DATOS
-- ========================================================
-- Agregar columna temporal tipo TEXT
ALTER TABLE perfiles ADD COLUMN rol_nuevo TEXT;

-- Copiar y transformar los valores
UPDATE perfiles SET rol_nuevo = CASE 
    WHEN rol::text = 'usuario' THEN 'vendedor'
    WHEN rol::text = 'administrador' THEN 'admin'
    WHEN rol::text IN ('superadmin', 'admin', 'vendedor', 'gestor', 'admin_vendedor', 'admin_gestor') THEN rol::text
    ELSE 'vendedor'
END;

-- ========================================================
-- PASO 4: ELIMINAR COLUMNA ANTIGUA Y TIPO ENUM ANTIGUO
-- ========================================================
ALTER TABLE perfiles DROP COLUMN rol;
DROP TYPE IF EXISTS user_role CASCADE;

-- ========================================================
-- PASO 5: CREAR NUEVO TIPO ENUM
-- ========================================================
CREATE TYPE user_role AS ENUM (
    'gestor',
    'vendedor',
    'admin_vendedor',
    'admin_gestor',
    'admin',
    'superadmin'
);

-- ========================================================
-- PASO 6: RENOMBRAR COLUMNA TEMPORAL Y CONVERTIR A ENUM
-- ========================================================
ALTER TABLE perfiles RENAME COLUMN rol_nuevo TO rol;
ALTER TABLE perfiles ALTER COLUMN rol TYPE user_role USING rol::user_role;
ALTER TABLE perfiles ALTER COLUMN rol SET DEFAULT 'vendedor'::user_role;

-- ========================================================
-- PASO 7: RECREAR POLÍTICAS RLS
-- ========================================================

-- Políticas para PERFILES
CREATE POLICY "Superadmin can view all profiles"
ON perfiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM perfiles p
        WHERE p.id = auth.uid() AND p.rol::text = 'superadmin'
    )
);

CREATE POLICY "Users can view own profile"
ON perfiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Admins can view company profiles"
ON perfiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM perfiles p
        WHERE p.id = auth.uid() 
        AND p.empresa_id = perfiles.empresa_id
        AND p.rol::text IN ('admin', 'superadmin', 'admin_vendedor', 'admin_gestor')
    )
);

CREATE POLICY "Superadmin can insert profiles"
ON perfiles FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM perfiles p
        WHERE p.id = auth.uid() AND p.rol::text = 'superadmin'
    )
);

CREATE POLICY "Superadmin can update all profiles"
ON perfiles FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM perfiles p
        WHERE p.id = auth.uid() AND p.rol::text = 'superadmin'
    )
);

CREATE POLICY "Superadmin can delete profiles"
ON perfiles FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM perfiles p
        WHERE p.id = auth.uid() AND p.rol::text = 'superadmin'
    )
);

-- Políticas para CAMBIOS_DEVOLUCIONES
CREATE POLICY "Users can view their own cambios"
ON cambios_devoluciones FOR SELECT
USING (usuario_id = auth.uid());

CREATE POLICY "Admins can view all cambios"
ON cambios_devoluciones FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM perfiles p
        WHERE p.id = auth.uid()
        AND p.empresa_id = cambios_devoluciones.empresa_id
        AND p.rol::text IN ('admin', 'superadmin', 'admin_vendedor')
    )
);

CREATE POLICY "Users can create cambios"
ON cambios_devoluciones FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM perfiles p
        WHERE p.id = auth.uid()
        AND p.empresa_id = cambios_devoluciones.empresa_id
        AND p.rol::text IN ('vendedor', 'admin_vendedor', 'admin', 'superadmin')
    )
);

CREATE POLICY "Only admins can update cambios"
ON cambios_devoluciones FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM perfiles p
        WHERE p.id = auth.uid()
        AND p.empresa_id = cambios_devoluciones.empresa_id
        AND p.rol::text IN ('admin', 'superadmin', 'admin_vendedor')
    )
);

CREATE POLICY "Only superadmin can delete cambios"
ON cambios_devoluciones FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM perfiles p
        WHERE p.id = auth.uid()
        AND p.empresa_id = cambios_devoluciones.empresa_id
        AND p.rol::text = 'superadmin'
    )
);

-- ========================================================
-- PASO 8: REACTIVAR RLS
-- ========================================================
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cambios_devoluciones ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- PASO 9: VERIFICAR LA MIGRACIÓN
-- ========================================================
SELECT id, nombre, rol, activo FROM perfiles ORDER BY rol;

-- ========================================================
-- LISTO! ✅
-- Los roles han sido migrados exitosamente:
-- - usuario → vendedor
-- - administrador → admin
-- - Nuevo ENUM con 6 roles creado
-- - Políticas RLS actualizadas
-- ========================================================
