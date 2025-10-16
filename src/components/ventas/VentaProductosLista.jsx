// src/components/ventas/VentaProductosLista.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { formatCurrencyCOP } from '../../utils/formatters';

const VentaProductosLista = ({ empresaId, onAddToCart }) => {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState(null);

    // Obtiene los productos (el RLS se encarga de filtrar por empresa)
    useEffect(() => {
        const fetchProductos = async () => {
            if (!empresaId) {
                return;
            }
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('nombre', { ascending: true });
            
            if (error) {
                console.error('Error al cargar productos para la venta:', error);
                setError('Error al cargar productos para la venta.');
                setProductos([]);
            } else {
                setProductos((data || []).map(item => ({
                    ...item,
                    precio_venta: Number(item.precio_venta),
                    stock_actual: Number(item.stock_actual),
                })));
            }
            setLoading(false);
        };
        if (!empresaId) {
            setProductos([]);
            setLoading(true);
            setError(null);
            return;
        }
        fetchProductos();
    }, [empresaId]);

    // Filtrar productos basado en la búsqueda
    const productosFiltrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(search.toLowerCase()) || 
        (p.codigo_referencia || '').toLowerCase().includes(search.toLowerCase())
    ).filter(p => p.stock_actual > 0); // Solo mostrar productos con stock > 0

    if (loading) return <div>Cargando productos...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

    return (
        <div style={styles.listaContainer}>
            <h4>Productos Disponibles (Stock &gt; 0)</h4>
            <input 
                type="text" 
                placeholder="Buscar por nombre o referencia..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
            />
            
            <div style={styles.productList}>
                {productosFiltrados.map(p => (
                    <div key={p.id} style={styles.productCard}>
                        <div style={{ flexGrow: 1 }}>
                            <strong>{p.nombre}</strong> ({p.codigo_referencia})
                            <p style={styles.details}>Stock: {p.stock_actual} | Precio: {formatCurrencyCOP(p.precio_venta)}</p>
                        </div>
                        <button 
                            onClick={() => onAddToCart(p)}
                            style={styles.addButton}
                        >
                            Añadir
                        </button>
                    </div>
                ))}
                {productosFiltrados.length === 0 && <p>No se encontraron productos con ese nombre/referencia o sin stock.</p>}
            </div>
        </div>
    );
};

// ... Estilos de la lista ...
const styles = {
    listaContainer: { padding: '15px', border: '1px solid #ddd', borderRadius: '8px' },
    searchInput: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc' },
    productList: { maxHeight: '500px', overflowY: 'auto' },
    productCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' },
    details: { margin: '5px 0 0', fontSize: '12px', color: '#555' },
    addButton: { padding: '8px 12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

export default VentaProductosLista;