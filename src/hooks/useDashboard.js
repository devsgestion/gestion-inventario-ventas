// src/hooks/useDashboard.js
// Hook personalizado para manejar todos los datos del Dashboard

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';

/**
 * Hook para cargar y gestionar todos los datos del Dashboard
 * @param {string} empresaId - UUID de la empresa
 * @returns {Object} Objeto con datos y funciones del dashboard
 */
const useDashboard = (empresaId) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Estados para cada sección del dashboard
    const [resumenGeneral, setResumenGeneral] = useState(null);
    const [ventasUltimos30Dias, setVentasUltimos30Dias] = useState([]);
    const [productosMasVendidos, setProductosMasVendidos] = useState([]);
    const [productosBajoStock, setProductosBajoStock] = useState([]);
    const [comparacionMensual, setComparacionMensual] = useState(null);
    const [ventasPorHora, setVentasPorHora] = useState([]);

    /**
     * Carga el resumen general del negocio
     */
    const fetchResumenGeneral = useCallback(async () => {
        if (!empresaId) return;

        try {
            const { data, error } = await supabase.rpc('get_resumen_general', {
                p_empresa_id: empresaId
            });

            if (error) throw error;
            
            setResumenGeneral(data && data.length > 0 ? data[0] : null);
        } catch (err) {
            console.error('Error cargando resumen general:', err);
            setError(err.message);
        }
    }, [empresaId]);

    /**
     * Carga las ventas de los últimos 30 días
     */
    const fetchVentasUltimos30Dias = useCallback(async () => {
        if (!empresaId) return;

        try {
            const { data, error } = await supabase.rpc('get_ventas_ultimos_30_dias', {
                p_empresa_id: empresaId
            });

            if (error) throw error;
            
            // Formatear fechas para los gráficos
            const formattedData = (data || []).map(item => ({
                ...item,
                fecha: new Date(item.fecha).toLocaleDateString('es-CO', { 
                    month: 'short', 
                    day: 'numeric' 
                }),
                total_ventas: parseFloat(item.total_ventas || 0),
                total_costos: parseFloat(item.total_costos || 0),
                utilidad: parseFloat(item.utilidad || 0)
            })).reverse(); // Revertir para mostrar cronológicamente

            setVentasUltimos30Dias(formattedData);
        } catch (err) {
            console.error('Error cargando ventas últimos 30 días:', err);
            setError(err.message);
        }
    }, [empresaId]);

    /**
     * Carga los productos más vendidos
     */
    const fetchProductosMasVendidos = useCallback(async (limite = 10, dias = 30) => {
        if (!empresaId) return;

        try {
            const { data, error } = await supabase.rpc('get_productos_mas_vendidos', {
                p_empresa_id: empresaId,
                p_limite: limite,
                p_dias: dias
            });

            if (error) throw error;
            
            const formattedData = (data || []).map(item => ({
                ...item,
                nombre: item.producto_nombre,
                cantidad: parseInt(item.cantidad_vendida || 0),
                ingresos: parseFloat(item.total_ingresos || 0),
                utilidad: parseFloat(item.total_utilidad || 0)
            }));

            setProductosMasVendidos(formattedData);
        } catch (err) {
            console.error('Error cargando productos más vendidos:', err);
            setError(err.message);
        }
    }, [empresaId]);

    /**
     * Carga productos con stock bajo
     */
    const fetchProductosBajoStock = useCallback(async () => {
        if (!empresaId) return;

        try {
            const { data, error } = await supabase.rpc('get_productos_bajo_stock', {
                p_empresa_id: empresaId
            });

            if (error) throw error;
            
            const formattedData = (data || []).map(item => ({
                ...item,
                nombre: item.producto_nombre,
                stock: item.stock_actual,
                minimo: item.stock_minimo,
                deficit: item.deficit,
                valor: parseFloat(item.valor_reposicion || 0)
            }));

            setProductosBajoStock(formattedData);
        } catch (err) {
            console.error('Error cargando productos bajo stock:', err);
            setError(err.message);
        }
    }, [empresaId]);

    /**
     * Carga la comparación mensual
     */
    const fetchComparacionMensual = useCallback(async () => {
        if (!empresaId) return;

        try {
            const { data, error } = await supabase.rpc('get_comparacion_mensual', {
                p_empresa_id: empresaId
            });

            if (error) throw error;
            
            setComparacionMensual(data && data.length > 0 ? data[0] : null);
        } catch (err) {
            console.error('Error cargando comparación mensual:', err);
            setError(err.message);
        }
    }, [empresaId]);

    /**
     * Carga las ventas por hora del día actual con productos
     */
    const fetchVentasPorHora = useCallback(async (fecha = null) => {
        if (!empresaId) return;

        try {
            // Si no se pasa fecha, usar fecha actual en Colombia
            let fechaParam = fecha;
            if (!fechaParam) {
                const now = new Date();
                const colombiaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
                const year = colombiaDate.getFullYear();
                const month = String(colombiaDate.getMonth() + 1).padStart(2, '0');
                const day = String(colombiaDate.getDate()).padStart(2, '0');
                fechaParam = `${year}-${month}-${day}`;
            }
            
            const params = { 
                p_empresa_id: empresaId,
                p_fecha: fechaParam
            };

            // Intentar usar la nueva función con productos
            const { data, error } = await supabase.rpc('get_ventas_por_hora_con_productos', params);

            if (error) {
                // Si falla, intentar con la función antigua
                console.warn('Función con productos no disponible, usando función básica:', error.message);
                const fallback = await supabase.rpc('get_ventas_por_hora', params);
                
                if (fallback.error) throw fallback.error;
                
                // Crear array con todas las horas (0-23) para visualización completa
                const allHours = Array.from({ length: 24 }, (_, i) => {
                    const hourData = (fallback.data || []).find(item => item.hora === i);
                    return {
                        hora: `${i}:00`,
                        horaNum: i,
                        ventas: hourData ? parseFloat(hourData.total_ventas || 0) : 0,
                        transacciones: hourData ? parseInt(hourData.cantidad_transacciones || 0) : 0,
                        productos: []
                    };
                });

                setVentasPorHora(allHours);
                return;
            }
            
            // Formatear datos con productos
            const formattedData = (data || []).map(item => ({
                hora: item.hora,
                horaNum: item.hora_numero,
                ventas: parseFloat(item.total_ventas || 0),
                total_ventas: parseFloat(item.total_ventas || 0),
                transacciones: parseInt(item.transacciones || 0),
                productos: Array.isArray(item.productos) ? item.productos : []
            }));

            setVentasPorHora(formattedData);
        } catch (err) {
            console.error('Error cargando ventas por hora:', err);
            setError(err.message);
        }
    }, [empresaId]);

    /**
     * Carga todos los datos del dashboard
     */
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            await Promise.all([
                fetchResumenGeneral(),
                fetchVentasUltimos30Dias(),
                fetchProductosMasVendidos(),
                fetchProductosBajoStock(),
                fetchComparacionMensual(),
                fetchVentasPorHora()
            ]);
        } catch (err) {
            console.error('Error cargando datos del dashboard:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [
        fetchResumenGeneral,
        fetchVentasUltimos30Dias,
        fetchProductosMasVendidos,
        fetchProductosBajoStock,
        fetchComparacionMensual,
        fetchVentasPorHora
    ]);

    /**
     * Refresca todos los datos
     */
    const refresh = useCallback(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Cargar datos inicialmente
    useEffect(() => {
        if (empresaId) {
            fetchAllData();
        }
    }, [empresaId, fetchAllData]);

    // Escuchar eventos de actualización global
    useEffect(() => {
        const handleRefresh = () => {
            fetchAllData();
        };

        window.addEventListener('dashboard-refresh', handleRefresh);
        window.addEventListener('caja-status-changed', handleRefresh);

        return () => {
            window.removeEventListener('dashboard-refresh', handleRefresh);
            window.removeEventListener('caja-status-changed', handleRefresh);
        };
    }, [fetchAllData]);

    return {
        // Estados
        loading,
        error,
        
        // Datos
        resumenGeneral,
        ventasUltimos30Dias,
        productosMasVendidos,
        productosBajoStock,
        comparacionMensual,
        ventasPorHora,
        
        // Funciones
        refresh,
        fetchResumenGeneral,
        fetchVentasUltimos30Dias,
        fetchProductosMasVendidos: (limite, dias) => fetchProductosMasVendidos(limite, dias),
        fetchProductosBajoStock,
        fetchComparacionMensual,
        fetchVentasPorHora: (fecha) => fetchVentasPorHora(fecha)
    };
};

export default useDashboard;
