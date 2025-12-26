-- ========================================================
-- SCRIPT FINAL PARA ARREGLAR HISTORIAL "USUARIO DESCONOCIDO"
-- ========================================================

-- 1. CREAR UN PERFIL "SISTEMA / ANÓNIMO" PARA LOS REGISTROS SIN USUARIO
-- Usamos un UUID fijo (todo ceros) para identificar registros huérfanos antiguos
INSERT INTO public.perfiles (id, nombre, nombre_completo, rol, empresa_id, activo)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'sistema',
    'Sistema / Anónimo',
    'vendedor'::user_role,
    (SELECT id FROM public.empresas LIMIT 1),
    true
)
ON CONFLICT (id) DO NOTHING;

-- 2. ASIGNAR LOS MOVIMIENTOS CON USUARIO NULL A ESTE PERFIL
-- Esto arregla las ventas que se hicieron cuando el sistema falló al capturar el usuario
UPDATE public.movimientos_inventario
SET usuario_id = '00000000-0000-0000-0000-000000000000'
WHERE usuario_id IS NULL;

-- 3. RECUPERAR PERFILES PARA USUARIOS ELIMINADOS
-- Si borraste un usuario de Auth pero dejó historial, esto crea un perfil "fantasma"
-- para que se vea "Usuario Eliminado" en lugar de "Desconocido"
INSERT INTO public.perfiles (id, nombre, nombre_completo, rol, empresa_id, activo)
SELECT DISTINCT 
    m.usuario_id, 
    'usuario_eliminado', 
    'Usuario Eliminado', 
    'vendedor'::user_role, 
    (SELECT id FROM public.empresas LIMIT 1), 
    false
FROM public.movimientos_inventario m
WHERE m.usuario_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = m.usuario_id);

-- 4. REFRESCAR CACHÉ
NOTIFY pgrst, 'reload schema';
