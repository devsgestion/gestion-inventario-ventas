// src/components/cambios/ProcesarCambioModal.jsx
// Modal simplificado para procesar cambios y devoluciones
// Diseño: Split View (Izquierda: Devolución, Derecha: Nuevos)

import React, { useState, useEffect } from 'react';
import useCambiosDevoluciones from '../../hooks/useCambiosDevoluciones';
import useInventario from '../../hooks/useInventario';
import { formatCurrency } from '../../utils/formatters';
import '../../styles/CambiosDevoluciones.css';

const STEPS = {
    SELECT_SALE: 1,
    EXCHANGE: 2
};

const COMMON_REASONS = [
    "Talla incorrecta",
    "No le gustó",
    "Defecto",
    "Cambio de color",
    "Error cobro"
];

const ProcesarCambioModal = ({ empresaId, usuarioId, onClose, onCambioCompletado }) => {
    const { 
        buscarVentas, 
        obtenerProductosVenta, 
        procesarCambio 
    } = useCambiosDevoluciones(empresaId);
    
    const { productos: allProducts } = useInventario(empresaId);

    // Estado Global
    const [currentStep, setCurrentStep] = useState(STEPS.SELECT_SALE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Estado Paso 1: Buscar Venta
    const [saleSearchTerm, setSaleSearchTerm] = useState('');
    const [foundSales, setFoundSales] = useState([]);
    const [selectedSale, setSelectedSale] = useState(null);

    // Estado Paso 2: Intercambio
    const [saleItems, setSaleItems] = useState([]); // Productos de la venta original
    const [returnItems, setReturnItems] = useState({}); // { id_detalle: { ...item, cantidad_devolver } }
    
    const [newProductSearch, setNewProductSearch] = useState('');
    const [newItems, setNewItems] = useState({}); // { id_producto: { ...producto, cantidad_llevar } }
    
    const [motivo, setMotivo] = useState('');

    // --- LÓGICA PASO 1: BUSCAR VENTA ---

    const handleSearchSales = async (termOrEvent) => {
        // Si es string (viene del effect), usarlo. Si es evento o undefined, usar estado.
        const term = typeof termOrEvent === 'string' ? termOrEvent : saleSearchTerm;
        
        setLoading(true);
        const sales = await buscarVentas(term);
        setFoundSales(sales);
        setLoading(false);
    };

    // Búsqueda en tiempo real (Debounce)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            handleSearchSales(saleSearchTerm);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [saleSearchTerm]);

    const handleSelectSale = async (sale) => {
        setLoading(true);
        setSelectedSale(sale);
        try {
            const items = await obtenerProductosVenta(sale.id);
            setSaleItems(items);
            setCurrentStep(STEPS.EXCHANGE);
        } catch (err) {
            setError('Error al cargar los productos de la venta');
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA PASO 2: INTERCAMBIO ---

    // Manejar selección de productos a devolver
    const handleToggleReturnItem = (item, quantity) => {
        const currentQty = parseInt(quantity) || 0;
        
        if (currentQty <= 0) {
            const newReturnItems = { ...returnItems };
            delete newReturnItems[item.id];
            setReturnItems(newReturnItems);
            return;
        }

        if (currentQty > item.cantidad) return; // No permitir devolver más de lo comprado

        // 🧠 LÓGICA INTELIGENTE: Si es el primer item que seleccionamos para devolver,
        // asumimos que probablemente quiera cambiarlo por algo similar.
        // Pre-llenamos el buscador de "Nuevos" con el nombre del producto.
        if (Object.keys(returnItems).length === 0 && !newProductSearch) {
            setNewProductSearch(item.producto?.nombre || '');
        }

        setReturnItems(prev => ({
            ...prev,
            [item.id]: {
                producto_id: item.producto_id,
                nombre: item.producto?.nombre,
                precio_unitario: item.precio_unitario,
                cantidad: currentQty,
                original_item: item
            }
        }));
    };

    // ⚡ LÓGICA RÁPIDA: Devolver todo el contenido de la venta
    const handleReturnAll = () => {
        const allItems = {};
        saleItems.forEach(item => {
            allItems[item.id] = {
                producto_id: item.producto_id,
                nombre: item.producto?.nombre,
                precio_unitario: item.precio_unitario,
                cantidad: item.cantidad,
                original_item: item
            };
        });
        setReturnItems(allItems);
        
        // Activar búsqueda inteligente con el primer producto
        if (saleItems.length > 0 && !newProductSearch) {
             setNewProductSearch(saleItems[0].producto?.nombre || '');
        }
    };

    // 🛑 NUEVO: Helpers para botones +/- en tablet
    const incrementReturnItem = (item) => {
        const currentQty = returnItems[item.id]?.cantidad || 0;
        handleToggleReturnItem(item, currentQty + 1);
    };

    const decrementReturnItem = (item) => {
        const currentQty = returnItems[item.id]?.cantidad || 0;
        handleToggleReturnItem(item, currentQty - 1);
    };

    // Manejar adición de productos nuevos
    const handleAddNewItem = (product) => {
        setNewItems(prev => {
            const current = prev[product.id];
            const newQty = current ? current.cantidad + 1 : 1;
            
            if (newQty > product.stock_actual) return prev; // No exceder stock

            return {
                ...prev,
                [product.id]: {
                    producto_id: product.id,
                    nombre: product.nombre,
                    precio_unitario: product.precio_venta,
                    cantidad: newQty,
                    stock_max: product.stock_actual
                }
            };
        });
        setNewProductSearch(''); // Limpiar búsqueda
    };

    const handleUpdateNewItemQty = (productId, qty) => {
        const quantity = parseInt(qty) || 0;
        
        if (quantity <= 0) {
            const updated = { ...newItems };
            delete updated[productId];
            setNewItems(updated);
            return;
        }

        setNewItems(prev => {
            const item = prev[productId];
            if (quantity > item.stock_max) return prev;

            return {
                ...prev,
                [productId]: { ...item, cantidad: quantity }
            };
        });
    };

    // 🛑 NUEVO: Helpers para botones +/- en tablet
    const incrementNewItem = (item) => {
        handleUpdateNewItemQty(item.producto_id, item.cantidad + 1);
    };

    const decrementNewItem = (item) => {
        handleUpdateNewItemQty(item.producto_id, item.cantidad - 1);
    };

    // Cálculos de Totales
    const calculateTotals = () => {
        const totalReturn = Object.values(returnItems).reduce((sum, item) => 
            sum + (item.cantidad * item.precio_unitario), 0);
        
        const totalNew = Object.values(newItems).reduce((sum, item) => 
            sum + (item.cantidad * item.precio_unitario), 0);
            
        return {
            totalReturn,
            totalNew,
            difference: totalNew - totalReturn
        };
    };

    const { totalReturn, totalNew, difference } = calculateTotals();

    // Confirmar Transacción
    const handleConfirm = async () => {
        if (Object.keys(returnItems).length === 0) {
            setError('Selecciona al menos un producto para devolver');
            return;
        }
        if (!motivo.trim()) {
            setError('Debes ingresar un motivo para el cambio');
            return;
        }

        setLoading(true);
        setError(null);

        const result = await procesarCambio({
            ventaOriginalId: selectedSale.id,
            productosDevueltos: Object.values(returnItems),
            productosNuevos: Object.values(newItems),
            valorDevolucion: totalReturn,
            valorNuevos: totalNew,
            diferencia: difference,
            motivo,
            usuarioId
        });

        setLoading(false);

        if (result.success) {
            onCambioCompletado();
        } else {
            setError(result.error || 'Error al procesar el cambio');
        }
    };

    // Filtrado de productos nuevos para el buscador
    const filteredNewProducts = newProductSearch.length > 1 
        ? allProducts.filter(p => 
            p.nombre.toLowerCase().includes(newProductSearch.toLowerCase()) && 
            p.stock_actual > 0
          ).slice(0, 5)
        : [];

    return (
        <div className="cd-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="cd-modal-content">
                
                {/* HEADER */}
                <div className="cd-modal-header">
                    <div>
                        <h2 className="cd-modal-title">🔄 Procesar Cambio / Devolución</h2>
                        <p className="cd-subtitle">
                            {currentStep === STEPS.SELECT_SALE 
                                ? 'Paso 1: Busca el producto que el cliente quiere devolver o cambiar.' 
                                : `Paso 2: Gestionar cambio para Venta #${selectedSale?.numero_venta || '???'}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="cd-close-btn">×</button>
                </div>

                <div className="cd-modal-body">
                    {error && (
                        <div className="alert alert-error" style={{marginBottom: '1rem'}}>
                            {error}
                        </div>
                    )}

                    {/* --- PASO 1: SELECCIONAR VENTA --- */}
                    {currentStep === STEPS.SELECT_SALE && (
                        <div className="cd-step1-container">
                            <div className="cd-search-box">
                                <input 
                                    type="text"
                                    placeholder="🔍 Buscar por producto (ej: Camisa) o número de ticket..."
                                    value={saleSearchTerm}
                                    onChange={(e) => setSaleSearchTerm(e.target.value)}
                                    className="cd-search-input"
                                    autoFocus
                                />
                                <button 
                                    onClick={handleSearchSales} 
                                    className="cd-search-button"
                                    disabled={loading}
                                >
                                    {loading ? '...' : 'Buscar'}
                                </button>
                            </div>

                            <div className="cd-sales-list">
                                <h4 style={{marginBottom: '1rem', color: 'var(--color-text-medium)'}}>
                                    {saleSearchTerm ? 'Resultados de búsqueda' : 'Ventas Recientes'}
                                </h4>
                                {loading ? (
                                    <p>Cargando ventas...</p>
                                ) : foundSales.length === 0 ? (
                                    <p>No se encontraron ventas.</p>
                                ) : (
                                    <div className="cd-sales-grid">
                                        {foundSales.map(sale => (
                                            <div 
                                                key={sale.id}
                                                onClick={() => handleSelectSale(sale)}
                                                className="cd-sale-card"
                                            >
                                                <div className="cd-sale-card-header">
                                                    <span className="cd-sale-number">#{sale.numero_venta || sale.id.substring(0,8)}</span>
                                                    <span className="cd-sale-date">
                                                        {new Date(sale.fecha_venta).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="cd-sale-total">
                                                    {formatCurrency(sale.total_venta)}
                                                </div>
                                                {sale.producto_encontrado && (
                                                    <div className="cd-sale-match">
                                                        Contiene: {sale.producto_encontrado}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- PASO 2: INTERCAMBIO (SPLIT VIEW) --- */}
                    {currentStep === STEPS.EXCHANGE && (
                        <div className="cd-split-view">
                            
                            {/* COLUMNA IZQUIERDA: DEVOLUCIÓN */}
                            <div className="cd-col cd-col-left">
                                <div className="cd-col-header">
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <h3 className="cd-col-title return">⬇️ Devolver Productos</h3>
                                        <button onClick={handleReturnAll} className="cd-btn-text">
                                            Devolver Todo
                                        </button>
                                    </div>
                                    <p style={{fontSize: '0.85rem', color: 'var(--color-text-medium)', margin: 0}}>
                                        Selecciona qué productos trajo el cliente
                                    </p>
                                </div>
                                <div className="cd-product-list">
                                    {saleItems.map(item => {
                                        const isSelected = !!returnItems[item.id];
                                        const qty = returnItems[item.id]?.cantidad || 0;

                                        return (
                                            <div key={item.id} className={`cd-product-card return-item ${isSelected ? 'selected' : ''}`}>
                                                <div className="cd-product-info">
                                                    <h4>{item.producto?.nombre}</h4>
                                                    <p>Compró: {item.cantidad} x {formatCurrency(item.precio_unitario)}</p>
                                                </div>
                                                <div className="cd-qty-control">
                                                    {isSelected ? (
                                                        <>
                                                            <button 
                                                                onClick={() => decrementReturnItem(item)}
                                                                className="cd-qty-btn"
                                                            >
                                                                -
                                                            </button>
                                                            <span className="cd-qty-display">{qty}</span>
                                                            <button 
                                                                onClick={() => incrementReturnItem(item)}
                                                                className="cd-qty-btn"
                                                                disabled={qty >= item.cantidad}
                                                            >
                                                                +
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleToggleReturnItem(item, 1)}
                                                            className="cd-btn-action"
                                                        >
                                                            Devolver
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="cd-col-footer">
                                    Total Devolución: <strong style={{color: 'var(--color-danger)'}}>{formatCurrency(totalReturn)}</strong>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: NUEVOS */}
                            <div className="cd-col cd-col-right">
                                <div className="cd-col-header">
                                    <h3 className="cd-col-title new">⬆️ Llevar Productos Nuevos</h3>
                                    <div className="cd-product-search-wrapper">
                                        <input 
                                            type="text" 
                                            placeholder="Buscar producto para agregar..." 
                                            value={newProductSearch}
                                            onChange={(e) => setNewProductSearch(e.target.value)}
                                            className="cd-product-search-input"
                                        />
                                        {filteredNewProducts.length > 0 && (
                                            <div className="cd-search-results">
                                                {filteredNewProducts.map(p => (
                                                    <div 
                                                        key={p.id}
                                                        onClick={() => handleAddNewItem(p)}
                                                        className="cd-search-result-item"
                                                    >
                                                        <span>{p.nombre}</span>
                                                        <strong>{formatCurrency(p.precio_venta)}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="cd-product-list">
                                    {Object.values(newItems).length === 0 ? (
                                        <p style={{textAlign: 'center', color: 'var(--color-text-medium)', marginTop: '2rem'}}>
                                            No hay productos nuevos seleccionados
                                        </p>
                                    ) : (
                                        Object.values(newItems).map(item => (
                                            <div key={item.producto_id} className="cd-product-card new-item">
                                                <div className="cd-product-info">
                                                    <h4>{item.nombre}</h4>
                                                    <p>{formatCurrency(item.precio_unitario)}</p>
                                                </div>
                                                <div className="cd-qty-control">
                                                    <button 
                                                        onClick={() => decrementNewItem(item)}
                                                        className="cd-qty-btn"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="cd-qty-display">{item.cantidad}</span>
                                                    <button 
                                                        onClick={() => incrementNewItem(item)}
                                                        className="cd-qty-btn"
                                                        disabled={item.cantidad >= item.stock_max}
                                                    >
                                                        +
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateNewItemQty(item.producto_id, 0)}
                                                        className="cd-qty-btn-delete"
                                                        title="Eliminar"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="cd-col-footer">
                                    Total Nuevos: <strong style={{color: 'var(--color-success)'}}>{formatCurrency(totalNew)}</strong>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="cd-modal-footer">
                    {currentStep === STEPS.EXCHANGE ? (
                        <>
                            <div className="cd-footer-left">
                                <button onClick={() => setCurrentStep(STEPS.SELECT_SALE)} className="cd-btn cd-btn--secondary">
                                    ← Cambiar Venta
                                </button>
                            </div>
                            
                            <div className="cd-footer-center">
                                <div className="cd-diff-pill">
                                    <span className="cd-diff-label">Diferencia:</span>
                                    <span className={`cd-diff-value ${difference > 0 ? 'cd-diferencia--positiva' : difference < 0 ? 'cd-diferencia--negativa' : 'cd-diferencia--cero'}`}>
                                        {difference > 0 ? `Cliente Paga: ${formatCurrency(difference)}` : 
                                         difference < 0 ? `Devolver: ${formatCurrency(Math.abs(difference))}` : 
                                         'Sin diferencia'}
                                    </span>
                                </div>
                                
                                <div className="cd-reasons-wrapper">
                                    <div className="cd-reasons-chips">
                                        {COMMON_REASONS.map(r => (
                                            <button 
                                                key={r} 
                                                onClick={() => setMotivo(r)}
                                                className={`cd-reason-chip ${motivo === r ? 'active' : ''}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="O escribe el motivo..." 
                                        value={motivo}
                                        onChange={(e) => setMotivo(e.target.value)}
                                        className="cd-reason-input"
                                    />
                                </div>
                            </div>

                            <div className="cd-footer-right">
                                <button 
                                    onClick={handleConfirm} 
                                    disabled={loading}
                                    className="cd-btn cd-btn--primary"
                                >
                                    {loading ? 'Procesando...' : '✅ Confirmar Cambio'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="cd-footer-left"></div>
                            <div className="cd-footer-center"></div>
                            <div className="cd-footer-right">
                                <button onClick={onClose} className="cd-btn cd-btn--secondary">Cancelar</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProcesarCambioModal;