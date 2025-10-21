// src/components/inventario/ProductosLista.jsx

import React, { useState } from 'react';
import useInventario from '../../hooks/useInventario';
import AjusteStockModal from './AjusteStockModal';
import { formatCurrencyCOP } from '../../utils/formatters';
import { supabase } from '../../api/supabaseClient'; 
import '../../styles/inventario.css';
import './ProductosLista.css';

const ProductosLista = ({ empresaId, refreshKey = 0, onProductAdjusted, onRegisterStock, mostrarInactivos = false }) => {
    const { productos, loading, error, fetchProductos, productosBajoStock } = useInventario(empresaId, refreshKey);

    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [mostrarSoloAlertas, setMostrarSoloAlertas] = useState(false);
    // 🛑 NUEVO ESTADO: Para controlar acciones de eliminar/toggle 🛑
    const [actionLoading, setActionLoading] = useState(false);
    
    // 🛑 NUEVOS ESTADOS: Para modales de confirmación 🛑
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productToAction, setProductToAction] = useState(null);

    // 🛑 NUEVOS ESTADOS: Para toast de éxito 🛑
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // --- Lógica de Filtro MEJORADA ---
    const productosFiltrados = productos.filter(p => {
        // Filtro de alertas de stock
        const cumpleAlertas = mostrarSoloAlertas ? (p.stock_actual <= p.alerta_stock_min) : true;
        
        // 🛑 ARREGLO: Lógica de filtrado más estricta 🛑
        const cumpleEstado = mostrarInactivos ? true : (p.activo === true);
        
        return cumpleAlertas && cumpleEstado;
    });
        
    const countTotal = productos.length;
    const countAlertas = productosBajoStock.length;

    // 🛑 FUNCIÓN CRÍTICA: Actualización de precio en línea (mantenemos la lógica) 🛑
    const handlePriceUpdate = async (productId, newPriceString) => {
        // ... (Tu lógica de handlePriceUpdate se mantiene aquí) ...
        const newPrice = parseFloat(newPriceString);

        if (isNaN(newPrice) || newPrice <= 0) {
            alert("Introduce un precio de venta válido.");
            setEditingId(null);
            return;
        }

        setEditingId(null); 

        const { error } = await supabase
            .from('productos')
            .update({ precio_venta: newPrice })
            .eq('id', productId); 

        if (error) {
            console.error("Error al actualizar precio:", error);
            alert("No se pudo actualizar el precio. Intenta de nuevo.");
        } else {
            fetchProductos(); 
        }
    };
    
    // Función para cerrar el modal y limpiar el estado
    const handleCloseModal = () => setProductoSeleccionado(null);

    // Función que se ejecuta después de ajustar el stock
    const handleStockAdjusted = () => {
        fetchProductos(); 
        if (onProductAdjusted) onProductAdjusted(); 
    };

    // 🛑 NUEVA FUNCIÓN: Toggle de estado activo/inactivo 🛑
    const handleToggleProducto = (producto) => {
        setProductToAction(producto);
        if (producto.activo !== false) {
            setShowDeactivateModal(true);
        } else {
            // Si está inactivo, activar directamente sin confirmación
            toggleProductoActivo(producto.id, producto.activo);
        }
    };

    const toggleProductoActivo = async (productoId, currentStatus) => {
        const newStatus = !currentStatus;
        
        setActionLoading(true);
        
        const { error } = await supabase
            .from('productos')
            .update({ activo: newStatus })
            .eq('id', productoId);

        if (error) {
            alert(`Error al cambiar el estado del producto: ${error.message}`);
        } else {
            fetchProductos();
            
            // 🛑 MOSTRAR TOAST DE ÉXITO EN LUGAR DE ALERT 🛑
            const mensaje = newStatus ? 
                'Producto activado correctamente' :
                'Producto desactivado correctamente';
            
            setSuccessMessage(mensaje);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        }
        setActionLoading(false);
        
        // Limpiar estados del modal
        setShowDeactivateModal(false);
        setProductToAction(null);
    };

    // 🛑 FUNCIÓN MEJORADA: Eliminar con modal de confirmación 🛑
    const handleDeleteProducto = (producto) => {
        setProductToAction(producto);
        setShowDeleteModal(true);
    };

    const deleteProducto = async (productoId) => {
        setActionLoading(true);
        
        const { error } = await supabase
            .from('productos')
            .delete()
            .eq('id', productoId);

        if (error) {
            alert(
                `❌ No se puede eliminar este producto.\n\n` +
                `Motivo: El producto tiene registros asociados (ventas, movimientos, etc.)\n\n` +
                `Solución: Use el botón "Desactivar" para ocultarlo del sistema sin perder el historial.\n\n` +
                `Error técnico: ${error.message}`
            );
        } else {
            fetchProductos();
            setSuccessMessage('Producto eliminado permanentemente');
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        }
        setActionLoading(false);
        
        // Limpiar estados del modal
        setShowDeleteModal(false);
        setProductToAction(null);
    };

    const AlertaStockMinimo = () => {
        if (countAlertas === 0) return null;
        return (
            <div className="c-alert c-alert--warning c-alert-stock-notification">
                <span className="u-mr-sm">⚠️</span>
                <span className="c-alert__message">
                    ¡ALERTA! Tienes <b>{countAlertas} {countAlertas === 1 ? 'producto' : 'productos'}</b> con Stock Mínimo. Reabastecimiento urgente.
                </span>
                <button 
                    onClick={() => setMostrarSoloAlertas(!mostrarSoloAlertas)}
                    className="btn c-alert__filter-btn"
                >
                    {mostrarSoloAlertas ? 'Ver Todo el Inventario' : `Ver Solo ${countAlertas} Alertas`}
                </button>
            </div>
        );
    };

    if (loading) return <p className="c-state-message c-card">Cargando inventario...</p>;
    if (error) return <p className="c-alert c-alert--error">Error: {error}</p>;
    if (countTotal === 0) {
        return <p className="c-state-message c-card">Aún no tienes productos en tu inventario. ¡Usa el formulario para ingresar el stock inicial!</p>;
    }

    return (
        <div className="c-productos-lista">
            <AlertaStockMinimo />
            
            <div className="c-productos-lista__filters-info">
                <p className="c-form-message c-form-message--help">
                    Mostrando {productosFiltrados.length} de {countTotal} referencias
                    {!mostrarInactivos && (
                        <span style={{ color: 'var(--color-text-medium)', fontStyle: 'italic' }}>
                            {' '} (solo activos)
                        </span>
                    )}
                </p>
                
                {!mostrarInactivos && productos.filter(p => p.activo === false).length > 0 && (
                    <span className="c-productos-lista__inactive-counter">
                        📋 {productos.filter(p => p.activo === false).length} productos inactivos ocultos
                    </span>
                )}
            </div>

            <div className="c-productos-lista__table-wrapper">
                <table className="c-productos-table">
                    <thead>
                        <tr>
                            <th className="c-productos-table__header">Ref.</th>
                            <th className="c-productos-table__header">Nombre</th>
                            <th className="c-productos-table__header">Stock Actual</th>
                            <th className="c-productos-table__header">Precio Venta</th>
                            <th className="c-productos-table__header">Costo (CPP)</th>
                            <th className="c-productos-table__header">Alerta Mín.</th>
                            <th className="c-productos-table__header">Estado</th>
                            <th className="c-productos-table__header" style={{minWidth: 280}}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productosFiltrados.map((p) => (
                            <tr 
                                key={p.id} 
                                className={`c-productos-table__row ${p.stock_actual <= p.alerta_stock_min ? 'c-productos-table__row--low-stock' : ''} ${p.activo === false ? 'c-productos-table__row--inactive' : ''}`}
                            >
                                <td className="c-productos-table__cell">{p.codigo_referencia}</td>
                                <td className="c-productos-table__cell c-productos-table__cell--name">
                                    {p.nombre}
                                    {p.activo === false && <span className="c-productos-lista__inactive-badge">Inactivo</span>}
                                </td>
                                <td className={`c-productos-table__cell${p.stock_actual <= p.alerta_stock_min ? ' c-productos-lista__stock-alert' : ''}`}>
                                    {p.stock_actual}
                                </td>
                                <td className="c-productos-table__cell" onClick={() => setEditingId(p.id)}>
                                    {editingId === p.id ? (
                                        <input 
                                            type="number"
                                            defaultValue={p.precio_venta}
                                            onBlur={(e) => handlePriceUpdate(p.id, e.target.value)}
                                            onKeyDown={(e) => { 
                                                if (e.key === 'Enter') e.target.blur();
                                            }}
                                            className="c-productos-lista__inline-edit"
                                            autoFocus
                                        />
                                    ) : (
                                        <>{formatCurrencyCOP(p.precio_venta)}</>
                                    )}
                                </td>
                                <td className="c-productos-table__cell">
                                    {formatCurrencyCOP(p.precio_costo)}
                                </td>
                                <td className="c-productos-table__cell">{p.alerta_stock_min}</td>
                                
                                <td className="c-productos-table__cell">
                                    <span className={`c-productos-lista__status-badge ${p.activo !== false ? 'c-productos-lista__status-badge--active' : 'c-productos-lista__status-badge--inactive'}`}>
                                        {p.activo !== false ? '✓' : '⏸'}
                                    </span>
                                </td>

                                <td className="c-productos-table__cell c-productos-table__cell--actions">
                                    <div className="c-productos-lista__actions">
                                        {p.activo !== false && (
                                            <>
                                                <button 
                                                    onClick={() => onRegisterStock(p)}
                                                    className="c-productos-lista__action-btn c-productos-lista__action-btn--comprar"
                                                    disabled={actionLoading}
                                                    title="Registrar compra"
                                                >
                                                    🛒
                                                </button>
                                                <button 
                                                    onClick={() => setProductoSeleccionado(p)}
                                                    className="c-productos-lista__action-btn c-productos-lista__action-btn--ajustar"
                                                    disabled={actionLoading}
                                                    title="Ajustar stock"
                                                >
                                                    ⚙️
                                                </button>
                                            </>
                                        )}
                                        
                                        <button 
                                            onClick={() => handleToggleProducto(p)}
                                            className={`c-productos-lista__action-btn ${p.activo !== false ? 'c-productos-lista__action-btn--toggle' : 'c-productos-lista__action-btn--toggle-active'}`}
                                            disabled={actionLoading}
                                            title={p.activo !== false ? 'Desactivar producto' : 'Activar producto'}
                                        >
                                            {p.activo !== false ? '⏸' : '▶'}
                                        </button>
                                        
                                        {p.activo === false && (
                                            <button 
                                                onClick={() => handleDeleteProducto(p)}
                                                className="c-productos-lista__action-btn c-productos-lista__action-btn--delete"
                                                disabled={actionLoading}
                                                title="Eliminar permanentemente"
                                            >
                                                🗑
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {productoSeleccionado && (
                <AjusteStockModal 
                    producto={productoSeleccionado}
                    onClose={handleCloseModal}
                    onStockAdjusted={handleStockAdjusted}
                />
            )}

            {/* 🛑 MODAL SIMPLE: Sin Framer Motion, directo y eficiente 🛑 */}
            {showDeactivateModal && productToAction && (
                <div className="c-modal-overlay">
                    <div className="c-modal-content c-modal-content--confirm-action">
                        <div className="c-modal-header">
                            <h3 className="c-modal-title">⏸️ Desactivar Producto</h3>
                            <button 
                                onClick={() => setShowDeactivateModal(false)}
                                className="c-modal-close-btn"
                                disabled={actionLoading}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="c-modal-body">
                            <div className="c-simple-product-card">
                                <h4>{productToAction.nombre}</h4>
                                <p><strong>Referencia:</strong> {productToAction.codigo_referencia}</p>
                                <p><strong>Stock:</strong> {productToAction.stock_actual} unidades</p>
                            </div>
                            
                            <div className="c-simple-message">
                                El producto se ocultará del punto de venta pero se conservará todo su historial.
                            </div>
                            
                            <div className="c-simple-warning">
                                ⚠️ No aparecerá en nuevas ventas
                            </div>
                            
                            <div className="c-simple-suggestion">
                                ✅ Podrás reactivarlo cuando quieras
                            </div>
                        </div>
                        
                        <div className="c-modal-footer">
                            <button 
                                onClick={() => setShowDeactivateModal(false)}
                                className="btn btn-secondary"
                                disabled={actionLoading}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => toggleProductoActivo(productToAction.id, productToAction.activo)}
                                className="btn btn-warning"
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Desactivando...' : 'Sí, Desactivar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🛑 MODAL SIMPLE PARA ELIMINAR 🛑 */}
            {showDeleteModal && productToAction && (
                <div className="c-modal-overlay">
                    <div className="c-modal-content c-modal-content--confirm-action c-modal-content--danger">
                        <div className="c-modal-header">
                            <h3 className="c-modal-title">🗑️ Eliminar Producto</h3>
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                className="c-modal-close-btn"
                                disabled={actionLoading}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="c-modal-body">
                            <div className="c-simple-product-card c-simple-product-card--danger">
                                <h4>{productToAction.nombre}</h4>
                                <p><strong>Referencia:</strong> {productToAction.codigo_referencia}</p>
                                <p><strong>Stock:</strong> {productToAction.stock_actual} unidades</p>
                            </div>
                            
                            <div className="c-simple-message c-simple-message--danger">
                                ⚠️ <strong>¡ATENCIÓN!</strong><br/>
                                Esta acción eliminará permanentemente el producto y toda su información.
                            </div>
                            
                            <div className="c-simple-suggestion">
                                💡 <strong>¿Mejor desactivarlo?</strong><br/>
                                Desactivar es más seguro y preserva el historial.
                            </div>
                            
                            <div className="c-simple-warning">
                                Esta acción NO se puede deshacer
                            </div>
                        </div>
                        
                        <div className="c-modal-footer">
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                className="btn btn-secondary"
                                disabled={actionLoading}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => deleteProducto(productToAction.id)}
                                className="btn btn-danger"
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Eliminando...' : 'Eliminar Permanentemente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast simple */}
            {showSuccessToast && (
                <div className="c-toast-simple c-toast-simple--success">
                    <span>✅ {successMessage}</span>
                </div>
            )}
        </div>
    );
};

export default ProductosLista;