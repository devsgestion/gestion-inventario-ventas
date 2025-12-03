-- ==============================================================================
-- 🚀 OPTIMIZACIÓN FINAL DE RENDIMIENTO (ÍNDICES DE PRODUCTOS)
-- ==============================================================================
-- Este script asegura que las búsquedas de productos sean instantáneas,
-- incluso cuando tengas miles de referencias.
--
-- INSTRUCCIONES:
-- 1. Copia todo el contenido de este archivo.
-- 2. Ve al Editor SQL de Supabase.
-- 3. Pega el contenido y ejecútalo.
-- ==============================================================================

-- 1. ÍNDICES PARA BÚSQUEDAS RÁPIDAS DE PRODUCTOS
-- Acelera la carga del inventario y el buscador por nombre/referencia.

CREATE INDEX IF NOT EXISTS idx_productos_empresa_id ON public.productos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON public.productos (nombre);
CREATE INDEX IF NOT EXISTS idx_productos_referencia ON public.productos (codigo_referencia);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos (categoria);

-- 2. ÍNDICES PARA ESTADO DE CAJA
-- Acelera la verificación de si la caja está abierta o cerrada.

CREATE INDEX IF NOT EXISTS idx_estado_caja_empresa ON public.estado_caja (empresa_id);
CREATE INDEX IF NOT EXISTS idx_cierres_caja_empresa_fecha ON public.cierres_caja (empresa_id, fecha_cierre);

-- 3. MANTENIMIENTO (VACUUM ANALYZE)
-- Esto actualiza las estadísticas de la base de datos para que el planificador de consultas
-- sepa usar los nuevos índices de inmediato.

ANALYZE public.productos;
ANALYZE public.ventas;
ANALYZE public.detalle_venta;
ANALYZE public.estado_caja;
