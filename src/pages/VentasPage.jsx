// src/pages/VentasPage.jsx (Refactorizado)
import React, { useState, useEffect, useCallback } from 'react'; 
import useAuth from '../hooks/useAuth';
import useInventario from '../hooks/useInventario'; 
import VentaProductosLista from '../components/ventas/VentaProductosLista';
import CarritoDeVentas from '../components/ventas/CarritoDeVentas';
import { supabase } from '../api/supabaseClient';
import { formatCurrencyCOP } from '../utils/formatters';
import '../styles/ventas.css';

const forceInventoryRefresh = () => {
    if (window.refreshInventory) {
        window.refreshInventory();
    }
};

const VentasPage = () => {
    const { perfil } = useAuth();
    const empresaId = perfil?.empresa_id;
    const userId = perfil?.id;

    const [carrito, setCarrito] = useState([]);
    const [loading, setLoading] = useState(false); // Para acciones de CAJA (Abrir/Cerrar)
    const [isProcessingSale, setIsProcessingSale] = useState(false); // Para el botón de VENTA

    const { 
        cajaStatus, 
        isLoadingCaja, 
        isCajaAbierta, 
        checkCajaStatus, 
        abrirCaja, 
        cerrarCaja 
    } = useInventario(); 

    // 💡 Performance: Función memoizada
    const getTodayDate = useCallback(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }), []);

    // ... (useEffect para window.refreshCajaStatus y checkCajaStatus - sin cambios)

    // Lógica de Estado
    const total = carrito.reduce((acc, item) => acc + (item.precio_venta * item.cantidad), 0);
    const isCajaAbiertaHoy = isCajaAbierta && cajaStatus?.fecha_apertura === getTodayDate();
    const isCheckoutDisabled = carrito.length === 0 || isProcessingSale || !isCajaAbiertaHoy;


    // ----------------------------------------------------
    // CONTROL DE CAJA
    // ----------------------------------------------------
    
    // 💡 Performance: Usar useCallback
    const handleAbrirCaja = useCallback(async () => {
        if (!userId) return; setLoading(true);
        const resultado = await abrirCaja(0); 
        if (!resultado.success) {
            alert(`Error al abrir caja: ${resultado.message}`);
        }
        setLoading(false);
    }, [userId, abrirCaja]);
    
    // 💡 Performance: Usar useCallback
    const handleCerrarCaja = useCallback(async () => {
        if (!userId) return;
        if (window.confirm('¿Estás seguro de cerrar la caja? Esto finalizará el día de ventas.')) {
            setLoading(true);
            const resultado = await cerrarCaja();
            if (!resultado.success) {
                alert(`Error al cerrar caja: ${resultado.message}`);
            }
            setLoading(false);
        }
    }, [userId, cerrarCaja]);
    
    // ----------------------------------------------------
    // LÓGICA DE VENTA Y CARRITO
    // ----------------------------------------------------
    
    // 💡 Performance: Usar useCallback + 🔒 Lógica de Stock
    const handleAddToCart = useCallback((producto) => {
        if (!isCajaAbiertaHoy) {
            alert("🚨 Caja Cerrada. No puedes añadir productos.");
            return;
        }
        
        setCarrito(prevCarrito => {
            const existe = prevCarrito.find(item => item.id === producto.id);

            if (existe) {
                // 🔒 Validación de Stock al incrementar
                if (existe.cantidad + 1 > producto.stock_actual) {
                    alert(`Stock insuficiente para ${producto.nombre}. Solo quedan ${producto.stock_actual} unidades.`);
                    return prevCarrito;
                }
                
                return prevCarrito.map(item =>
                    item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
                );
            } else {
                // 🔒 Validación de Stock inicial
                if (producto.stock_actual <= 0) {
                    alert(`El producto ${producto.nombre} no tiene stock disponible.`);
                    return prevCarrito;
                }
                return [...prevCarrito, { 
                    ...producto, 
                    cantidad: 1, 
                    precio_venta: Number(producto.precio_venta) || 0 
                }];
            }
        });
    }, [isCajaAbiertaHoy]);

    // 💡 Performance: Usar useCallback + 🔒 Lógica de Stock
    const handleUpdateCart = useCallback((productoId, nuevaCantidad) => {
        if (!isCajaAbiertaHoy) return; 

        const quantity = Number.parseInt(nuevaCantidad, 10);
        
        setCarrito(prevCarrito => {
            if (!Number.isFinite(quantity) || quantity <= 0) {
                 // Si es 0 o inválida, se elimina
                return prevCarrito.filter(item => item.id !== productoId);
            }

            const productoEnLista = prevCarrito.find(item => item.id === productoId);
            if (!productoEnLista) return prevCarrito;

            // 🔒 Validación de Stock al actualizar
            if (quantity > productoEnLista.stock_actual) {
                alert(`Stock insuficiente para ${productoEnLista.nombre}. Máximo permitido: ${productoEnLista.stock_actual}.`);
                // Ajustar la cantidad al máximo disponible
                return prevCarrito.map(item =>
                    item.id === productoId ? { ...item, cantidad: productoEnLista.stock_actual } : item
                );
            }

            return prevCarrito.map(item =>
                item.id === productoId ? { ...item, cantidad: quantity } : item
            );
        });
    }, [isCajaAbiertaHoy]);
    
    const handleFinalizarVenta = async () => {
        if (isCheckoutDisabled) return;

        setIsProcessingSale(true); 

        const itemsParaRPC = carrito.map(item => ({
            producto_id: item.id, cantidad: item.cantidad, precio_unitario: item.precio_venta
        }));

        const { data, error } = await supabase.rpc('registrar_venta', {
            p_empresa_id: empresaId, p_usuario_id: userId, p_items: itemsParaRPC
        });
        
        setIsProcessingSale(false);

        if (error) {
            alert(`Error al registrar la venta. Detalle: ${error.message}`);
        } else {
            alert(`Venta registrada exitosamente! Total: ${formatCurrencyCOP(data.total)}`); 
            setCarrito([]); 
            forceInventoryRefresh(); 
        }
    };

    // Renderizado
    if (isLoadingCaja || !perfil) {
        return <div className="loading-state card p-ventas__loading">Cargando estado de la caja...</div>;
    }

    if (!empresaId) {
        return <div className="error-state card p-ventas__loading">Error: ID de Empresa no encontrado.</div>
    }

    return (
        <div className="m-inventory-layout p-ventas">
            <header className="card p-ventas__header">
                <h2 className="card-title p-ventas__title">Punto de Venta (POS) - {perfil?.empresa?.nombre}</h2>
                <div className="p-ventas__controls">
                    {isCajaAbiertaHoy ? (
                        <button onClick={handleCerrarCaja} disabled={loading} className="btn btn-error">
                            {loading ? 'Cerrando...' : 'Cerrar Caja'}
                        </button>
                    ) : (
                        <button onClick={handleAbrirCaja} disabled={loading} className="btn btn-success">
                            Abrir Caja / Iniciar Día
                        </button>
                    )}
                </div>
            </header>
            <div className="p-ventas__grid">
                {/* Este DEBE ser un c-card / card */}
                <VentaProductosLista 
                    empresaId={empresaId} 
                    onAddToCart={handleAddToCart} 
                    isCajaAbierta={isCajaAbiertaHoy}
                />
                <div className="card p-ventas__carrito-section">
                    <CarritoDeVentas 
                        carrito={carrito} 
                        onUpdateCart={handleUpdateCart}
                        isCajaAbierta={isCajaAbiertaHoy}
                    />
                    <button
                        onClick={handleFinalizarVenta}
                        disabled={isCheckoutDisabled} 
                        className={`btn btn-primary btn-lg btn-full p-ventas__checkout-button`}
                    >
                        {isProcessingSale ? 'Procesando...' : `Finalizar Venta (${formatCurrencyCOP(total)})`}
                    </button>
                    {!isCajaAbiertaHoy && <p className="p-ventas__closed-box-alert">❌ La venta está bloqueada. Abre la caja para continuar.</p>}
                </div>
            </div>
        </div>
    );
};

export default VentasPage;