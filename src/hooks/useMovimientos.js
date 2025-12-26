import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';

const useMovimientos = (empresaId) => {
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMovimientos = useCallback(async ({ startDate, endDate, tipoMovimiento } = {}) => {
        if (!empresaId) return;
        setLoading(true);
        try {
            // 1. Fetch movimientos with product details and user details
            let query = supabase
                .from('movimientos_inventario')
                .select(`
                    *,
                    producto:productos (nombre, codigo_referencia),
                    usuario:perfiles (nombre_completo)
                `)
                .eq('empresa_id', empresaId)
                .order('fecha', { ascending: false })
                .order('id', { ascending: false }); // 🛑 Orden secundario por ID para consistencia en misma fecha

            // Apply filters
            if (startDate) {
                query = query.gte('fecha', startDate);
            }
            if (endDate) {
                const nextDay = new Date(endDate);
                nextDay.setDate(nextDay.getDate() + 1);
                query = query.lt('fecha', nextDay.toISOString());
            }
            
            if (tipoMovimiento && tipoMovimiento !== 'TODOS') {
                if (tipoMovimiento === 'CAMBIO') {
                    // CASO 1: CAMBIOS / DEVOLUCIONES
                    // Trae registros que sean explícitamente 'DEVOLUCION' 
                    // O que sean cualquier tipo pero tengan 'Devolución' en la razón
                    query = query.or(`tipo_movimiento.eq.DEVOLUCION,razon.ilike.%Devolución%`);
                } else if (tipoMovimiento === 'AJUSTE_STOCK') {
                    // CASO 2: AJUSTES DE STOCK (Incluye manuales y recepciones)
                    // Trae 'ajuste_stock', 'ajuste' O 'recepcion'
                    // Y EXCLUYE los que tengan 'Devolución' en la razón
                    query = query.or('tipo_movimiento.ilike.ajuste_stock,tipo_movimiento.ilike.ajuste,tipo_movimiento.ilike.recepcion')
                                 .not('razon', 'ilike', '%Devolución%');
                } else {
                    // CASO 3: OTROS (VENTA, COMPRA, ETC)
                    query = query.ilike('tipo_movimiento', tipoMovimiento);
                }
            }

            // Default limit if no date range is specified to avoid fetching everything
            if (!startDate && !endDate) {
                query = query.limit(200);
            }

            const { data: movimientosData, error: movimientosError } = await query;

            if (movimientosError) throw movimientosError;

            // 2. Extract unique user IDs
            const userIds = [...new Set(movimientosData
                .map(m => m.usuario_id)
                .filter(id => id) // Filter out nulls
            )];

            // 3. Fetch user profiles if there are any users
            let profilesMap = {};
            if (userIds.length > 0) {
                const { data: profilesData, error: profilesError } = await supabase
                    .from('perfiles')
                    .select('id, nombre_completo')
                    .in('id', userIds);
                
                if (profilesError) {
                    console.warn('Error fetching profiles:', profilesError);
                } else {
                    profilesData.forEach(p => {
                        profilesMap[p.id] = p;
                    });
                }
            }

            // 4. Fetch prices for sales if needed
            const saleMovements = movimientosData.filter(m => m.tipo_movimiento === 'VENTA');
            const salePricesMap = {};
            
            if (saleMovements.length > 0) {
                const ventaIds = [...new Set(saleMovements.map(m => {
                    const match = m.razon?.match(/Venta Registrada: ([\w-]+)/);
                    return match ? match[1] : null;
                }).filter(id => id))];

                if (ventaIds.length > 0) {
                    const { data: detalleData, error: detalleError } = await supabase
                        .from('detalle_venta')
                        .select('venta_id, producto_id, precio_unitario')
                        .in('venta_id', ventaIds)
                        .order('id', { ascending: true }); // 🛑 Ordenar por ID para coincidir con inserción

                    if (!detalleError && detalleData) {
                        detalleData.forEach(d => {
                            const key = `${d.venta_id}_${d.producto_id}`;
                            if (!salePricesMap[key]) salePricesMap[key] = [];
                            salePricesMap[key].push(d.precio_unitario);
                        });
                    }
                }
            }

            // 5. Merge data
            const enrichedMovimientos = movimientosData.map(m => {
                let precio_venta = null;
                if (m.tipo_movimiento === 'VENTA') {
                    const match = m.razon?.match(/Venta Registrada: ([\w-]+)/);
                    const ventaId = match ? match[1] : null;
                    if (ventaId) {
                        const key = `${ventaId}_${m.producto_id}`;
                        if (salePricesMap[key] && salePricesMap[key].length > 0) {
                            // Como movimientosData está en DESC (último primero),
                            // y detalleData en ASC (primero primero),
                            // sacamos del final del array (pop) para el movimiento más reciente.
                            precio_venta = salePricesMap[key].pop();
                        }
                    }
                }

                return {
                    ...m,
                    precio_venta,
                    usuario: profilesMap[m.usuario_id] || { nombre_completo: 'Usuario Desconocido' }
                };
            });

            setMovimientos(enrichedMovimientos);
        } catch (err) {
            console.error('Error fetching movimientos:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    useEffect(() => {
        fetchMovimientos();
    }, [fetchMovimientos]);

    return { movimientos, loading, error, fetchMovimientos };
};

export default useMovimientos;
