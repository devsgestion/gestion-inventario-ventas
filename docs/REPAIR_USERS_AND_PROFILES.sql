-- ========================================================
-- SCRIPT MAESTRO DE REPARACIÓN DE USUARIOS
-- Ejecuta esto en Supabase SQL Editor para arreglar "Usuario Desconocido"
-- ========================================================

-- 1. REPARAR USUARIOS HUÉRFANOS (Sin perfil)
-- Crea un perfil para cualquier usuario de Auth que no tenga uno
INSERT INTO public.perfiles (id, nombre, nombre_completo, rol, empresa_id, activo)
SELECT 
    au.id,
    split_part(au.email, '@', 1),
    'Usuario Recuperado',
    'vendedor',
    (SELECT id FROM public.empresas ORDER BY created_at ASC LIMIT 1), -- Asigna a la primera empresa
    true
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = au.id);

-- 2. REPARAR NOMBRES VACÍOS
UPDATE public.perfiles
SET nombre_completo = 'Usuario Sin Nombre'
WHERE nombre_completo IS NULL OR nombre_completo = '';

-- 3. REPARAR EMPRESAS NULAS
UPDATE public.perfiles
SET empresa_id = (SELECT id FROM public.empresas ORDER BY created_at ASC LIMIT 1)
WHERE empresa_id IS NULL;

-- 4. REFRESCAR CACHÉ
NOTIFY pgrst, 'reload schema';