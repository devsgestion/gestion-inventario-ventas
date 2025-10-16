// src/components/inventario/ProductosLista.jsx (versión actualizada)

import React, { useState } from 'react';
import useInventario from '../../hooks/useInventario';
import AjusteStockModal from './AjusteStockModal';
import { formatCurrencyCOP } from '../../utils/formatters';

const ProductosLista = ({ empresaId, refreshKey = 0, onProductAdjusted }) => {
    // Usar el hook para obtener los datos
    const { productos, loading, error, fetchProductos } = useInventario(empresaId, refreshKey);

    // Estado para controlar el modal y qué producto se está ajustando
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);

    // useEffect para re-cargar cuando la clave del padre cambie
    // NOTA: Esto ya está manejado en useInventario, pero lo podemos forzar si es necesario.

    if (loading) return <p>Cargando inventario...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

    if (productos.length === 0) {
        return <p>Aún no tienes productos en tu inventario. ¡Usa el formulario para ingresar el stock inicial!</p>;
    }
    
    // Función para cerrar el modal y limpiar el estado
    const handleCloseModal = () => setProductoSeleccionado(null);

    // Función que se ejecuta después de ajustar el stock
    const handleStockAdjusted = () => {
        fetchProductos(); // Forzar la recarga de datos después del ajuste
        if (onProductAdjusted) {
             onProductAdjusted(); // Llamar a la función padre si existe
        }
    };

    return (
        <div style={styles.tableContainer}>
            <p>Mostrando {productos.length} referencias</p>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Ref.</th>
                        <th style={styles.th}>Nombre</th>
                        <th style={styles.th}>Stock Actual</th>
                        <th style={styles.th}>Precio Venta</th>
                        <th style={styles.th}>Alerta Mín.</th>
                        <th style={styles.th}>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {productos.map((p) => (
                        <tr key={p.id} style={p.stock_actual <= p.alerta_stock_min ? styles.lowStockRow : {}}>
                            <td style={styles.td}>{p.codigo_referencia}</td>
                            <td style={styles.td}>{p.nombre}</td>
                            <td style={styles.td}>{p.stock_actual}</td>
                            <td style={styles.td}>{formatCurrencyCOP(p.precio_venta)}</td>
                            <td style={styles.td}>{p.alerta_stock_min}</td>
                            <td style={styles.td}>
                                <button 
                                    onClick={() => setProductoSeleccionado(p)} // <-- Abrir modal con el producto
                                    style={styles.actionButton}
                                >
                                    Ajustar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {/* Mostrar el Modal si hay un producto seleccionado */}
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

// Estilos que faltan y causan el error:
const styles = {
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px', fontSize: '14px' },
    th: { border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#f2f2f2' },
    td: { border: '1px solid #ddd', padding: '10px' },
    lowStockRow: { backgroundColor: '#ffe5e5' }, // Resaltar stock bajo
    actionButton: { padding: '5px 10px', fontSize: '12px', cursor: 'pointer' }
};

export default ProductosLista;