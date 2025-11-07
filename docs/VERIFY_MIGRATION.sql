-- ========================================================
-- VERIFICAR ESTADO DE LA MIGRACIÓN
-- ========================================================

-- 1. Verificar estructura de la tabla perfiles
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'perfiles' AND column_name = 'rol';

-- 2. Verificar el tipo ENUM user_role
SELECT enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'user_role'
ORDER BY enumsortorder;

-- 3. Ver todos los perfiles y sus roles
SELECT id, nombre, rol, activo, empresa_id 
FROM perfiles 
ORDER BY rol;

-- 4. Verificar políticas RLS activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('perfiles', 'cambios_devoluciones')
ORDER BY tablename, policyname;

-- 5. Verificar si RLS está habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('perfiles', 'cambios_devoluciones');
