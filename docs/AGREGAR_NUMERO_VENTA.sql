-- =====================================================
-- SCRIPT: AGREGAR NÚMERO SECUENCIAL A VENTAS
-- Agrega columna numero_venta y numera todas las ventas existentes
-- =====================================================

-- 1. Agregar columna numero_venta a la tabla ventas
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS numero_venta INTEGER;

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ventas_numero_venta ON ventas(empresa_id, numero_venta);

-- 3. Numerar TODAS las ventas existentes por empresa (en orden cronológico)
DO $$
DECLARE
    empresa RECORD;
    venta RECORD;
    contador INTEGER;
BEGIN
    -- Iterar por cada empresa
    FOR empresa IN SELECT DISTINCT empresa_id FROM ventas WHERE numero_venta IS NULL
    LOOP
        contador := 1;
        
        -- Asignar números en orden cronológico para cada empresa
        FOR venta IN 
            SELECT id 
            FROM ventas 
            WHERE empresa_id = empresa.empresa_id 
            AND numero_venta IS NULL
            ORDER BY fecha_venta ASC, id ASC
        LOOP
            UPDATE ventas 
            SET numero_venta = contador 
            WHERE id = venta.id;
            
            contador := contador + 1;
        END LOOP;
        
        RAISE NOTICE 'Empresa %: % ventas numeradas', empresa.empresa_id, contador - 1;
    END LOOP;
END $$;

-- 4. Crear secuencia para cada empresa (tabla auxiliar)
CREATE TABLE IF NOT EXISTS ventas_secuencias (
    empresa_id UUID PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
    ultimo_numero INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inicializar secuencias con el número máximo actual de cada empresa
INSERT INTO ventas_secuencias (empresa_id, ultimo_numero)
SELECT empresa_id, COALESCE(MAX(numero_venta), 0)
FROM ventas
GROUP BY empresa_id
ON CONFLICT (empresa_id) 
DO UPDATE SET ultimo_numero = EXCLUDED.ultimo_numero;

-- 6. Función para obtener el siguiente número de venta
CREATE OR REPLACE FUNCTION obtener_siguiente_numero_venta(p_empresa_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_siguiente_numero INTEGER;
BEGIN
    -- Insertar o actualizar la secuencia de forma atómica
    INSERT INTO ventas_secuencias (empresa_id, ultimo_numero)
    VALUES (p_empresa_id, 1)
    ON CONFLICT (empresa_id)
    DO UPDATE SET 
        ultimo_numero = ventas_secuencias.ultimo_numero + 1,
        updated_at = NOW()
    RETURNING ultimo_numero INTO v_siguiente_numero;
    
    RETURN v_siguiente_numero;
END;
$$ LANGUAGE plpgsql;

-- 7. Modificar la función registrar_venta para incluir numero_venta (si existe)
-- NOTA: Este paso requiere revisar tu función registrar_venta actual
-- Por ahora solo creamos un comentario de referencia

COMMENT ON COLUMN ventas.numero_venta IS 'Número secuencial de venta por empresa (ej: 1, 2, 3...)';
COMMENT ON TABLE ventas_secuencias IS 'Control de secuencias de números de venta por empresa';
COMMENT ON FUNCTION obtener_siguiente_numero_venta IS 'Obtiene el siguiente número de venta disponible para una empresa';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ver ventas numeradas de tu empresa:
-- SELECT numero_venta, id, fecha_venta, total_venta 
-- FROM ventas 
-- WHERE empresa_id = 'tu-empresa-id' 
-- ORDER BY numero_venta;

-- Ver último número usado por empresa:
-- SELECT * FROM ventas_secuencias;
