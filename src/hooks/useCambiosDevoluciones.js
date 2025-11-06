// src/hooks/useCambiosDevoluciones.js
// Hook para manejar cambios y devoluciones de productos

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';

export const useCambiosDevoluciones = (empresaId) => {
    const [cambios, setCambios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Cargar todos los cambios de la empresa
    const fetchCambios = useCallback(async () => {
        if (!empresaId) return;
        
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('cambios_devoluciones')
                .select(`
                    *,
                    usuario:perfiles!cambios_devoluciones_usuario_id_fkey(nombre_completo, nombre),
                    venta_original:ventas!cambios_devoluciones_venta_original_id_fkey(id, total_venta, fecha_venta)
                `)
                .eq('empresa_id', empresaId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setCambios(data || []);
        } catch (err) {
            console.error('Error al cargar cambios:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    // Buscar productos vendidos
    const buscarProductosVendidos = async (searchTerm = '') => {
        if (!empresaId) return [];

        try {
            // Primero obtenemos todos los productos vendidos de la empresa
            const { data, error: searchError } = await supabase
                .from('detalle_venta')
                .select(`
                    producto_id,
                    precio_unitario,
                    cantidad,
                    venta_id,
                    productos!inner (
                        id,
                        nombre,
                        precio_venta
                    ),
                    ventas!inner (
                        empresa_id,
                        fecha_venta
                    )
                `)
                .eq('ventas.empresa_id', empresaId)
                .limit(500);

            if (searchError) {
                console.error('Error en buscarProductosVendidos:', searchError);
                throw searchError;
            }

            console.log('Datos obtenidos:', data?.length);

            // Filtrar por nombre si hay búsqueda y agrupar
            const productosMap = new Map();
            
            data?.forEach(item => {
                // Si hay searchTerm, filtrar por nombre
                if (searchTerm && !item.productos.nombre.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return; // Skip este item
                }

                const key = item.producto_id;
                if (!productosMap.has(key)) {
                    productosMap.set(key, {
                        producto_id: item.producto_id,
                        nombre: item.productos.nombre,
                        precio_venta: item.productos.precio_venta,
                        ventas_ids: [],
                        total_vendido: 0
                    });
                }
                
                const producto = productosMap.get(key);
                if (!producto.ventas_ids.includes(item.venta_id)) {
                    producto.ventas_ids.push(item.venta_id);
                }
                producto.total_vendido += item.cantidad;
            });

            const resultado = Array.from(productosMap.values());
            console.log('Productos encontrados:', resultado.length);
            return resultado;
        } catch (err) {
            console.error('Error al buscar productos vendidos:', err);
            return [];
        }
    };

    // Buscar ventas que contengan un producto específico
    const buscarVentasPorProducto = async (productoId) => {
        if (!empresaId || !productoId) return [];

        try {
            const { data, error } = await supabase
                .from('detalle_venta')
                .select(`
                    venta_id,
                    ventas!inner (
                        id,
                        numero_venta,
                        fecha_venta,
                        total_venta,
                        empresa_id
                    )
                `)
                .eq('ventas.empresa_id', empresaId)
                .eq('producto_id', productoId);

            if (error) throw error;

            // Eliminar duplicados y ordenar por fecha
            const ventasUnicas = [];
            const idsVistos = new Set();
            
            data?.forEach(item => {
                const venta = item.ventas;
                if (!idsVistos.has(venta.id)) {
                    idsVistos.add(venta.id);
                    ventasUnicas.push(venta);
                }
            });

            // Ordenar por fecha descendente (más reciente primero)
            ventasUnicas.sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta));

            return ventasUnicas;
        } catch (err) {
            console.error('Error al buscar ventas por producto:', err);
            return [];
        }
    };

    // Buscar ventas recientes para seleccionar
    const buscarVentas = async (searchTerm = '') => {
        if (!empresaId) return [];

        try {
            // Búsqueda por número de venta
            const isNumeric = !isNaN(searchTerm) && searchTerm !== '';
            
            let query = supabase
                .from('ventas')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('fecha_venta', { ascending: false });

            if (isNumeric) {
                query = query.eq('numero_venta', parseInt(searchTerm));
            } else {
                query = query.limit(50);
            }

            const { data, error: searchError } = await query;
            if (searchError) throw searchError;

            return data || [];
        } catch (err) {
            console.error('Error al buscar ventas:', err);
            return [];
        }
    };

    // Obtener productos de una venta específica
    const obtenerProductosVenta = async (ventaId) => {
        if (!ventaId) return [];

        try {
            const { data, error: fetchError } = await supabase
                .from('detalle_venta')
                .select(`
                    *,
                    producto:productos(id, nombre, precio_venta, stock_actual)
                `)
                .eq('venta_id', ventaId);

            if (fetchError) throw fetchError;

            return data || [];
        } catch (err) {
            console.error('Error al obtener productos de venta:', err);
            return [];
        }
    };

    // Procesar un cambio/devolución
    const procesarCambio = async (cambioData) => {
        setLoading(true);
        setError(null);

        try {
            const {
                ventaOriginalId,
                productosDevueltos,
                productosNuevos,
                valorDevolucion,
                valorNuevos,
                diferencia,
                motivo,
                observaciones,
                usuarioId
            } = cambioData;

            // Llamar a la función de Supabase que procesa todo
            const { data, error: rpcError } = await supabase
                .rpc('procesar_cambio_devolucion', {
                    p_empresa_id: empresaId,
                    p_usuario_id: usuarioId,
                    p_venta_original_id: ventaOriginalId,
                    p_productos_devueltos: productosDevueltos,
                    p_productos_nuevos: productosNuevos,
                    p_valor_devolucion: valorDevolucion,
                    p_valor_nuevos: valorNuevos,
                    p_diferencia: diferencia,
                    p_motivo: motivo,
                    p_observaciones: observaciones
                });

            if (rpcError) throw rpcError;

            // Recargar lista de cambios
            await fetchCambios();

            return { success: true, cambioId: data };
        } catch (err) {
            console.error('Error al procesar cambio:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // Anular un cambio/devolución
    const anularCambio = async (cambioId, usuarioId, motivo_anulacion) => {
        setLoading(true);
        setError(null);

        try {
            console.log('🔄 Intentando anular cambio:', { cambioId, usuarioId, motivo_anulacion });

            // Llamar a la función RPC que revierte todo el cambio
            const { data, error: rpcError } = await supabase
                .rpc('anular_cambio_devolucion', {
                    p_cambio_id: cambioId,
                    p_usuario_anula_id: usuarioId,
                    p_motivo_anulacion: motivo_anulacion
                });

            if (rpcError) {
                console.error('❌ Error RPC completo:', rpcError);
                
                // Si es error 404, significa que la función no existe
                if (rpcError.code === 'PGRST202' || rpcError.message?.includes('not found')) {
                    throw new Error('⚠️ La función anular_cambio_devolucion no existe en Supabase. Por favor ejecuta el script SQL: docs/CREAR_FUNCION_ANULAR_CAMBIO.sql');
                }
                
                throw rpcError;
            }

            console.log('✅ Cambio anulado exitosamente:', data);

            // Recargar lista de cambios
            await fetchCambios();

            return { success: true, message: 'Cambio anulado correctamente' };
        } catch (err) {
            console.error('❌ Error al anular cambio:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // Cargar cambios al montar el componente
    useEffect(() => {
        fetchCambios();
    }, [fetchCambios]);

    return {
        cambios,
        loading,
        error,
        fetchCambios,
        buscarProductosVendidos,
        buscarVentasPorProducto,
        buscarVentas,
        obtenerProductosVenta,
        procesarCambio,
        anularCambio
    };
};

export default useCambiosDevoluciones;
