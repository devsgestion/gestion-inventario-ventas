// src/hooks/useInventario.js

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';

const useInventario = (empresaId, refreshTrigger = 0) => {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Función para obtener los productos
    const fetchProductos = useCallback(async () => {
        if (!empresaId) {
            return;
        }
        setLoading(true);
        setError(null);

        // La magia: Supabase usa el token de sesión para aplicar el RLS
        // y solo devuelve los productos donde empresa_id coincide.
        const { data, error } = await supabase
            .from('productos')
            .select('*') // Selecciona todos los campos de la tabla
            .eq('empresa_id', empresaId)
            .order('nombre', { ascending: true }); // Ordena alfabéticamente

        if (error) {
            console.error('Error al cargar productos:', error);
            setError('Error al cargar el inventario. Inténtalo de nuevo.');
            setProductos([]);
        } else {
            setProductos((data || []).map(item => ({
                ...item,
                precio_venta: Number(item.precio_venta),
                precio_costo: Number(item.precio_costo),
                stock_actual: Number(item.stock_actual),
                alerta_stock_min: Number(item.alerta_stock_min),
            })));
        }
        setLoading(false);
    }, [empresaId]);

    // Cargar productos al iniciar el componente
    useEffect(() => {
        if (!empresaId) {
            setProductos([]);
            setLoading(true);
            setError(null);
            return;
        }
        fetchProductos();
    }, [fetchProductos, refreshTrigger, empresaId]);

    // Retorna los datos y la función de refresco
    return { productos, loading, error, fetchProductos };
};

export default useInventario;