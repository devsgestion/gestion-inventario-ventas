// src/components/inventario/ProductosLista.jsx

import React, { useState } from 'react';
import useInventario from '../../hooks/useInventario';
import AjusteStockModal from './AjusteStockModal';
import { formatCurrencyCOP } from '../../utils/formatters';
import { supabase } from '../../api/supabaseClient'; 
import '../../styles/inventario.css';

const ProductosLista = ({ empresaId, refreshKey = 0, onProductAdjusted }) => {
    const { productos, loading, error, fetchProductos, productosBajoStock } = useInventario(empresaId, refreshKey);

    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [editingId, setEditingId] = useState(null);
    // 🛑 NUEVO ESTADO: Controla si la tabla debe mostrar solo las alertas
    const [mostrarSoloAlertas, setMostrarSoloAlertas] = useState(false); 
    
    // --- Lógica de Filtro ---
    const productosFiltrados = mostrarSoloAlertas 
        ? productos.filter(p => p.stock_actual <= p.alerta_stock_min)
        : productos;
        
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
        <div className="c-data-table-wrapper">
            <AlertaStockMinimo />
            <p className="c-form-message c-form-message--help u-mb-lg">
                Mostrando {productosFiltrados.length} de {countTotal} referencias
            </p>
            <table className="c-data-table">
                <thead>
                    <tr>
                        <th className="c-data-table__header-cell">Ref.</th>
                        <th className="c-data-table__header-cell">Nombre</th>
                        <th className="c-data-table__header-cell">Stock Actual</th>
                        <th className="c-data-table__header-cell">Precio Venta</th> 
                        <th className="c-data-table__header-cell">Alerta Mín.</th>
                        <th className="c-data-table__header-cell">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {productosFiltrados.map((p) => (
                        <tr 
                            key={p.id} 
                            className={p.stock_actual <= p.alerta_stock_min ? 'c-data-table__row--low-stock' : ''}
                        >
                            <td className="c-data-table__cell">{p.codigo_referencia}</td>
                            <td className="c-data-table__cell">{p.nombre}</td>
                            {/* Celda de stock con icono de alerta si está bajo */}
                            <td className={`c-data-table__cell${p.stock_actual <= p.alerta_stock_min ? ' c-data-table__cell--stock-alert' : ''}`}>
                                {p.stock_actual}
                            </td>
                            <td className="c-data-table__cell" onClick={() => setEditingId(p.id)}>
                                {editingId === p.id ? (
                                    <input 
                                        type="number"
                                        defaultValue={p.precio_venta}
                                        onBlur={(e) => handlePriceUpdate(p.id, e.target.value)}
                                        onKeyDown={(e) => { 
                                            if (e.key === 'Enter') e.target.blur();
                                        }}
                                        className="c-inline-edit-input"
                                        autoFocus
                                    />
                                ) : (
                                    <>{formatCurrencyCOP(p.precio_venta)}</>
                                )}
                            </td>
                            <td className="c-data-table__cell">{p.alerta_stock_min}</td>
                            <td className="c-data-table__cell">
                                <button 
                                    onClick={() => setProductoSeleccionado(p)}
                                    className="btn btn-primary btn-sm c-btn-table-action"
                                >
                                    Ajustar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {productoSeleccionado && (
                <AjusteStockModal 
                    producto={productoSeleccionado}
                    onClose={handleCloseModal}
                    onStockAdjusted={handleStockAdjusted}
                />
            )}
        </div>
    );
};

export default ProductosLista;