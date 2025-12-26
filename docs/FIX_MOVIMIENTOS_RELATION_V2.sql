-- ==============================================================================
-- FIX: RELACIÓN MOVIMIENTOS -> PERFILES (VERSIÓN SEGURA)
-- ==============================================================================

-- 1. Eliminar la restricción antigua si existe (para evitar conflictos)
ALTER TABLE public.movimientos_inventario 
DROP CONSTRAINT IF EXISTS movimientos_inventario_usuario_id_fkey;

-- 2. Eliminar la restricción nueva si ya existe (para evitar el error 42710)
ALTER TABLE public.movimientos_inventario 
DROP CONSTRAINT IF EXISTS movimientos_inventario_usuario_id_perfiles_fkey;

-- 3. Crear la relación directa con la tabla de PERFILES (donde están los nombres)
ALTER TABLE public.movimientos_inventario
ADD CONSTRAINT movimientos_inventario_usuario_id_perfiles_fkey
FOREIGN KEY (usuario_id)
REFERENCES public.perfiles (id);

-- 4. Recargar el esquema para que la API detecte el cambio
NOTIFY pgrst, 'reload schema';