// src/components/ventas/CarritoDeVentas.jsx (Refactorizado)
import React from 'react';
import { formatCurrencyCOP } from '../../utils/formatters';
import '../../styles/ventas.css';

const CarritoDeVentas = ({ carrito, onUpdateCart, isCajaAbierta }) => { 
    
    const subtotal = carrito.reduce((acc, item) => acc + (Number(item.precio_venta) * item.cantidad), 0);
    const ivaRate = 0; 
    const total = subtotal * (1 + ivaRate);

    return (
        <div className="c-cart">
            <h4 className="c-cart__title">Detalle de la Venta ({carrito.length} ítems)</h4>
            <div className="c-cart__items">
                {carrito.length === 0 && <p className="empty-state">Carrito vacío. Agrega productos de la lista.</p>}
                {carrito.map(item => (
                    <div key={item.id} className="c-cart__item">
                        <div className="c-cart__item-info">
                            <strong>{item.nombre}</strong>
                            <p className="form-help" style={{ color: 'var(--color-text-light-muted)' }}>
                                {formatCurrencyCOP(item.precio_venta)} x {item.cantidad}
                                {/* Solo muestra el total por línea si la cantidad es mayor a 1 */}
                                {item.cantidad > 1 && (
                                    <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>
                                        = {formatCurrencyCOP(item.precio_venta * item.cantidad)}
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="c-cart__item-actions">
                            <input
                                type="number"
                                min="0"
                                value={item.cantidad}
                                onChange={(e) => {
                                    const val = Number.parseInt(e.target.value, 10);
                                    if (val < 0 || val > item.stock_actual) return;
                                    onUpdateCart(item.id, val);
                                }}
                                className="form-input c-cart__quantity-input"
                                disabled={!isCajaAbierta}
                                max={item.stock_actual}
                            />
                            <button 
                                onClick={() => onUpdateCart(item.id, 0)} 
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
                {/* Solo muestra el subtotal si hay más de un producto en el carrito */}
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