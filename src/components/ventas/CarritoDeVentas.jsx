// src/components/ventas/CarritoDeVentas.jsx (FINAL CON EDICIÓN DE PRECIO)

import React, { useState } from 'react';
import { formatCurrencyCOP } from '../../utils/formatters';
import '../../styles/ventas.css';

// 🛑 NOTA: Asumimos que el componente padre (VentasPage) pasa la prop onUpdatePrice 🛑
const CarritoDeVentas = ({ carrito, onUpdateCart, onUpdatePrice, isCajaAbierta }) => { 
    const [editingItemId, setEditingItemId] = useState(null);
    const [editingQuantity, setEditingQuantity] = useState({}); // Estado local para edición de cantidades

    // Calcular el total
    const subtotal = carrito.reduce((acc, item) => acc + (Number(item.precio_venta) * item.cantidad), 0);
    const total = subtotal; 

    // 🛑 HANDLER PARA GUARDAR EL PRECIO MODIFICADO 🛑
    const handlePriceInputBlur = (cartItemId, event) => {
        const newValue = event.target.value;
        onUpdatePrice(cartItemId, newValue); // Usar cartItemId para identificar la línea única
        setEditingItemId(null); // Desactivar el modo edición al perder el foco
    };

    return (
        <div className="c-cart">
            <h4 className="c-cart__title">Detalle de la Venta ({carrito.length} ítems)</h4>
            
            <div className="c-cart__items">
                {carrito.length === 0 && <p className="empty-state">Carrito vacío. Agrega productos de la lista.</p>}
                
                {carrito.map(item => (
                    // 🛑 Clave única por línea de ítem 🛑
                    <div key={item.cartItemId} className="c-cart__item"> 
                        <div className="c-cart__item-info">
                            <strong>{item.nombre}</strong>
                            
                            {/* CELDA DE PRECIO EDITABLE */}
                            {editingItemId === item.cartItemId ? (
                                <input
                                    type="number"
                                    min="0"
                                    // Mostramos el valor actual sin formato COP para edición
                                    defaultValue={item.precio_venta} 
                                    onBlur={(e) => handlePriceInputBlur(item.cartItemId, e)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.target.blur();
                                    }}
                                    autoFocus
                                    className="form-input c-cart__price-input"
                                    disabled={!isCajaAbierta}
                                />
                            ) : (
                                <p 
                                    className="form-help c-cart__price-display"
                                    // 🛑 Activar edición al hacer click 🛑
                                    onClick={isCajaAbierta ? () => setEditingItemId(item.cartItemId) : null}
                                    style={{ cursor: isCajaAbierta ? 'pointer' : 'default' }}
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
                                    
                                    // Validar stock disponible
                                    if (val > item.stock_actual) {
                                        onUpdateCart(item.cartItemId, item.stock_actual);
                                        return;
                                    }
                                    
                                    // Actualizar la cantidad
                                    onUpdateCart(item.cartItemId, val);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.target.blur();
                                    }
                                }}
                                className="form-input c-cart__quantity-input"
                                disabled={!isCajaAbierta}
                                max={item.stock_actual}
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
                        {item.cantidad > item.stock_actual && (
                            <span className="c-form-message c-form-message--error">
                                Máximo permitido: {item.stock_actual}
                            </span>
                        )}
                    </div>
                ))}
            </div>
            <div className="c-cart__totals">
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