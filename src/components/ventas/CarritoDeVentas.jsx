// src/components/ventas/CarritoDeVentas.jsx
import React from 'react';
import { formatCurrencyCOP } from '../../utils/formatters';

const CarritoDeVentas = ({ carrito, onUpdateCart, onFinalizarVenta }) => {
    
    // 1. Calcular el total de la venta
    const subtotal = carrito.reduce((acc, item) => acc + (Number(item.precio_venta) * item.cantidad), 0);
    const ivaRate = 0; // Podrías implementar esto después
    const total = subtotal * (1 + ivaRate);

    return (
        <div style={styles.carritoContainer}>
            <h4>Detalle de la Venta ({carrito.length} ítems)</h4>
            
            <div style={styles.itemsList}>
                {carrito.length === 0 && <p style={{ textAlign: 'center', color: '#777' }}>Carrito vacío.</p>}

                {carrito.map(item => (
                    <div key={item.id} style={styles.itemRow}>
                        <div style={{ flexGrow: 1 }}>
                            <strong>{item.nombre}</strong>
                            <p style={styles.itemDetails}>{formatCurrencyCOP(item.precio_venta)} x {item.cantidad}</p>
                        </div>
                        <div style={styles.itemActions}>
                            {/* Input para modificar la cantidad */}
                            <input
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) => onUpdateCart(item.id, Number.parseInt(e.target.value, 10))}
                                style={styles.quantityInput}
                            />
                            {/* Botón de eliminar */}
                            <button onClick={() => onUpdateCart(item.id, 0)} style={styles.removeButton}>X</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Totales y Finalizar */}
            <div style={styles.totalsBox}>
                <p>Subtotal: <strong>{formatCurrencyCOP(subtotal)}</strong></p>
                {/* <p>IVA ({ivaRate * 100}%): <strong>${(total - subtotal).toFixed(2)}</strong></p> */}
                <h3 style={styles.totalAmount}>Total: {formatCurrencyCOP(total)}</h3>
                
                <button 
                    onClick={onFinalizarVenta} 
                    disabled={carrito.length === 0}
                    style={styles.checkoutButton}
                >
                    Finalizar Venta
                </button>
            </div>
        </div>
    );
};

// ... Estilos del carrito ...
const styles = {
    carritoContainer: { padding: '15px', border: '1px solid #ddd', borderRadius: '8px', display: 'flex', flexDirection: 'column' },
    itemsList: { flexGrow: 1, borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px', maxHeight: '400px', overflowY: 'auto' },
    itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dotted #ddd' },
    itemDetails: { fontSize: '12px', color: '#555' },
    itemActions: { display: 'flex', alignItems: 'center', gap: '5px' },
    quantityInput: { width: '40px', padding: '5px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center' },
    removeButton: { background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontWeight: 'bold' },
    totalsBox: { padding: '10px 0', borderTop: '1px solid #ddd' },
    totalAmount: { margin: '10px 0', fontSize: '1.5em', color: '#2ecc71' },
    checkoutButton: { width: '100%', padding: '15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1em', marginTop: '10px' }
};

export default CarritoDeVentas;