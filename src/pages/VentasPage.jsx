// src/pages/VentasPage.jsx (Refactorizado)
import React, { useState, useEffect, useCallback } from 'react'; 
import useAuth from '../hooks/useAuth';
import useInventario from '../hooks/useInventario'; 
import VentaProductosLista from '../components/ventas/VentaProductosLista';
import CarritoDeVentas from '../components/ventas/CarritoDeVentas';
import { supabase } from '../api/supabaseClient';
import { formatCurrencyCOP } from '../utils/formatters';
import { printTicket } from '../utils/printTicket';
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

    // 🛑 MODIFICACIÓN: Inicializa el carrito desde LocalStorage 🛑
    const [carrito, setCarrito] = useState(() => {
        const storedItems = localStorage.getItem('carritoVentaActual');
        try {
            return storedItems ? JSON.parse(storedItems) : [];
        } catch (e) {
            console.error("Error al cargar carrito desde LocalStorage:", e);
            return [];
        }
    });

    const [loading, setLoading] = useState(false); // Para acciones de CAJA (Abrir/Cerrar)
    const [isProcessingSale, setIsProcessingSale] = useState(false); // Para el botón de VENTA
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showCloseCajaModal, setShowCloseCajaModal] = useState(false);
    const [showCloseCajaAlert, setShowCloseCajaAlert] = useState(false);
    const [lastSaleData, setLastSaleData] = useState(null); // Para guardar datos de última venta
    const [showPrintModal, setShowPrintModal] = useState(false); // Modal para imprimir
    const [imprimirTicketsHabilitado, setImprimirTicketsHabilitado] = useState(true); // Config de impresión

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

    // 🛑 CRÍTICO: Guardar el carrito cada vez que carrito cambie 🛑
    useEffect(() => {
        if (carrito.length > 0) {
            // Guardamos el JSON serializado
            localStorage.setItem('carritoVentaActual', JSON.stringify(carrito));
        } else {
            // Si el carrito está vacío, limpiamos la clave
            localStorage.removeItem('carritoVentaActual');
        }
    }, [carrito]); // Dependencia CRÍTICA: carrito

    // 🛑 NUEVO: Cargar configuración de impresión 🛑
    useEffect(() => {
        const loadPrintConfig = async () => {
            if (!empresaId) return;

            try {
                const { data, error } = await supabase
                    .from('configuraciones_empresa')
                    .select('imprimir_tickets_habilitado')
                    .eq('empresa_id', empresaId)
                    .single();

                if (data && !error) {
                    setImprimirTicketsHabilitado(data.imprimir_tickets_habilitado ?? true);
                }
            } catch (error) {
                console.error('Error al cargar config de impresión:', error);
            }
        };

        loadPrintConfig();
    }, [empresaId]);

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
        setShowCloseCajaModal(true);
    }, []);

    const confirmarCerrarCaja = useCallback(async () => {
        setShowCloseCajaModal(false);
        if (!userId) return;
        setLoading(true);
        const resultado = await cerrarCaja();
        setLoading(false);
        if (!resultado.success) {
            alert(`Error al cerrar caja: ${resultado.message}`);
        } else {
            setShowCloseCajaAlert(true);
            setTimeout(() => setShowCloseCajaAlert(false), 2500);
        }
    }, [userId, cerrarCaja]);
    
    // ----------------------------------------------------
    // LÓGICA DE VENTA Y CARRITO
    // ----------------------------------------------------
    
    // 🛑 NUEVA FUNCIÓN: Modificar Precio de un Ítem en el Carrito 🛑
    const handleUpdatePriceInCart = useCallback((cartItemId, nuevoPrecioString) => {
        const nuevoPrecio = Math.max(0, parseFloat(nuevoPrecioString) || 0);
        setCarrito(prevCarrito => prevCarrito.map(item =>
            item.cartItemId === cartItemId ? { ...item, precio_venta: nuevoPrecio } : item
        ));
    }, []);

    // 💡 Performance: Usar useCallback + 🔒 Lógica de Stock
    const generateUniqueCartId = () => Math.random().toString(36).substring(2, 9);

    const handleAddToCart = useCallback((producto) => {
        if (!isCajaAbiertaHoy) {
            alert("🚨 Caja Cerrada. No puedes añadir productos.");
            return;
        }
        // NO BUSCAMOS existencias, siempre creamos una nueva línea.
        setCarrito(prevCarrito => [
            ...prevCarrito,
            {
                ...producto,
                // CRÍTICO: Usamos un ID único para la línea del carrito (temporal)
                cartItemId: generateUniqueCartId(),
                cantidad: 1,
                precio_venta: Number(producto.precio_venta) || 0,
                // 🛑 AJUSTE CRÍTICO: Guardar el precio de costo (CPP) actual 🛑
                precio_costo: Number(producto.precio_costo) || 0 
            }
        ]);
    }, [isCajaAbiertaHoy]);

    // 💡 Performance: Usar useCallback + 🔒 Lógica de Stock
    const handleUpdateCart = useCallback((cartItemId, nuevaCantidad) => {
        if (!isCajaAbiertaHoy) return; 

        const quantity = Number.parseInt(nuevaCantidad, 10);

        setCarrito(prevCarrito => {
            if (!Number.isFinite(quantity) || quantity <= 0) {
                // Si es 0 o inválida, se elimina usando cartItemId
                return prevCarrito.filter(item => item.cartItemId !== cartItemId);
            }

            const productoEnLista = prevCarrito.find(item => item.cartItemId === cartItemId);
            if (!productoEnLista) return prevCarrito;

            // 🔒 Validación de Stock al actualizar
            if (quantity > productoEnLista.stock_actual) {
                setStockErrorMsg(`Stock insuficiente para ${productoEnLista.nombre}. Máximo permitido: ${productoEnLista.stock_actual}.`);
                setTimeout(() => setStockErrorMsg(''), 2500);
                // Ajustar la cantidad al máximo disponible
                return prevCarrito.map(item =>
                    item.cartItemId === cartItemId ? { ...item, cantidad: productoEnLista.stock_actual } : item
                );
            }

            return prevCarrito.map(item =>
                item.cartItemId === cartItemId ? { ...item, cantidad: quantity } : item
            );
        });
    }, [isCajaAbiertaHoy]);
    
    const handleFinalizarVenta = async () => {
        setShowConfirmModal(true);
    };

    const confirmarFinalizarVenta = async () => {
        setShowConfirmModal(false);
        if (isCheckoutDisabled) return;

        setIsProcessingSale(true);

        const itemsParaRPC = carrito.map(item => ({
            producto_id: item.id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_venta,
            costo_unitario: item.precio_costo
        }));

        const { data, error } = await supabase.rpc('registrar_venta', {
            p_empresa_id: empresaId,
            p_usuario_id: userId,
            p_items: itemsParaRPC
        });

        setIsProcessingSale(false);

        if (error) {
            alert(`Error al registrar la venta. Detalle: ${error.message}`);
        } else {
            // 🛑 NUEVO: Guardar datos de la venta para imprimir 🛑
            const ventaData = {
                numeroVenta: data || `VENTA-${Date.now()}`,
                items: carrito.map(item => ({
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_venta
                })),
                total: total,
                fecha: new Date().toISOString(),
                empresa: {
                    nombre: perfil?.empresa?.nombre || 'MI NEGOCIO'
                }
            };
            
            setLastSaleData(ventaData);
            
            // Éxito: Limpiar estado y persistencia
            setCarrito([]); // Limpia el estado de React
            
            // 🛑 CRÍTICO: Limpiar la persistencia 🛑
            localStorage.removeItem('carritoVentaActual'); 
            
            setShowSuccessAlert(true);
            
            // 🛑 MODIFICADO: Solo mostrar modal si está habilitado 🛑
            if (imprimirTicketsHabilitado) {
                setShowPrintModal(true);
            }
            
            setTimeout(() => setShowSuccessAlert(false), 2500);
            forceInventoryRefresh();
        }
    };

    // Estado para el mensaje de error de stock
    const [stockErrorMsg, setStockErrorMsg] = useState('');

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
                <h2 className="card-title p-ventas__title">Punto de Venta - {perfil?.empresa?.nombre}</h2>
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
                        // 🛑 PASAR LA NUEVA FUNCIÓN DE EDICIÓN 🛑
                        onUpdatePrice={handleUpdatePriceInCart} 
                        isCajaAbierta={isCajaAbiertaHoy}
                    />
                    <button
                        onClick={handleFinalizarVenta}
                        disabled={isCheckoutDisabled} 
                        className={`btn btn-primary btn-lg btn-full p-ventas__checkout-button`}
                    >
                        {isProcessingSale ? 'Procesando...' : 'Finalizar Venta'}
                    </button>
                    {!isCajaAbiertaHoy && <p className="p-ventas__closed-box-alert">❌ La venta está bloqueada. Abre la caja para continuar.</p>}
                </div>
            </div>

            {/* Modal de confirmación de venta */}
            {showConfirmModal && (
                <div className="c-modal-overlay">
                    <div className="c-modal-content" style={{ maxWidth: 380 }}>
                        <div className="c-modal-header">
                            <h3 className="c-modal-title">¿Finalizar venta?</h3>
                        </div>
                        <div className="c-modal-body">
                            <p className="c-form-message c-form-message--help u-mb-lg">
                                ¿Estás seguro de finalizar la venta? Esta acción no se puede deshacer.
                            </p>
                            <div className="c-modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>
                                    Cancelar
                                </button>
                                <button className="btn btn-primary btn-success" onClick={confirmarFinalizarVenta}>
                                    Sí, Finalizar Venta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación de cierre de caja */}
            {showCloseCajaModal && (
                <div className="c-modal-overlay">
                    <div className="c-modal-content" style={{ maxWidth: 380 }}>
                        <div className="c-modal-header">
                            <h3 className="c-modal-title">¿Cerrar caja?</h3>
                        </div>
                        <div className="c-modal-body">
                            <p className="c-form-message c-form-message--help u-mb-lg">
                                ¿Estás seguro de cerrar la caja? Esto finalizará el día de ventas.
                            </p>
                            <div className="c-modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowCloseCajaModal(false)}>
                                    Cancelar
                                </button>
                                <button className="btn btn-primary btn-success" onClick={confirmarCerrarCaja}>
                                    Sí, Cerrar Caja
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerta flotante de éxito venta */}
            {showSuccessAlert && (
                <div className="c-toast c-toast--success">
                    <span>✅ ¡Venta registrada exitosamente!</span>
                </div>
            )}

            {/* 🛑 NUEVO: Modal para imprimir ticket 🛑 */}
            {showPrintModal && lastSaleData && (
                <div className="c-modal-overlay">
                    <div className="c-modal-content" style={{ maxWidth: 420 }}>
                        <div className="c-modal-header">
                            <h3 className="c-modal-title">✅ Venta Exitosa</h3>
                        </div>
                        <div className="c-modal-body">
                            <div className="c-print-summary">
                                <p className="c-form-message c-form-message--success u-mb-md">
                                    La venta se ha registrado correctamente
                                </p>
                                <div className="c-print-info">
                                    <div className="c-print-info__item">
                                        <span className="c-print-info__label">Total:</span>
                                        <strong className="c-print-info__value">{formatCurrencyCOP(lastSaleData.total)}</strong>
                                    </div>
                                    <div className="c-print-info__item">
                                        <span className="c-print-info__label">Items:</span>
                                        <strong className="c-print-info__value">{lastSaleData.items.length} productos</strong>
                                    </div>
                                </div>
                            </div>
                            <p className="c-form-message c-form-message--help u-mt-md u-mb-lg">
                                ¿Deseas imprimir el ticket de venta?
                            </p>
                            <div className="c-modal-footer">
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => setShowPrintModal(false)}
                                >
                                    No, Continuar
                                </button>
                                <button 
                                    className="btn btn-primary btn-success" 
                                    onClick={() => {
                                        printTicket(lastSaleData);
                                        setShowPrintModal(false);
                                    }}
                                >
                                    🖨️ Sí, Imprimir Ticket
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerta flotante de cierre de caja */}
            {showCloseCajaAlert && (
                <div className="c-toast c-toast--success">
                    <span>✅ ¡Caja cerrada correctamente!</span>
                </div>
            )}

            {/* Mensaje visual de stock insuficiente */}
            {stockErrorMsg && (
                <div className="c-toast c-toast--error">
                    <span>⚠️ {stockErrorMsg}</span>
                </div>
            )}
        </div>
    );
};

export default VentasPage;
