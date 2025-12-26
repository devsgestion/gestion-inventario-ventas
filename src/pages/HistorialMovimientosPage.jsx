import React, { useState } from 'react';
import { Navigate } from 'react-router-dom'; // 🛑 Importar Navigate
import useMovimientos from '../hooks/useMovimientos';
import useAuth from '../hooks/useAuth';
import usePermissions from '../hooks/usePermissions'; // 🛑 Importar usePermissions
import { formatCurrencyCOP } from '../utils/formatters';
import '../styles/HistorialMovimientos.css';

const HistorialMovimientosPage = () => {
    const { perfil } = useAuth();
    const permissions = usePermissions(); // 🛑 Hook de permisos
    
    // Filter states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [tipoMovimiento, setTipoMovimiento] = useState('TODOS');
    const [filter, setFilter] = useState(''); // Client-side text filter
    
    const { movimientos, loading, error, fetchMovimientos } = useMovimientos(perfil?.empresa_id);

    // 🛑 Redireccionar si no tiene permisos
    if (!permissions.canViewInventoryMovements) {
        return <Navigate to="/inventario" replace />;
    }

    const handleSearch = () => {
        fetchMovimientos({ startDate, endDate, tipoMovimiento });
    };

    if (loading) return <div className="c-state-message c-card">Cargando historial...</div>;
    if (error) return <div className="c-alert c-alert--error">Error: {error}</div>;

    const filteredMovimientos = movimientos.filter(m => {
        const search = filter.toLowerCase();
        return (
            m.producto?.nombre?.toLowerCase().includes(search) ||
            m.producto?.codigo_referencia?.toLowerCase().includes(search) ||
            m.tipo_movimiento?.toLowerCase().includes(search) ||
            m.razon?.toLowerCase().includes(search) ||
            m.usuario?.nombre_completo?.toLowerCase().includes(search)
        );
    });

    // Helper to format "Razon"
    const formatRazon = (razon) => {
        if (!razon) return '-';
        if (razon.startsWith('Venta Registrada:')) {
            const parts = razon.split(':');
            if (parts.length > 1) {
                const uuid = parts[1].trim();
                return (
                    <span title={uuid}>
                        Venta <span className="uuid-short">#{uuid.substring(0, 8)}...</span>
                    </span>
                );
            }
        }
        return razon;
    };

    // Helper for badge class
    const getBadgeClass = (tipo, razon) => {
        if (!tipo) return 'badge-default';
        const t = tipo.toLowerCase();
        const r = razon ? razon.toLowerCase() : '';
        
        // Check for Devolucion in reason if type is ajuste
        if ((t.includes('ajuste') && r.includes('devolución')) || t.includes('devolucion')) {
            return 'badge-devolucion';
        }

        // Recepcion is now considered an Ajuste Stock visually
        if (t.includes('recepcion')) return 'badge-ajuste';

        if (t.includes('ajuste')) return 'badge-ajuste';
        if (t.includes('compra')) return 'badge-compra';
        if (t.includes('venta')) return 'badge-venta';
        if (t.includes('merma')) return 'badge-merma';
        
        return 'badge-default';
    };

    // Helper for badge label
    const getBadgeLabel = (tipo, razon) => {
        if (!tipo) return '-';
        const t = tipo.toLowerCase();
        const r = razon ? razon.toLowerCase() : '';

        // Case: Cambio/Devolucion
        if ((t.includes('ajuste') && r.includes('devolución')) || t.includes('devolucion')) {
            return 'CAMBIO';
        }

        // Case: Recepcion -> AJUSTE STOCK
        if (t.includes('recepcion')) {
            return 'AJUSTE STOCK';
        }
        
        // Case: Ajuste -> AJUSTE STOCK
        if (t.includes('ajuste')) {
            return 'AJUSTE STOCK';
        }

        return tipo.replace(/_/g, ' ');
    };

    // Helper to display active filter info
    const getActiveFilterInfo = () => {
        if (startDate && endDate) {
            return `Mostrando movimientos desde ${new Date(startDate).toLocaleDateString()} hasta ${new Date(endDate).toLocaleDateString()}`;
        } else if (startDate) {
            return `Mostrando movimientos desde ${new Date(startDate).toLocaleDateString()}`;
        } else if (endDate) {
            return `Mostrando movimientos hasta ${new Date(endDate).toLocaleDateString()}`;
        }
        return "Mostrando últimos 200 movimientos";
    };

    return (
        <div className="historial-movimientos-page">
            <div className="historial-header">
                <h1 className="historial-title">📜 Historial de Movimientos</h1>
            </div>
            
            <div className="filters-wrapper">
                <div className="date-filters">
                    <div className="date-field">
                        <label>Desde:</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                        />
                    </div>
                    <div className="date-field">
                        <label>Hasta:</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                        />
                    </div>
                    <div className="date-field">
                        <label>Tipo:</label>
                        <select 
                            value={tipoMovimiento} 
                            onChange={(e) => setTipoMovimiento(e.target.value)}
                            className="select-filter"
                        >
                            <option value="TODOS">Todos los tipos</option>
                            <option value="VENTA">Venta</option>
                            <option value="COMPRA">Compra</option>
                            <option value="AJUSTE_STOCK">Ajuste Stock</option>
                            <option value="CAMBIO">Cambio</option>
                        </select>
                    </div>
                    <button onClick={handleSearch} className="historial-btn-primary">
                        🔎 Aplicar Filtros
                    </button>
                </div>

                <div className="search-filters">
                    <input 
                        type="text" 
                        placeholder="🔍 Buscar en resultados (producto, referencia, usuario)..." 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="search-input"
                    />
                </div>
                
                <div className="active-filter-info">
                    {getActiveFilterInfo()}
                </div>
            </div>

            <div className="table-container">
                {filteredMovimientos.length === 0 ? (
                    <div style={{padding: '2rem', textAlign: 'center', color: 'var(--color-text-medium)'}}>
                        No se encontraron movimientos en este rango.
                    </div>
                ) : (
                    <table className="movimientos-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Producto</th>
                                <th>Tipo</th>
                                <th>Cantidad</th>
                                <th>Razón / Detalle</th>
                                <th>Usuario</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMovimientos.map(m => (
                                <tr key={m.id}>
                                    <td>
                                        {new Date(m.fecha).toLocaleDateString()} <br/>
                                        <small style={{color: 'var(--color-text-medium)'}}>
                                            {new Date(m.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </small>
                                    </td>
                                    <td>
                                        <div className="product-info">
                                            <span className="product-name">{m.producto?.nombre || 'Producto Eliminado'}</span>
                                            <span className="product-ref">{m.producto?.codigo_referencia || '-'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${getBadgeClass(m.tipo_movimiento, m.razon)}`}>
                                            {getBadgeLabel(m.tipo_movimiento, m.razon)}
                                        </span>
                                    </td>
                                    <td className={m.cantidad_cambio > 0 ? 'qty-positive' : 'qty-negative'}>
                                        <div className="qty-value">
                                            {m.cantidad_cambio > 0 ? '+' : ''}{m.cantidad_cambio}
                                        </div>
                                        {m.precio_venta && (
                                            <div className="qty-price-detail" title="Precio de venta">
                                                {formatCurrencyCOP(m.precio_venta)}
                                            </div>
                                        )}
                                    </td>
                                    <td>{formatRazon(m.razon)}</td>
                                    <td>{m.usuario?.nombre_completo || 'Sistema'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default HistorialMovimientosPage;
