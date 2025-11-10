// src/hooks/useGastos.js

import { useState, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';

/**
 * Hook personalizado para manejar operaciones de gastos
 * @param {string} empresaId - ID de la empresa
 * @returns {object} - Funciones y estado para gestionar gastos
 */
const useGastos = (empresaId) => {
    const [gastos, setGastos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Obtener todos los gastos de la empresa
     */
    const obtenerGastos = useCallback(async () => {
        if (!empresaId) return;
        
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('gastos')
                .select(`
                    *,
                    usuario:perfiles!gastos_usuario_id_fkey(nombre_completo, nombre),
                    usuario_anula:perfiles!gastos_usuario_anula_id_fkey(nombre_completo, nombre)
                `)
                .eq('empresa_id', empresaId)
                .order('fecha_gasto', { ascending: false })
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setGastos(data || []);
        } catch (err) {
            console.error('Error obteniendo gastos:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    /**
     * Obtener gastos de una fecha específica
     */
    const obtenerGastosPorFecha = useCallback(async (fecha) => {
        if (!empresaId || !fecha) return [];
        
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('gastos')
                .select(`
                    *,
                    usuario:perfiles!gastos_usuario_id_fkey(nombre_completo, nombre),
                    usuario_anula:perfiles!gastos_usuario_anula_id_fkey(nombre_completo, nombre)
                `)
                .eq('empresa_id', empresaId)
                .eq('fecha_gasto', fecha)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            return data || [];
        } catch (err) {
            console.error('Error obteniendo gastos por fecha:', err);
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    /**
     * Obtener gastos del día actual
     */
    const obtenerGastosDelDia = useCallback(async () => {
        if (!empresaId) return [];
        
        const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return await obtenerGastosPorFecha(hoy);
    }, [empresaId, obtenerGastosPorFecha]);

    /**
     * Registrar un nuevo gasto usando la función RPC
     */
    const registrarGasto = useCallback(async (gastoData) => {
        if (!empresaId) {
            throw new Error('ID de empresa no disponible');
        }

        setLoading(true);
        setError(null);

        try {
            const { data: perfilData } = await supabase.auth.getUser();
            const usuarioId = perfilData?.user?.id;

            if (!usuarioId) {
                throw new Error('Usuario no autenticado');
            }

            // Llamar a la función RPC registrar_gasto
            const { data, error: rpcError } = await supabase.rpc('registrar_gasto', {
                p_empresa_id: empresaId,
                p_usuario_id: usuarioId,
                p_concepto: gastoData.concepto,
                p_categoria: gastoData.categoria,
                p_monto: parseFloat(gastoData.monto),
                p_metodo_pago: gastoData.metodo_pago || 'efectivo',
                p_numero_factura: gastoData.numero_factura || null,
                p_proveedor: gastoData.proveedor || null,
                p_descripcion: gastoData.descripcion || null,
                p_fecha_gasto: gastoData.fecha_gasto || new Date().toISOString().split('T')[0]
            });

            if (rpcError) throw rpcError;

            // Verificar si la función devolvió error
            if (data && !data.success) {
                throw new Error(data.message || 'Error al registrar el gasto');
            }

            // Recargar la lista de gastos
            await obtenerGastos();

            return {
                success: true,
                data: data,
                message: 'Gasto registrado exitosamente'
            };

        } catch (err) {
            console.error('Error registrando gasto:', err);
            setError(err.message);
            return {
                success: false,
                message: err.message
            };
        } finally {
            setLoading(false);
        }
    }, [empresaId, obtenerGastos]);

    /**
     * Anular un gasto existente usando la función RPC
     */
    const anularGasto = useCallback(async (gastoId, motivoAnulacion) => {
        if (!empresaId || !gastoId) {
            throw new Error('Datos insuficientes para anular el gasto');
        }

        if (!motivoAnulacion || motivoAnulacion.trim() === '') {
            throw new Error('Debe proporcionar un motivo para la anulación');
        }

        setLoading(true);
        setError(null);

        try {
            const { data: perfilData } = await supabase.auth.getUser();
            const usuarioId = perfilData?.user?.id;

            if (!usuarioId) {
                throw new Error('Usuario no autenticado');
            }

            // Llamar a la función RPC anular_gasto
            const { data, error: rpcError } = await supabase.rpc('anular_gasto', {
                p_gasto_id: gastoId,
                p_usuario_anula_id: usuarioId,
                p_motivo_anulacion: motivoAnulacion
            });

            if (rpcError) throw rpcError;

            // Verificar si la función devolvió error
            if (data && !data.success) {
                throw new Error(data.message || 'Error al anular el gasto');
            }

            // Recargar la lista de gastos
            await obtenerGastos();

            return {
                success: true,
                data: data,
                message: 'Gasto anulado exitosamente'
            };

        } catch (err) {
            console.error('Error anulando gasto:', err);
            setError(err.message);
            return {
                success: false,
                message: err.message
            };
        } finally {
            setLoading(false);
        }
    }, [empresaId, obtenerGastos]);

    /**
     * Obtener resumen de gastos por categoría para una fecha
     */
    const obtenerResumenPorCategoria = useCallback(async (fecha = null) => {
        if (!empresaId) return {};
        
        try {
            let query = supabase
                .from('gastos')
                .select('categoria, monto')
                .eq('empresa_id', empresaId)
                .eq('anulado', false);

            if (fecha) {
                query = query.eq('fecha_gasto', fecha);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            // Agrupar por categoría y sumar montos
            const resumen = (data || []).reduce((acc, gasto) => {
                const cat = gasto.categoria;
                if (!acc[cat]) {
                    acc[cat] = { total: 0, cantidad: 0 };
                }
                acc[cat].total += parseFloat(gasto.monto);
                acc[cat].cantidad += 1;
                return acc;
            }, {});

            return resumen;
        } catch (err) {
            console.error('Error obteniendo resumen por categoría:', err);
            return {};
        }
    }, [empresaId]);

    /**
     * Obtener total de gastos para una fecha
     */
    const obtenerTotalGastos = useCallback(async (fecha = null) => {
        if (!empresaId) return 0;
        
        try {
            let query = supabase
                .from('gastos')
                .select('monto')
                .eq('empresa_id', empresaId)
                .eq('anulado', false);

            if (fecha) {
                query = query.eq('fecha_gasto', fecha);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            const total = (data || []).reduce((sum, gasto) => sum + parseFloat(gasto.monto), 0);
            return total;
        } catch (err) {
            console.error('Error obteniendo total de gastos:', err);
            return 0;
        }
    }, [empresaId]);

    return {
        gastos,
        loading,
        error,
        obtenerGastos,
        obtenerGastosPorFecha,
        obtenerGastosDelDia,
        registrarGasto,
        anularGasto,
        obtenerResumenPorCategoria,
        obtenerTotalGastos
    };
};

export default useGastos;
