-- ========================================================
-- FUNCIÓN PARA ELIMINAR EMPRESA Y TODOS SUS DATOS
-- ========================================================

CREATE OR REPLACE FUNCTION public.delete_company_full(
    p_admin_id UUID,
    p_empresa_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_admin_role VARCHAR;
    v_company_name VARCHAR;
BEGIN
    -- 1. Verificar que quien ejecuta es superadmin
    SELECT rol INTO v_admin_role FROM public.perfiles WHERE id = p_admin_id;
    
    IF v_admin_role IS DISTINCT FROM 'superadmin' THEN
        RAISE EXCEPTION 'No tienes permisos para realizar esta acción.';
    END IF;

    -- Obtener nombre para el log
    SELECT nombre INTO v_company_name FROM public.empresas WHERE id = p_empresa_id;
    
    IF v_company_name IS NULL THEN
        RAISE EXCEPTION 'La empresa no existe.';
    END IF;

    -- 2. Eliminar datos en orden de dependencia (aunque CASCADE debería encargarse, es mejor ser explícito para evitar bloqueos)
    
    -- Eliminar detalles de ventas y ventas
    DELETE FROM public.detalle_venta WHERE empresa_id = p_empresa_id;
    DELETE FROM public.ventas WHERE empresa_id = p_empresa_id;
    
    -- Eliminar movimientos de inventario
    DELETE FROM public.movimientos_inventario WHERE empresa_id = p_empresa_id;
    
    -- Eliminar productos
    DELETE FROM public.productos WHERE empresa_id = p_empresa_id;
    
    -- Eliminar gastos
    DELETE FROM public.gastos WHERE empresa_id = p_empresa_id;
    
    -- Eliminar estado de caja
    DELETE FROM public.estado_caja WHERE empresa_id = p_empresa_id;
    
    -- Eliminar cierres de caja
    DELETE FROM public.cierres_caja WHERE empresa_id = p_empresa_id;
    
    -- Eliminar cambios y devoluciones
    DELETE FROM public.cambios_devoluciones WHERE empresa_id = p_empresa_id;
    
    -- Eliminar pedidos y detalles
    DELETE FROM public.items_pedido WHERE pedido_id IN (SELECT id FROM public.pedidos WHERE empresa_id = p_empresa_id);
    DELETE FROM public.pedidos WHERE empresa_id = p_empresa_id;

    -- 3. Eliminar usuarios (perfiles) asociados
    -- Nota: Esto elimina el perfil, pero el usuario de Auth de Supabase requiere ser eliminado vía API de administración de Supabase
    -- Sin embargo, al eliminar el perfil, pierden acceso al sistema.
    DELETE FROM public.perfiles WHERE empresa_id = p_empresa_id;

    -- 4. Finalmente eliminar la empresa
    DELETE FROM public.empresas WHERE id = p_empresa_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Empresa ' || v_company_name || ' y todos sus datos han sido eliminados.'
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error eliminando empresa: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- FUNCIÓN PARA ELIMINAR UN SOLO USUARIO
-- ========================================================

CREATE OR REPLACE FUNCTION public.delete_single_user(
    p_admin_id UUID,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_admin_role VARCHAR;
    v_user_name VARCHAR;
BEGIN
    -- 1. Verificar permisos
    SELECT rol INTO v_admin_role FROM public.perfiles WHERE id = p_admin_id;
    
    IF v_admin_role IS DISTINCT FROM 'superadmin' THEN
        RAISE EXCEPTION 'No tienes permisos para realizar esta acción.';
    END IF;

    SELECT nombre_completo INTO v_user_name FROM public.perfiles WHERE id = p_user_id;

    -- 2. Eliminar perfil
    DELETE FROM public.perfiles WHERE id = p_user_id;

    -- Nota: El usuario de Auth quedará huérfano hasta que se limpie desde el panel de Supabase o vía Edge Function,
    -- pero sin perfil no podrá acceder a nada.

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Usuario ' || COALESCE(v_user_name, 'Desconocido') || ' eliminado.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
