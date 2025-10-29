-- ============================================
-- DESHABILITAR TRIGGERS CONFLICTIVOS
-- ============================================
-- ⚠️ EJECUTAR EN SUPABASE SQL EDITOR

-- Eliminar todos los triggers que causan conflicto al crear usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Eliminar trigger de perfiles primero, luego la función
DROP TRIGGER IF EXISTS trigger_update_last_login ON perfiles;
DROP FUNCTION IF EXISTS update_last_login() CASCADE;

SELECT '✅ Triggers eliminados - ahora la creación de perfil es manual' as status;
