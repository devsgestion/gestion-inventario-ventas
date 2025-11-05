import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';

export function usePedidos(empresaId) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPedidos = useCallback(async () => {
    if (!empresaId) {
      setPedidos([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    
    if (!error) {
      setPedidos(data || []);
    } else {
      console.error('Error al cargar pedidos:', error);
      setPedidos([]);
    }
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  return { pedidos, loading, refetch: fetchPedidos };
}
