// src/pages/VentasPage.jsx (Refactorizado)
import React, { useState, useEffect, useCallback, useRef } from 'react'; 
import useAuth from '../hooks/useAuth';
import useInventario from '../hooks/useInventario'; 
import VentaProductosLista from '../components/ventas/VentaProductosLista';
import CarritoDeVentas from '../components/ventas/CarritoDeVentas';
import { supabase } from '../api/supabaseClient';
import { formatCurrencyCOP } from '../utils/formatters';
import '../styles/ventas.css';
import { useReactToPrint } from 'react-to-print';
import FacturaTicket from '../components/FacturaTicket'; // Importar el componente de ticket

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

    // 1. Crear una referencia para el componente de ticket
    const componentRef = useRef();
    
    // 🛑 NUEVO ESTADO: Para los datos de la última venta
    const [datosUltimaVenta, setDatosUltimaVenta] = useState(null);
    const [ventaFinalizada, setVentaFinalizada] = useState(false);

    // 2. Función handlePrint usando el hook
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Factura_${new Date().toISOString().split('T')[0]}`,
        pageStyle: `
            @page { 
                size: ${localStorage.getItem('paper_width') || '80mm'} 200mm; 
                margin: 0; 
            }
            @media print {
                body { -webkit-print-color-adjust: exact; }
            }
        `,
        onAfterPrint: () => {
            // Opcional: Limpiar el estado después de imprimir
            const copies = parseInt(localStorage.getItem('print_copies')) || 1;
            if (copies === 1) {
                setVentaFinalizada(false);
                setDatosUltimaVenta(null);
            }
        }
    });

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
            // 🛑 PREPARAR DATOS PARA IMPRESIÓN 🛑
            const ventaParaImprimir = {
                fecha: new Date(),
                numero: data.venta_id?.slice(-8) || 'N/A',
                total: total,
                utilidad: carrito.reduce((acc, item) => acc + ((item.precio_venta - item.precio_costo) * item.cantidad), 0),
                vendedor: perfil.nombre,
                items: carrito.map(item => ({
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_venta,
                    precio_total: item.precio_venta * item.cantidad
                }))
            };

            setDatosUltimaVenta(ventaParaImprimir);
            setVentaFinalizada(true);

            // Éxito: Limpiar carrito
            setCarrito([]);
            localStorage.removeItem('carritoVentaActual');
            
            setShowSuccessAlert(true);
            setTimeout(() => setShowSuccessAlert(false), 2500);
            forceInventoryRefresh();

            // 🛑 AUTO-IMPRESIÓN SI ESTÁ HABILITADA 🛑
            const autoPrint = localStorage.getItem('auto_print') === 'true';
            if (autoPrint) {
                setTimeout(() => handlePrint(), 1000); // Delay para asegurar que el componente se renderice
            }
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

            {/* 🛑 PANEL DE VENTA FINALIZADA 🛑 */}
            {ventaFinalizada && datosUltimaVenta && (
                <div className="c-modal-overlay">
                    <div className="c-modal-content" style={{ maxWidth: '400px' }}>
                        <div className="c-modal-header">
                            <h3 className="c-modal-title">✅ ¡Venta Exitosa!</h3>
                        </div>
                        <div className="c-modal-body">
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '20px',
                                backgroundColor: 'var(--color-surface-200)',
                                borderRadius: '8px',
                                marginBottom: '20px'
                            }}>
                                <p><strong>Total:</strong> {formatCurrencyCOP(datosUltimaVenta.total)}</p>
                                <p><strong>Utilidad:</strong> {formatCurrencyCOP(datosUltimaVenta.utilidad)}</p>
                                <p><strong>Venta #:</strong> {datosUltimaVenta.numero}</p>
                            </div>
                            
                            <div className="c-modal-footer">
                                <button 
                                    onClick={() => {
                                        setVentaFinalizada(false);
                                        setDatosUltimaVenta(null);
                                    }}
                                    className="btn btn-secondary"
                                >
                                    Cerrar
                                </button>
                                <button 
                                    onClick={handlePrint} 
                                    className="btn btn-primary btn-success"
                                >
                                    🖨️ Imprimir Recibo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 🛑 RENDERIZAR EL COMPONENTE DE FACTURA OCULTO 🛑 */}
            {datosUltimaVenta && (
                <div style={{ display: "none" }}> 
                     <FacturaTicket 
                         ref={componentRef} 
                         ventaData={datosUltimaVenta}
                         empresaData={perfil.empresa}
                     />
                </div>
            )}
        </div>
    );
};

export default VentasPage;
