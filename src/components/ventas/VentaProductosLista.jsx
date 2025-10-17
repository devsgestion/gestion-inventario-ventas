// src/components/ventas/VentaProductosLista.jsx (Refactorizado)
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { formatCurrencyCOP } from '../../utils/formatters';
import '../../styles/ventas.css';

const VentaProductosLista = ({ empresaId, onAddToCart, isCajaAbierta }) => {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState(null);

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

    const productosFiltrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(search.toLowerCase()) || 
        (p.codigo_referencia || '').toLowerCase().includes(search.toLowerCase())
    ).filter(p => p.stock_actual > 0); 

    const handleClickProducto = (producto) => {
        if (!isCajaAbierta) {
            return; 
        }
        onAddToCart(producto);
    };

    if (loading) return <div className="loading-state card p-ventas__loading">Cargando productos...</div>;
    if (error) return <div className="alert alert-error">Error: {error}</div>;

    return (
        <div className="card c-product-list">
            <h4 className="card-title c-product-list__title">Productos Disponibles (Stock &gt; 0)</h4>
            <input 
                type="text" 
                placeholder="Buscar por nombre o referencia..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="form-input c-product-list__search-input"
                disabled={!isCajaAbierta}
                maxLength={40}
            />
            {search.length > 0 && productosFiltrados.length === 0 && (
                <span className="c-form-message c-form-message--error u-mb-md">
                    No se encontraron productos con ese criterio.
                </span>
            )}
            <div className="c-product-list__items">
                {productosFiltrados.map(p => (
                    <div 
                        key={p.id} 
                        className={`c-product-card ${!isCajaAbierta ? 'is-disabled' : ''}`}
                    >
                        <div className="c-product-card__info">
                            <strong>{p.nombre}</strong> <span className="form-help">({p.codigo_referencia})</span>
                            <p className="form-help">
                                Stock: {p.stock_actual} | Precio: <span style={{ fontWeight: 'bold' }}>{formatCurrencyCOP(p.precio_venta)}</span>
                            </p>
                        </div>
                        <button 
                            onClick={() => onAddToCart(p)}
                            className="btn btn-primary btn-sm"
                            disabled={!isCajaAbierta}
                        >
                            Añadir
                        </button>
                    </div>
                ))}
                {productosFiltrados.length === 0 && <p className="empty-state">No se encontraron productos con ese nombre/referencia o sin stock.</p>}
            </div>
        </div>
    );
};

export default VentaProductosLista;