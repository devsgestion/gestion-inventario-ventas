-- ========================================================
-- ARREGLAR POLÍTICAS RLS (SIN RECURSIÓN) - VERSIÓN 2
-- ========================================================

-- Eliminar TODAS las políticas actuales
DROP POLICY IF EXISTS "Superadmin can view all profiles" ON perfiles;
DROP POLICY IF EXISTS "Users can view own profile" ON perfiles;
DROP POLICY IF EXISTS "Admins can view company profiles" ON perfiles;
DROP POLICY IF EXISTS "Superadmin can insert profiles" ON perfiles;
DROP POLICY IF EXISTS "Superadmin can update all profiles" ON perfiles;
DROP POLICY IF EXISTS "Superadmin can delete profiles" ON perfiles;

-- Eliminar funciones helper anteriores
DROP FUNCTION IF EXISTS is_superadmin();
DROP FUNCTION IF EXISTS is_admin_or_higher();

-- ========================================================
-- SOLUCIÓN: POLÍTICAS SIMPLES SIN SUBCONSULTAS A PERFILES
-- ========================================================

-- 1. TODOS pueden ver su PROPIO perfil (la más importante)
CREATE POLICY "Users can view own profile"
ON perfiles FOR SELECT
USING (auth.uid() = id);

-- 2. BYPASS para operaciones del sistema
-- Esta política permite a Supabase leer perfiles sin recursión
CREATE POLICY "Service role bypass"
ON perfiles FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- 3. Superadmin puede ver TODO (usando una tabla auxiliar si es necesario)
-- Por ahora, comentada para evitar recursión
-- CREATE POLICY "Superadmin can view all"
-- ON perfiles FOR SELECT
-- USING (
--   (SELECT rol::text FROM perfiles WHERE id = auth.uid()) = 'superadmin'
-- );

-- 4. INSERT: Solo permitir si viene de authenticated
CREATE POLICY "Authenticated can insert profiles"
ON perfiles FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 5. UPDATE: Solo el mismo usuario puede actualizar su perfil
CREATE POLICY "Users can update own profile"
ON perfiles FOR UPDATE
USING (auth.uid() = id);

-- 6. DELETE: Deshabilitado por ahora
-- CREATE POLICY "No deletes" ON perfiles FOR DELETE USING (false);

-- ========================================================
-- VERIFICAR QUE FUNCIONA
-- ========================================================
SELECT id, nombre, rol, activo FROM perfiles ORDER BY rol;
