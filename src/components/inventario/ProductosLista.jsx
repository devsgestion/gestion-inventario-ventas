// src/components/inventario/ProductosLista.jsx

import React, { useState, useEffect } from 'react';
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
    const [editingPrice, setEditingPrice] = useState(''); // Nuevo: valor temporal del precio siendo editado
    const [mostrarSoloAlertas, setMostrarSoloAlertas] = useState(false);
    // 🛑 NUEVO ESTADO: Para controlar acciones de eliminar/toggle 🛑
    const [actionLoading, setActionLoading] = useState(false);
    
    // 🛑 NUEVOS ESTADOS: Para modales de confirmación 🛑
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditNameModal, setShowEditNameModal] = useState(false);
    const [productToAction, setProductToAction] = useState(null);

    // 🛑 NUEVOS ESTADOS: Para toast de éxito 🛑
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // 🛑 NUEVO ESTADO: Para el buscador 🛑
    const [searchTerm, setSearchTerm] = useState('');
    
    // 🛑 NUEVO ESTADO: Para edición de nombre 🛑
    const [editedName, setEditedName] = useState('');
    
    // 🛑 NUEVO ESTADO: Para menú contextual de acciones 🛑
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuOpenUpward, setMenuOpenUpward] = useState(false);
    
    // 🛑 NUEVO: Cerrar menú al hacer click fuera 🛑
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openMenuId && !event.target.closest('.c-productos-lista__menu-wrapper')) {
                setOpenMenuId(null);
                setMenuOpenUpward(false);
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [openMenuId]);

    // --- Lógica de Filtro MEJORADA ---
    const productosFiltrados = productos.filter(p => {
        // Filtro de alertas de stock
        const cumpleAlertas = mostrarSoloAlertas ? (p.stock_actual <= p.alerta_stock_min) : true;
        
        // 🛑 ARREGLO: Lógica de filtrado más estricta 🛑
        const cumpleEstado = mostrarInactivos ? true : (p.activo === true);
        
        // 🛑 NUEVO: Filtro de búsqueda por nombre o referencia 🛑
        const cumpleBusqueda = searchTerm === '' || 
            p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.codigo_referencia.toLowerCase().includes(searchTerm.toLowerCase());
        
        return cumpleAlertas && cumpleEstado && cumpleBusqueda;
    });
        
    const countTotal = productos.length;
    const countAlertas = productosBajoStock.length;

    // 🛑 FUNCIÓN CRÍTICA: Actualización de precio en línea (mantenemos la lógica) 🛑
    const handlePriceUpdate = async (productId, newPriceString) => {
        // Limpiar el formato (eliminar puntos) para obtener el número real
        const cleanPrice = newPriceString.replace(/\./g, '');
        const newPrice = parseFloat(cleanPrice);

        if (isNaN(newPrice) || newPrice <= 0) {
            alert("Introduce un precio de venta válido.");
            setEditingId(null);
            setEditingPrice('');
            return;
        }

        setEditingId(null);
        setEditingPrice('');

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
    
    // 🛑 NUEVA FUNCIÓN: Formatear precio mientras se escribe 🛑
    const handlePriceChange = (value) => {
        // Permitir solo números
        const numbersOnly = value.replace(/\D/g, '');
        
        if (numbersOnly === '') {
            setEditingPrice('');
            return;
        }
        
        // Formatear con separadores de miles
        const formatted = parseInt(numbersOnly).toLocaleString('es-CO');
        setEditingPrice(formatted);
    };
    
    // 🛑 NUEVA FUNCIÓN: Iniciar edición de precio 🛑
    const startPriceEdit = (productId, currentPrice) => {
        setEditingId(productId);
        // Formatear el precio actual con separadores
        setEditingPrice(currentPrice.toLocaleString('es-CO'));
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

    // 🛑 NUEVA FUNCIÓN: Editar nombre de producto 🛑
    const handleEditName = (producto) => {
        setProductToAction(producto);
        setEditedName(producto.nombre);
        setShowEditNameModal(true);
    };

    const saveProductName = async () => {
        const nombreTrimmed = editedName.trim();
        
        // Validaciones
        if (!nombreTrimmed) {
            alert('❌ El nombre no puede estar vacío');
            return;
        }
        
        if (nombreTrimmed === productToAction.nombre) {
            setShowEditNameModal(false);
            setProductToAction(null);
            return;
        }
        
        // Verificar si ya existe otro producto con ese nombre
        const existeNombre = productos.some(
            p => p.nombre.toLowerCase() === nombreTrimmed.toLowerCase() && p.id !== productToAction.id
        );
        
        if (existeNombre) {
            alert('❌ Ya existe otro producto con ese nombre. Usa un nombre diferente.');
            return;
        }
        
        setActionLoading(true);
        
        const { error } = await supabase
            .from('productos')
            .update({ nombre: nombreTrimmed })
            .eq('id', productToAction.id);

        if (error) {
            alert(`Error al actualizar el nombre: ${error.message}`);
        } else {
            fetchProductos();
            setSuccessMessage('Nombre actualizado correctamente');
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        }
        
        setActionLoading(false);
        setShowEditNameModal(false);
        setProductToAction(null);
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
            
            {/* 🛑 NUEVO: Buscador de productos 🛑 */}
            <div className="c-productos-lista__search-container c-inventario__search-bar">
                <input
                    type="text"
                    placeholder="🔍 Buscar por nombre o referencia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="c-productos-lista__search-input"
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="c-productos-lista__search-clear"
                        title="Limpiar búsqueda"
                    >
                        ✕
                    </button>
                )}
            </div>
            
            <div className="c-productos-lista__filters-info">
                <p className="c-form-message c-form-message--help">
                    Mostrando {productosFiltrados.length} de {countTotal} referencias
                    {searchTerm && (
                        <span style={{ color: 'var(--color-brand)', fontWeight: 'bold' }}>
                            {' '}(búsqueda: "{searchTerm}")
                        </span>
                    )}
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
                            <th className="c-productos-table__header" style={{minWidth: 80, textAlign: 'center'}}>Acciones</th>
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
                                <td className={`c-productos-table__cell${p.stock_actual <= p.alerta_stock_min && p.stock_actual >= 0 ? ' c-productos-lista__stock-alert' : ''}${p.stock_actual < 0 ? ' c-productos-lista__stock-negative' : ''}`}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>{p.stock_actual}</span>
                                        {p.stock_actual < 0 && (
                                            <span className="c-productos-lista__negative-badge">pendiente</span>
                                        )}
                                    </div>
                                </td>
                                <td className="c-productos-table__cell" onClick={() => startPriceEdit(p.id, p.precio_venta)}>
                                    {editingId === p.id ? (
                                        <input 
                                            type="text"
                                            value={editingPrice}
                                            onChange={(e) => handlePriceChange(e.target.value)}
                                            onBlur={(e) => handlePriceUpdate(p.id, e.target.value)}
                                            onKeyDown={(e) => { 
                                                if (e.key === 'Enter') e.target.blur();
                                                if (e.key === 'Escape') {
                                                    setEditingId(null);
                                                    setEditingPrice('');
                                                }
                                            }}
                                            className="c-productos-lista__inline-edit"
                                            placeholder="Ej: 50.000"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="c-productos-lista__price-cell" title="Click para editar precio">
                                            {formatCurrencyCOP(p.precio_venta)}
                                        </span>
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
                                        {/* Botón de menú contextual */}
                                        <div className="c-productos-lista__menu-wrapper">
                                            <button 
                                                onClick={(e) => {
                                                    const newMenuId = openMenuId === p.id ? null : p.id;
                                                    
                                                    // Si vamos a abrir el menú, decidir el modo (dropdown o modal)
                                                    if (newMenuId) {
                                                        const button = e.currentTarget;
                                                        const rect = button.getBoundingClientRect();
                                                        const viewportHeight = window.innerHeight;
                                                        const spaceBelow = viewportHeight - rect.bottom;
                                                        const menuHeight = 280;
                                                        
                                                        // Si no hay suficiente espacio, abrir como modal centrado
                                                        if (spaceBelow < menuHeight) {
                                                            setMenuOpenUpward(true);
                                                        } else {
                                                            setMenuOpenUpward(false);
                                                        }
                                                    } else {
                                                        setMenuOpenUpward(false);
                                                    }
                                                    
                                                    setOpenMenuId(newMenuId);
                                                }}
                                                className="c-productos-lista__menu-btn"
                                                disabled={actionLoading}
                                                title="Acciones"
                                            >
                                                ⋮
                                            </button>
                                            
                                            {/* Menú desplegable o modal */}
                                            {openMenuId === p.id && (
                                                <>
                                                    {/* Overlay oscuro cuando es modal */}
                                                    {menuOpenUpward && <div className="c-productos-lista__modal-overlay" onClick={() => setOpenMenuId(null)}></div>}
                                                    
                                                    <div className={`c-productos-lista__dropdown-menu ${menuOpenUpward ? 'c-productos-lista__dropdown-menu--modal' : ''}`}>
                                                        {p.activo !== false && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        handleEditName(p);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="c-productos-lista__menu-item c-productos-lista__menu-item--edit"
                                                                    disabled={actionLoading}
                                                                >
                                                                    <span className="c-productos-lista__menu-icon">✏️</span>
                                                                    <span>Editar Nombre</span>
                                                                </button>
                                                                
                                                                <button
                                                                    onClick={() => {
                                                                        onRegisterStock(p);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="c-productos-lista__menu-item c-productos-lista__menu-item--buy"
                                                                    disabled={actionLoading}
                                                                >
                                                                    <span className="c-productos-lista__menu-icon">🛒</span>
                                                                    <span>Registrar Compra</span>
                                                                </button>
                                                                
                                                                <button
                                                                    onClick={() => {
                                                                        setProductoSeleccionado(p);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="c-productos-lista__menu-item c-productos-lista__menu-item--adjust"
                                                                    disabled={actionLoading}
                                                                >
                                                                    <span className="c-productos-lista__menu-icon">⚙️</span>
                                                                    <span>Ajustar Stock</span>
                                                                </button>
                                                                
                                                                <div className="c-productos-lista__menu-divider"></div>
                                                            </>
                                                        )}
                                                        
                                                        <button
                                                            onClick={() => {
                                                                handleToggleProducto(p);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className={`c-productos-lista__menu-item ${p.activo !== false ? 'c-productos-lista__menu-item--deactivate' : 'c-productos-lista__menu-item--activate'}`}
                                                            disabled={actionLoading}
                                                        >
                                                            <span className="c-productos-lista__menu-icon">
                                                                {p.activo !== false ? '⏸' : '▶'}
                                                            </span>
                                                            <span>{p.activo !== false ? 'Desactivar' : 'Activar'}</span>
                                                        </button>
                                                        
                                                        {p.activo === false && (
                                                            <>
                                                                <div className="c-productos-lista__menu-divider"></div>
                                                                <button
                                                                    onClick={() => {
                                                                        handleDeleteProducto(p);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="c-productos-lista__menu-item c-productos-lista__menu-item--delete"
                                                                    disabled={actionLoading}
                                                                >
                                                                    <span className="c-productos-lista__menu-icon">🗑</span>
                                                                    <span>Eliminar Permanente</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
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

            {/* 🛑 NUEVO MODAL: Editar nombre de producto 🛑 */}
            {showEditNameModal && productToAction && (
                <div className="c-modal-overlay">
                    <div className="c-modal-content c-modal-content--edit-name">
                        <div className="c-modal-header">
                            <h3 className="c-modal-title">✏️ Editar Nombre del Producto</h3>
                            <button 
                                onClick={() => setShowEditNameModal(false)}
                                className="c-modal-close-btn"
                                disabled={actionLoading}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="c-modal-body">
                            <div className="c-simple-product-card">
                                <p><strong>Referencia:</strong> {productToAction.codigo_referencia}</p>
                                <p><strong>Stock:</strong> {productToAction.stock_actual} unidades</p>
                            </div>
                            
                            <div className="c-form-group">
                                <label className="c-form-label">
                                    <strong>Nombre del Producto</strong>
                                </label>
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="c-productos-lista__name-input"
                                    placeholder="Ingresa el nuevo nombre"
                                    autoFocus
                                    disabled={actionLoading}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveProductName();
                                        if (e.key === 'Escape') setShowEditNameModal(false);
                                    }}
                                />
                                <small className="c-form-message c-form-message--help">
                                    El nombre aparecerá en el punto de venta y reportes
                                </small>
                            </div>
                            
                            {editedName.trim() && editedName.trim() !== productToAction.nombre && (
                                <div className="c-simple-suggestion">
                                    💡 Nuevo nombre: <strong>"{editedName.trim()}"</strong>
                                </div>
                            )}
                        </div>
                        
                        <div className="c-modal-footer">
                            <button 
                                onClick={() => setShowEditNameModal(false)}
                                className="btn btn-secondary"
                                disabled={actionLoading}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={saveProductName}
                                className="btn btn-primary"
                                disabled={actionLoading || !editedName.trim()}
                            >
                                {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductosLista;