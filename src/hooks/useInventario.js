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
    
    // 🛑 CRÍTICO: Ref para evitar re-suscripciones cuando empresaId es el mismo
    const lastEmpresaIdRef = useRef(null);
    const channelRef = useRef(null);
    
    // Simplificamos las referencias, ya que el Realtime es más robusto
    const controllerRef = useRef(null);    // Función que mapea y detecta alertas
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
        // 🛑 ARREGLO: Query más simple sin filtros complejos 🛑
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

        // (log eliminado para mayor fluidez)

        // Función local estable que no causa re-renders
        const loadProducts = async () => {
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
            } catch (e) {
                console.error('❌ [useInventario] exception:', e?.message || e);
                setError(e?.message || String(e));
                setProductos([]);
                setProductosBajoStock([]);
            } finally {
                setLoading(false);
            }
        };

        // 🛑 PREVENIR doble suscripción en React 18 desarrollo
        let isSubscribed = true;
        let channel = null;

        // Delay mínimo para evitar doble montaje de React 18 en desarrollo
        const subscribeTimeout = setTimeout(() => {
            if (!isSubscribed) return;

            // (log eliminado para mayor fluidez)

            // 1. Suscribirse a INSERTS, UPDATES, y DELETES en la tabla 'productos'
            channel = supabase
                .channel(`inventory-changes-${empresaId}-${Date.now()}`) // Nombre único
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'productos', filter: `empresa_id=eq.${empresaId}` },
                    (payload) => {
                        if (!isSubscribed) return;
                        console.log('⚡ [Realtime] Update recibido:', payload.eventType);
                        loadProducts(); 
                    }
                )
                .subscribe((status, err) => {
                    if (!isSubscribed) return;
                    // (log eliminado para mayor fluidez)
                    
                    if (err) {
                        console.error('❌ [Realtime] Error en suscripción:', err);
                        return;
                    }
                    
                    if (status === 'SUBSCRIBED') {
                        // (log eliminado para mayor fluidez)
                        loadProducts(); 
                    }
                    
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.error('❌ [Realtime] Fallo en conexión:', status);
                    }
                });
        }, 100); // 100ms delay para evitar doble montaje

        // 4. Limpieza
        return () => {
            // (log eliminado para mayor fluidez)
            isSubscribed = false;
            clearTimeout(subscribeTimeout);
            
            if (channel) {
                // (log eliminado para mayor fluidez)
                supabase.removeChannel(channel);
            }
        };

    }, [empresaId]); // ✅ SOLO empresaId como dependencia 
    // ----------------------------------------------------------------------

    // 🔄 Este useEffect se usa para refrescos manuales desde el padre
    useEffect(() => {
        if (empresaId && refreshTrigger > 0) {
            // (log eliminado para mayor fluidez)
            fetchProductos();
        }
    }, [refreshTrigger]); // ✅ SOLO refreshTrigger - fetchProductos se llama manualmente


    // 🛑 OPTIMIZACIÓN: Evitar ciclos infinitos con checkCajaStatus 🛑
    const cajaStatusFetchedRef = useRef(false);

    // Función central para verificar el estado de la caja
    const checkCajaStatus = useCallback(async (empresaIdParam) => {
        const eid = empresaIdParam || userProfile?.empresa_id || empresaId;
        
        // Verificar que haya empresa_id Y sesión activa
        if (!eid || !session?.user) {
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
                .maybeSingle(); // Usar maybeSingle() en lugar de single() para evitar error 406

            if (error) {
                console.warn('Error al consultar estado_caja:', error);
                // Si es error de permisos, establecer estado cerrada
                if (error.code === '406' || error.code === 'PGRST116') {
                    setIsCajaAbierta(false);
                    setCajaStatus(null);
                    setIsLoadingCaja(false);
                    return;
                }
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

    // 🛑 IMPORTANTE: Solo cargar checkCajaStatus UNA VEZ al montar, no en cada cambio
    useEffect(() => {
        if ((userProfile?.empresa_id || empresaId) && !cajaStatusFetchedRef.current) {
            cajaStatusFetchedRef.current = true;
            checkCajaStatus();
        }
    }, [userProfile?.empresa_id, empresaId, checkCajaStatus]);

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

            // 2. Registrar el cierre en cierres_caja.
            // Existe UNIQUE (empresa_id, fecha_cierre): si la caja ya se cerró hoy
            // (o se cerró, se reabrió y se vendió más), se ACTUALIZA el cierre del día
            // con los totales completos en lugar de fallar por clave duplicada.
            const { error: cierreError } = await supabase
                .from('cierres_caja')
                .upsert({
                    empresa_id: userProfile.empresa_id,
                    fecha_cierre: today,
                    total_ingresos: resumen.total_ventas,
                    total_transacciones: resumen.cantidad_transacciones,
                    usuario_cierre_id: session.user.id,
                }, { onConflict: 'empresa_id,fecha_cierre' });

            if (cierreError) {
                // Si no se pudo actualizar el cierre pero ya existe uno para hoy,
                // no dejar la caja bloqueada: continuar y marcarla como CERRADA.
                const { data: cierreExistente } = await supabase
                    .from('cierres_caja')
                    .select('id')
                    .eq('empresa_id', userProfile.empresa_id)
                    .eq('fecha_cierre', today)
                    .maybeSingle();

                if (!cierreExistente) throw cierreError;
                console.warn('No se pudo actualizar el cierre de hoy, se conserva el existente:', cierreError.message);
            }

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