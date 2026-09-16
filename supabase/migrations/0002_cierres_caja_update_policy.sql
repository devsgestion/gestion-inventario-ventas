-- ============================================================================
-- 0002 - Permitir actualizar el cierre de caja del día
-- ============================================================================
-- Problema: cierres_caja tiene UNIQUE (empresa_id, fecha_cierre) y RLS con
-- políticas solo de INSERT y SELECT. Si la caja se cierra, se reabre y se
-- vuelve a cerrar el mismo día, el frontend hacía INSERT y fallaba con
-- "duplicate key value violates unique constraint
--  cierres_caja_empresa_id_fecha_cierre_key", dejando la caja bloqueada.
--
-- El frontend ahora hace UPSERT (actualiza el cierre del día con los totales
-- completos). Para que ese UPDATE pase RLS hace falta esta política.
--
-- Riesgo: ninguno. Es aditiva, no modifica datos ni políticas existentes.
-- Reversión: DROP POLICY user_can_update_cierres ON public.cierres_caja;
-- ============================================================================

CREATE POLICY user_can_update_cierres
ON public.cierres_caja
FOR UPDATE
TO authenticated
USING (empresa_id = get_current_tenant_id())
WITH CHECK (empresa_id = get_current_tenant_id());

NOTIFY pgrst, 'reload schema';
