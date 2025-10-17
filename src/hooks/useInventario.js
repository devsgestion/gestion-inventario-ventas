// src/hooks/useInventario.js (FINAL REALTIME)

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../api/supabaseClient';
import useAuth from './useAuth';

// Función auxiliar para obtener la fecha de hoy en formato YYYY-MM-DD (Bogotá)
const getTodayDate = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

const useInventario = (empresaId, refreshTrigger = 0) => {
    const { session, perfil: userProfile } = useAuth();
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [productosBajoStock, setProductosBajoStock] = useState([]);
    const [isCajaAbierta, setIsCajaAbierta] = useState(false);
    const [cajaStatus, setCajaStatus] = useState(null);
    const [isLoadingCaja, setIsLoadingCaja] = useState(true);
    
    // Simplificamos las referencias, ya que el Realtime es más robusto
    const controllerRef = useRef(null);
    
    // Función que mapea y detecta alertas
    const mapAndSetProducts = useCallback((data) => {
        const mapped = (data || []).map((item) => ({
            ...item,
            precio_venta: Number(item.precio_venta),
            precio_costo: Number(item.precio_costo),
            stock_actual: Number(item.stock_actual),
            alerta_stock_min: Number(item.alerta_stock_min),
        }));

        const lowStockItems = mapped.filter(p => p.stock_actual <= p.alerta_stock_min);
        setProductosBajoStock(lowStockItems);
        setProductos(mapped);
    }, []);


    // Función de obtención de datos (sin AbortController, delegamos a Realtime)
    const fetchProductos = useCallback(async () => {
      if (!empresaId) return;

      setLoading(true);
      setError(null);
        
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('nombre', { ascending: true });

        if (error) throw error;
        mapAndSetProducts(data);

      } catch (e) {
        console.error('❌ [useInventario] exception:', e?.message || e);
        setError(e?.message || String(e));
        setProductos([]);
        setProductosBajoStock([]);
      } finally {
        setLoading(false);
      }
    }, [empresaId, mapAndSetProducts]); 


    // ----------------------------------------------------------------------
    // 🛑 EFECTO: Suscripción en Tiempo Real (Realtime) 🛑
    // ----------------------------------------------------------------------
    useEffect(() => {
        if (!empresaId) {
            setLoading(false);
            return;
        }

        // 1. Suscribirse a INSERTS, UPDATES, y DELETES en la tabla 'productos'
        const channel = supabase
            .channel(`inventory-changes-${empresaId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'productos', filter: `empresa_id=eq.${empresaId}` },
                (payload) => {
                    console.log('⚡ Realtime Update Received:', payload.eventType);
                    // 2. Si recibimos un cambio, llamamos a fetchProductos() para actualizar el estado.
                    fetchProductos(); 
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                     // 3. CRÍTICO: Cuando la suscripción está lista, hacemos la carga inicial.
                     // Esto asegura que no nos perdamos ningún evento.
                     fetchProductos(); 
                }
            });

        // 4. Limpieza
        return () => {
            supabase.removeChannel(channel);
        };

    }, [empresaId, fetchProductos]); 
    // ----------------------------------------------------------------------

    // Aseguramos que la primera llamada a fetchProductos se haga al montarse el hook.
    // El Realtime se encarga de esto, pero mantenemos esta estructura para refrescos manuales.
    
    // Este useEffect ahora solo se usa para forzar el refresco cuando el padre lo pide
    useEffect(() => {
        if (empresaId && refreshTrigger > 0) {
            fetchProductos();
        }
    }, [refreshTrigger, empresaId, fetchProductos]);


    // Función central para verificar el estado de la caja
    const checkCajaStatus = useCallback(async (empresaIdParam) => {
        const eid = empresaIdParam || userProfile?.empresa_id || empresaId;
        if (!eid) {
            setIsCajaAbierta(false);
            setCajaStatus(null);
            setIsLoadingCaja(false);
            return;
        }
        setIsLoadingCaja(true);
        try {
            const { data, error } = await supabase
                .from('estado_caja')
                .select('*')
                .eq('empresa_id', eid)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                const today = getTodayDate();
                const isOpen = data.estado === 'ABIERTA' && data.fecha_apertura === today;
                setIsCajaAbierta(isOpen);
                setCajaStatus(data);
            } else {
                setIsCajaAbierta(false);
                setCajaStatus(null);
            }
        } catch (error) {
            console.error('Error al verificar estado de caja:', error);
            setIsCajaAbierta(false);
        } finally {
            setIsLoadingCaja(false);
        }
    }, [empresaId, userProfile]);

    useEffect(() => {
        if (userProfile?.empresa_id || empresaId) {
            checkCajaStatus();
        }
    }, [userProfile, empresaId, checkCajaStatus]);

    // FUNCIONES DE CONTROL (Abrir/Cerrar)
    const abrirCaja = async (monto_inicial = 0) => {
        if (!userProfile?.empresa_id || !session?.user?.id) return { success: false, message: 'Faltan datos de sesión.' };

        try {
            const today = getTodayDate();
            const { error } = await supabase
                .from('estado_caja')
                .upsert({
                    empresa_id: userProfile.empresa_id,
                    estado: 'ABIERTA',
                    fecha_apertura: today,
                    monto_inicial: monto_inicial,
                    usuario_apertura_id: session.user.id,
                    usuario_cierre_id: null,
                }, { onConflict: 'empresa_id' });

            if (error) throw error;

            await checkCajaStatus(userProfile.empresa_id);
            // Notificar a otras pestañas/componentes
            window.dispatchEvent(new Event('caja-status-changed'));
            return { success: true, message: 'Caja abierta correctamente.' };
        } catch (error) {
            console.error('Error al abrir caja:', error.message);
            return { success: false, message: `Error al abrir caja: ${error.message}` };
        }
    };

    const cerrarCaja = async () => {
        if (!userProfile?.empresa_id) return { success: false, message: 'Falta ID de empresa.' };

        try {
            // 1. Obtener resumen de ventas del día actual
            const today = getTodayDate();
            const { data: ventasData, error: ventasError } = await supabase.rpc('get_ventas_del_dia', {
                p_empresa_id: userProfile.empresa_id,
            });

            if (ventasError) throw ventasError;
            const resumen = ventasData?.[0] || { total_ventas: 0, cantidad_transacciones: 0 };

            // 2. Insertar el cierre en cierres_caja
            const { error: cierreError } = await supabase
                .from('cierres_caja')
                .insert({
                    empresa_id: userProfile.empresa_id,
                    fecha_cierre: today,
                    total_ingresos: resumen.total_ventas,
                    total_transacciones: resumen.cantidad_transacciones,
                    usuario_cierre_id: session.user.id,
                });

            if (cierreError) throw cierreError;

            // 3. Actualizar estado_caja a CERRADA
            const { error } = await supabase
                .from('estado_caja')
                .update({
                    estado: 'CERRADA',
                    usuario_cierre_id: session.user.id,
                })
                .eq('empresa_id', userProfile.empresa_id);

            if (error) throw error;

            await checkCajaStatus(userProfile.empresa_id);
            // Notificar a otras pestañas/componentes
            window.dispatchEvent(new Event('caja-status-changed'));
            return { success: true, message: 'Caja cerrada correctamente.' };
        } catch (error) {
            console.error('Error al cerrar caja:', error.message);
            return { success: false, message: `Error al cerrar caja: ${error.message}` };
        }
    };


    return { 
        productos, 
        loading, 
        error, 
        fetchProductos, 
        productosBajoStock,
        isCajaAbierta,
        cajaStatus,
        isLoadingCaja,
        abrirCaja,
        cerrarCaja,
        getTodayDate,
        checkCajaStatus,
    };
};

export default useInventario;