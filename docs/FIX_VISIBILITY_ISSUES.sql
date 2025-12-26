-- ========================================================
-- FIX: PERMITIR VER NOMBRES DE OTROS USUARIOS
-- ========================================================

-- El problema es que la política de seguridad actual solo te deja ver TU propio perfil.
-- Por eso, aunque los usuarios existan en la base de datos, tu usuario no tiene permiso
-- para leer sus nombres y el sistema muestra "Usuario Desconocido".

-- 1. Eliminar política restrictiva anterior si existe
DROP POLICY IF EXISTS "Users can view own profile" ON public.perfiles;
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.perfiles;

-- 2. Crear política permisiva para LECTURA
-- Permite que cualquier usuario logueado vea los nombres de los demás.
-- Esto es necesario para ver el historial de ventas de todo el equipo.
CREATE POLICY "Authenticated can view all profiles"
ON public.perfiles FOR SELECT
TO authenticated
USING (true);

-- 3. Mantener la seguridad en escritura (UPDATE/DELETE)
-- Solo tú puedes editar tu perfil (nadie más puede cambiar tu nombre/contraseña)
DROP POLICY IF EXISTS "Users can update own profile" ON public.perfiles;
CREATE POLICY "Users can update own profile"
ON public.perfiles FOR UPDATE
USING (auth.uid() = id);

-- 4. Recargar esquema
NOTIFY pgrst, 'reload schema';
