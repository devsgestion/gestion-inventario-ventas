-- =====================================================
-- MIGRACIÓN: Agregar configuraciones de impresión
-- Fecha: 2025-10-28
-- Descripción: Agrega columnas para habilitar/deshabilitar impresión de tickets y reportes
-- =====================================================

-- Verificar si la tabla configuraciones_empresa existe, si no, crearla
CREATE TABLE IF NOT EXISTS configuraciones_empresa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    formato_facturas TEXT DEFAULT 'simple',
    imprimir_tickets_habilitado BOOLEAN DEFAULT true,
    imprimir_reportes_habilitado BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Asegurar que solo haya una configuración por empresa
    UNIQUE(empresa_id)
);

-- Si la tabla ya existe, agregar las columnas solo si no existen
DO $$ 
BEGIN
    -- Agregar columna imprimir_tickets_habilitado si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'configuraciones_empresa' 
        AND column_name = 'imprimir_tickets_habilitado'
    ) THEN
        ALTER TABLE configuraciones_empresa 
        ADD COLUMN imprimir_tickets_habilitado BOOLEAN DEFAULT true;
    END IF;

    -- Agregar columna imprimir_reportes_habilitado si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'configuraciones_empresa' 
        AND column_name = 'imprimir_reportes_habilitado'
    ) THEN
        ALTER TABLE configuraciones_empresa 
        ADD COLUMN imprimir_reportes_habilitado BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Crear índice para búsquedas rápidas por empresa_id
CREATE INDEX IF NOT EXISTS idx_configuraciones_empresa_empresa_id 
ON configuraciones_empresa(empresa_id);

-- Comentarios para documentación
COMMENT ON TABLE configuraciones_empresa IS 'Configuraciones personalizadas por empresa';
COMMENT ON COLUMN configuraciones_empresa.imprimir_tickets_habilitado IS 'Habilita/deshabilita la opción de imprimir tickets después de cada venta';
COMMENT ON COLUMN configuraciones_empresa.imprimir_reportes_habilitado IS 'Habilita/deshabilita los botones de impresión de reportes de inventario';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Migración completada: Configuraciones de impresión agregadas correctamente';
END $$;
