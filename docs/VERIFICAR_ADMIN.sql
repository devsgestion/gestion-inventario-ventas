-- ============================================
-- SCRIPT DE VERIFICACIÓN DEL SISTEMA ADMIN
-- ============================================
-- Ejecuta cada sección y verifica los resultados

-- 1️⃣ VERIFICAR QUE EXISTA LA COLUMNA 'rol'
-- Debería retornar una fila con la columna 'rol'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'perfiles' 
  AND column_name IN ('rol', 'activo', 'nombre_completo', 'created_by', 'last_login');

-- Resultado esperado:
--  column_name    | data_type
-- ----------------+-----------
--  rol            | USER_DEFINED
--  activo         | boolean
--  nombre_completo| text
--  created_by     | uuid
--  last_login     | timestamp


-- 2️⃣ VERIFICAR QUE EXISTA EL TIPO ENUM 'user_role'
SELECT enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'user_role';

-- Resultado esperado:
--  enumlabel
-- -----------
--  superadmin
--  admin
--  usuario


-- 3️⃣ VERIFICAR TU USUARIO ACTUAL
-- Reemplaza 'tu-email@ejemplo.com' con tu email real
SELECT 
    u.email,
    p.nombre_completo,
    p.nombre,
    p.rol,
    p.activo,
    p.is_admin,
    e.nombre as empresa
FROM perfiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN empresas e ON e.id = p.empresa_id
WHERE u.email = 'tu-email@ejemplo.com';  -- ⚠️ CAMBIA ESTO POR TU EMAIL

-- Resultado esperado:
--  email          | nombre_completo | nombre | rol        | activo | is_admin | empresa
-- ----------------+-----------------+--------+------------+--------+----------+---------
--  tu@email.com   | Tu Nombre       | ...    | superadmin | true   | true     | ...


-- 4️⃣ VERIFICAR QUE EXISTAN LAS FUNCIONES RPC
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('es_superadmin', 'get_all_users', 'toggle_user_status', 'update_user_role');

-- Resultado esperado:
--  routine_name      | routine_type
-- -------------------+--------------
--  es_superadmin     | FUNCTION
--  get_all_users     | FUNCTION
--  toggle_user_status| FUNCTION
--  update_user_role  | FUNCTION


-- 5️⃣ VERIFICAR QUE PUEDAS USAR LA FUNCIÓN es_superadmin
-- Reemplaza 'tu-user-id' con tu ID de usuario
SELECT es_superadmin('tu-user-id');  -- ⚠️ CAMBIA ESTO

-- Resultado esperado: true


-- ============================================
-- 🔧 SOLUCIONES RÁPIDAS
-- ============================================

-- Si NO tienes la columna 'rol', ejecuta PRIMERO todo el archivo:
-- docs/SQL_ADD_ADMIN_SYSTEM.sql


-- Si tienes la columna pero tu usuario NO es superadmin, ejecuta esto:
-- (Reemplaza con tu email)
UPDATE perfiles 
SET rol = 'superadmin', 
    activo = true,
    nombre_completo = COALESCE(nombre_completo, nombre)
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'tu-email@ejemplo.com'  -- ⚠️ CAMBIA ESTO
);


-- Verificar de nuevo:
SELECT 
    u.email,
    p.rol,
    p.activo
FROM perfiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'tu-email@ejemplo.com';  -- ⚠️ CAMBIA ESTO


-- ============================================
-- 📊 LISTA DE TODOS LOS USUARIOS (para debug)
-- ============================================
SELECT 
    u.email,
    p.nombre_completo,
    p.rol,
    p.activo,
    e.nombre as empresa,
    p.created_at
FROM perfiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN empresas e ON e.id = p.empresa_id
ORDER BY p.created_at DESC;
