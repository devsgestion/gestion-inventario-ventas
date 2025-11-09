-- ========================================================
-- AGREGAR CAMPO CATEGORÍA A TABLA PRODUCTOS
-- Ejecuta este archivo en Supabase SQL Editor
-- ========================================================

-- 1. Agregar columna categoria (VARCHAR, opcional, sin default)
ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) NULL;

-- 2. Crear índice para mejorar búsquedas por categoría
CREATE INDEX IF NOT EXISTS idx_productos_categoria 
ON public.productos(categoria) 
WHERE categoria IS NOT NULL;

-- 3. Crear índice compuesto para filtros empresa + categoría
CREATE INDEX IF NOT EXISTS idx_productos_empresa_categoria 
ON public.productos(empresa_id, categoria) 
WHERE categoria IS NOT NULL;

-- ========================================================
-- COMENTARIOS Y EJEMPLOS
-- ========================================================

-- ✅ Ahora puedes usar categorías como:
-- - 'Cadenas'
-- - 'Aretes'
-- - 'Pulseras'
-- - 'Anillos'
-- - 'Accesorios'
-- - etc.

-- 💡 Ejemplos de actualización manual (opcional):
-- UPDATE productos SET categoria = 'Cadenas' WHERE nombre ILIKE '%cadena%';
-- UPDATE productos SET categoria = 'Aretes' WHERE nombre ILIKE '%arete%' OR nombre ILIKE '%aretes%';
-- UPDATE productos SET categoria = 'Pulseras' WHERE nombre ILIKE '%pulsera%';

-- 📊 Consulta de verificación:
-- SELECT categoria, COUNT(*) as cantidad 
-- FROM productos 
-- WHERE empresa_id = 'tu-empresa-id'::UUID
-- GROUP BY categoria
-- ORDER BY cantidad DESC;

COMMENT ON COLUMN public.productos.categoria IS 'Categoría del producto (Cadenas, Aretes, Pulseras, etc.)';
