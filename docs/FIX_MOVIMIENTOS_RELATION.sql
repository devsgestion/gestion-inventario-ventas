-- ==============================================================================
-- FIX: RELACIÓN MOVIMIENTOS_INVENTARIO -> PERFILES
-- Fecha: 05 de Diciembre, 2025
-- Descripción: Agrega la clave foránea faltante para permitir joins directos
-- ==============================================================================

-- 1. Agregar constraint FK si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'movimientos_inventario_usuario_id_perfiles_fkey'
    ) THEN
        ALTER TABLE public.movimientos_inventario
        ADD CONSTRAINT movimientos_inventario_usuario_id_perfiles_fkey
        FOREIGN KEY (usuario_id)
        REFERENCES public.perfiles (id);
    END IF;
END $$;

-- NOTA: Si este script falla, es probable que existan usuario_id en movimientos_inventario
-- que no existen en la tabla perfiles. En ese caso, se deben limpiar o crear los perfiles faltantes.
