// src/hooks/useInventario.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../api/supabaseClient';

const useInventario = (empresaId, refreshTrigger = 0) => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);
  const lastFetchRef = useRef({ empresaId: null, refreshTrigger: null });

  const fetchProductos = useCallback(async () => {
    // Evitar llamadas duplicadas
    if (lastFetchRef.current.empresaId === empresaId && 
        lastFetchRef.current.refreshTrigger === refreshTrigger) {
      return;
    }

    if (!empresaId) {
      setProductos([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Actualizar referencia antes de la llamada
    lastFetchRef.current = { empresaId, refreshTrigger };

    // Cancela llamada anterior si existía
    controllerRef.current?.abort?.();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    // Timeout más corto para response rápida
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    }, 3000); // Reducido a 3 segundos

    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nombre', { ascending: true })
        .abortSignal?.(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        const msg = error?.message || JSON.stringify(error);
        if (String(msg).toLowerCase().includes('abort')) {
          // console.warn('[useInventario] abortado por cambio/strictmode');
        } else {
          console.error('❌ [useInventario] error:', msg);
          setError(msg || 'Error al cargar el inventario.');
          setProductos([]);
        }
      } else {
        const mapped = (data || []).map((item) => ({
          ...item,
          precio_venta: Number(item.precio_venta),
          precio_costo: Number(item.precio_costo),
          stock_actual: Number(item.stock_actual),
          alerta_stock_min: Number(item.alerta_stock_min),
        }));
        // Solo log una vez por carga exitosa
        if (mapped.length > 0) {
          console.log('[useInventario] ✅ Productos cargados:', mapped.length);
        }
        setProductos(mapped);
      }
    } catch (e) {
      clearTimeout(timeoutId);
      if (e?.name === 'AbortError') {
        // Abort silencioso para mejor UX
      } else {
        console.error('❌ [useInventario] exception:', e?.message || e);
        setError(e?.message || String(e));
        setProductos([]);
      }
    } finally {
      setLoading(false);
    }
  }, []); // Sin dependencias para evitar re-creación

  useEffect(() => {
    let active = true;
    
    (async () => {
      if (!active) return;
      await fetchProductos();
    })();
    
    return () => {
      active = false;
      controllerRef.current?.abort?.();
    };
  }, [empresaId, refreshTrigger]); // Solo estas dependencias esenciales

  return { productos, loading, error, fetchProductos };
};

export default useInventario;
