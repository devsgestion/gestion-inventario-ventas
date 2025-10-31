// src/components/ventas/CarritoDeVentas.jsx (FINAL CON EDICIÓN DE PRECIO)

import React, { useState } from 'react';
import { formatCurrencyCOP } from '../../utils/formatters';
import '../../styles/ventas.css';

// 🛑 NOTA: Asumimos que el componente padre (VentasPage) pasa la prop onUpdatePrice 🛑
const CarritoDeVentas = ({ carrito, onUpdateCart, onUpdatePrice, isCajaAbierta }) => { 
    const [editingItemId, setEditingItemId] = useState(null);
    const [editingQuantity, setEditingQuantity] = useState({}); // Estado local para edición de cantidades
    const [editingPrice, setEditingPrice] = useState(''); // Estado para el precio siendo editado con formato

    // Calcular el total
    const subtotal = carrito.reduce((acc, item) => acc + (Number(item.precio_venta) * item.cantidad), 0);
    const total = subtotal;
    
    // 🛑 NUEVO: Detectar productos con stock insuficiente 🛑
    const productosConDeficit = carrito.filter(item => item.cantidad > item.stock_actual); 

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
    const startPriceEdit = (cartItemId, currentPrice) => {
        setEditingItemId(cartItemId);
        // Formatear el precio actual con separadores
        setEditingPrice(currentPrice.toLocaleString('es-CO'));
    };

    // 🛑 HANDLER PARA GUARDAR EL PRECIO MODIFICADO 🛑
    const handlePriceInputBlur = (cartItemId, value) => {
        // Limpiar el formato (eliminar puntos) para obtener el número real
        const cleanPrice = value.replace(/\./g, '');
        onUpdatePrice(cartItemId, cleanPrice);
        setEditingItemId(null);
        setEditingPrice('');
    };

    return (
        <div className="c-cart c-ventas__carrito">
            <h4 className="c-cart__title">Detalle de la Venta ({carrito.length} ítems)</h4>
            
            {/* 🛑 NUEVA ALERTA: Advertencia de stock insuficiente 🛑 */}
            {productosConDeficit.length > 0 && (
                <div className="c-cart__stock-warning">
                    <div className="c-cart__warning-header">
                        <span className="c-cart__warning-icon">⚠️</span>
                        <strong>Stock Insuficiente ({productosConDeficit.length} {productosConDeficit.length === 1 ? 'producto' : 'productos'})</strong>
                    </div>
                    <div className="c-cart__warning-items">
                        {productosConDeficit.map(item => (
                            <div key={item.cartItemId} className="c-cart__warning-item">
                                <span className="c-cart__warning-product">{item.nombre}</span>
                                <span className="c-cart__warning-details">
                                    Vendiendo: <strong>{item.cantidad}</strong> | 
                                    Disponible: <strong>{item.stock_actual}</strong> | 
                                    Faltante: <strong className="c-cart__deficit">-{item.cantidad - item.stock_actual}</strong>
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="c-cart__warning-note">
                        💡 La venta se procesará normalmente, pero el stock quedará negativo y deberás reabastecer.
                    </p>
                </div>
            )}
            
            <div className="c-cart__items">
                {carrito.length === 0 && <p className="empty-state">Carrito vacío. Agrega productos de la lista.</p>}
                
                {carrito.map(item => {
                    const tieneDeficit = item.cantidad > item.stock_actual;
                    const deficit = item.cantidad - item.stock_actual;
                    
                    return (
                    // 🛑 Clave única por línea de ítem 🛑
                    <div 
                        key={item.cartItemId} 
                        className={`c-cart__item ${tieneDeficit ? 'c-cart__item--deficit' : ''}`}
                    > 
                        <div className="c-cart__item-info">
                            <strong>{item.nombre}</strong>
                            
                            {/* CELDA DE PRECIO EDITABLE */}
                            {editingItemId === item.cartItemId ? (
                                <input
                                    type="text"
                                    value={editingPrice}
                                    onChange={(e) => handlePriceChange(e.target.value)}
                                    onBlur={(e) => handlePriceInputBlur(item.cartItemId, e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.target.blur();
                                        if (e.key === 'Escape') {
                                            setEditingItemId(null);
                                            setEditingPrice('');
                                        }
                                    }}
                                    autoFocus
                                    className="form-input c-cart__price-input"
                                    disabled={!isCajaAbierta}
                                    placeholder="Ej: 50.000"
                                />
                            ) : (
                                <p 
                                    className="form-help c-cart__price-display"
                                    // 🛑 Activar edición al hacer click 🛑
                                    onClick={isCajaAbierta ? () => startPriceEdit(item.cartItemId, item.precio_venta) : null}
                                    style={{ 
                                        cursor: isCajaAbierta ? 'pointer' : 'default',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (isCajaAbierta) {
                                            e.currentTarget.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
                                            e.currentTarget.style.padding = '4px 8px';
                                            e.currentTarget.style.borderRadius = '4px';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.padding = '0';
                                    }}
                                    title={isCajaAbierta ? "Click para editar precio" : ""}
                                >
                                    {formatCurrencyCOP(item.precio_venta)} x {item.cantidad}
                                    {item.cantidad > 1 && (
                                        <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>
                                            = {formatCurrencyCOP(item.precio_venta * item.cantidad)}
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                        
                        <div className="c-cart__item-actions">
                            <input
                                type="number"
                                min="1"
                                value={editingQuantity[item.cartItemId] !== undefined 
                                    ? editingQuantity[item.cartItemId] 
                                    : item.cantidad}
                                onChange={(e) => {
                                    const inputValue = e.target.value;
                                    
                                    // Guardar en estado local para permitir campo vacío
                                    setEditingQuantity({
                                        ...editingQuantity,
                                        [item.cartItemId]: inputValue
                                    });
                                }}
                                onBlur={(e) => {
                                    const inputValue = e.target.value;
                                    
                                    // Limpiar el estado local de edición
                                    const newEditingState = { ...editingQuantity };
                                    delete newEditingState[item.cartItemId];
                                    setEditingQuantity(newEditingState);
                                    
                                    // Si está vacío o es 0, restaurar a 1
                                    if (inputValue === '' || inputValue === '0') {
                                        onUpdateCart(item.cartItemId, 1);
                                        return;
                                    }
                                    
                                    const val = Number.parseInt(inputValue, 10);
                                    
                                    // Validar que sea un número válido
                                    if (isNaN(val) || val < 1) {
                                        onUpdateCart(item.cartItemId, 1);
                                        return;
                                    }
                                    
                                    // 🛑 CAMBIO: Eliminar restricción de stock, permitir sobregiro 🛑
                                    // Actualizar la cantidad sin validar stock
                                    onUpdateCart(item.cartItemId, val);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.target.blur();
                                    }
                                }}
                                className="form-input c-cart__quantity-input"
                                disabled={!isCajaAbierta}
                            />
                            {/* Botón de eliminar asociado a ESTA LINEA */}
                            <button 
                                onClick={() => onUpdateCart(item.cartItemId, 0)} 
                                className="btn btn-error btn-xs"
                                disabled={!isCajaAbierta}
                            >
                                ✕
                            </button>
                        </div>
                        
                        {/* 🛑 NUEVA ADVERTENCIA: Badge de déficit 🛑 */}
                        {tieneDeficit && (
                            <div className="c-cart__deficit-badge">
                                <span className="c-cart__deficit-icon">⚠️</span>
                                <span className="c-cart__deficit-text">
                                    Excede stock en <strong>{deficit}</strong> {deficit === 1 ? 'unidad' : 'unidades'}
                                </span>
                            </div>
                        )}
                    </div>
                    );
                })}
            </div>
            <div className="c-cart__totals c-ventas__total">
                {carrito.length > 1 && (
                    <p className="form-help" style={{ color: 'var(--color-text-light-muted)' }}>
                        Subtotal: <strong>{formatCurrencyCOP(subtotal)}</strong>
                    </p>
                )}
                <h3 className="c-cart__total-amount">Total a Pagar: {formatCurrencyCOP(total)}</h3>
            </div>
        </div>
    );
};

export default CarritoDeVentas;