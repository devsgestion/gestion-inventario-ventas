// src/components/cambios/ProcesarCambioModal.jsx
// Modal para procesar cambios y devoluciones

import React, { useState, useEffect, useRef } from 'react';
import useCambiosDevoluciones from '../../hooks/useCambiosDevoluciones';
import useInventario from '../../hooks/useInventario';
import { formatCurrency } from '../../utils/formatters';
import '../../styles/CambiosDevoluciones.css';

const PASOS = {
    BUSCAR_PRODUCTO: 1,
    SELECCIONAR_VENTA: 2,
    SELECCIONAR_DEVUELTOS: 3,
    SELECCIONAR_NUEVOS: 4,
    CONFIRMAR: 5
};

const ProcesarCambioModal = ({ empresaId, usuarioId, onClose, onCambioCompletado }) => {
    const { 
        buscarProductosVendidos, 
        buscarVentasPorProducto, 
        obtenerProductosVenta, 
        procesarCambio 
    } = useCambiosDevoluciones(empresaId);
    const { productos: productosDisponibles } = useInventario(empresaId);

    // Ref para detectar clics fuera
    const searchContainerRef = useRef(null);

    // Estados del wizard
    const [pasoActual, setPasoActual] = useState(PASOS.BUSCAR_PRODUCTO);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Datos del cambio
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [ventasDelProducto, setVentasDelProducto] = useState([]);
    const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
    const [productosVenta, setProductosVenta] = useState([]);
    const [productosDevueltos, setProductosDevueltos] = useState({});
    const [productosNuevos, setProductosNuevos] = useState({});
    const [motivo, setMotivo] = useState('');

    // Búsqueda de productos vendidos
    const [searchTerm, setSearchTerm] = useState('');
    const [productosEncontrados, setProductosEncontrados] = useState([]);
    const [busquedaRealizada, setBusquedaRealizada] = useState(false);
    const [sugerencias, setSugerencias] = useState([]);
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    
    // Filtro de productos nuevos
    const [filtroProductos, setFiltroProductos] = useState('');

    // Cargar sugerencias mientras escribe
    const handleInputChange = async (value) => {
        setSearchTerm(value);
        
        if (!value.trim()) {
            setBusquedaRealizada(false);
            setProductosEncontrados([]);
            setSugerencias([]);
            setMostrarSugerencias(false);
            return;
        }

        // Buscar sugerencias en tiempo real (mínimo 2 caracteres)
        if (value.trim().length >= 2) {
            const productos = await buscarProductosVendidos(value);
            setSugerencias(productos.slice(0, 5)); // Máximo 5 sugerencias
            setMostrarSugerencias(true);
        } else {
            setSugerencias([]);
            setMostrarSugerencias(false);
        }
    };

    // Seleccionar sugerencia
    const handleSeleccionarSugerencia = (producto) => {
        setSearchTerm(producto.nombre);
        setSugerencias([producto]);
        setProductosEncontrados([producto]);
        setBusquedaRealizada(true);
        setMostrarSugerencias(false);
    };

    // Buscar productos vendidos
    const handleBuscarProductos = async () => {
        if (!searchTerm.trim()) return;
        
        setLoading(true);
        setBusquedaRealizada(true);
        setMostrarSugerencias(false);
        const productos = await buscarProductosVendidos(searchTerm);
        setProductosEncontrados(productos);
        setLoading(false);
    };

    // Seleccionar producto y buscar sus ventas
    const handleSeleccionarProducto = async (producto) => {
        setProductoSeleccionado(producto);
        setLoading(true);
        const ventas = await buscarVentasPorProducto(producto.producto_id);
        setVentasDelProducto(ventas);
        setLoading(false);
        setPasoActual(PASOS.SELECCIONAR_VENTA);
    };

    // Seleccionar venta y cargar sus productos
    const handleSeleccionarVenta = async (venta) => {
        setVentaSeleccionada(venta);
        setLoading(true);
        const prods = await obtenerProductosVenta(venta.id);
        setProductosVenta(prods);
        setLoading(false);
        setPasoActual(PASOS.SELECCIONAR_DEVUELTOS);
    };

    // Manejar cantidad de productos devueltos
    const handleCantidadDevuelto = (productoVentaId, cantidad) => {
        const productoVenta = productosVenta.find(p => p.id === productoVentaId);
        if (!productoVenta) return;

        const cantidadNum = parseInt(cantidad) || 0;
        const maxCantidad = productoVenta.cantidad;

        if (cantidadNum > 0 && cantidadNum <= maxCantidad) {
            setProductosDevueltos(prev => ({
                ...prev,
                [productoVentaId]: {
                    producto_id: productoVenta.producto_id,
                    nombre: productoVenta.producto?.nombre,
                    cantidad: cantidadNum,
                    precio_unitario: productoVenta.precio_unitario
                }
            }));
        } else if (cantidadNum === 0) {
            setProductosDevueltos(prev => {
                const newState = { ...prev };
                delete newState[productoVentaId];
                return newState;
            });
        }
    };

    // Manejar cantidad de productos nuevos
    const handleCantidadNuevo = (productoId, cantidad) => {
        const producto = productosDisponibles.find(p => p.id === productoId);
        if (!producto) return;

        const cantidadNum = parseInt(cantidad) || 0;

        if (cantidadNum > 0 && cantidadNum <= producto.stock_actual) {
            setProductosNuevos(prev => ({
                ...prev,
                [productoId]: {
                    producto_id: productoId,
                    nombre: producto.nombre,
                    cantidad: cantidadNum,
                    precio_unitario: producto.precio_venta
                }
            }));
        } else if (cantidadNum === 0) {
            setProductosNuevos(prev => {
                const newState = { ...prev };
                delete newState[productoId];
                return newState;
            });
        }
    };

    // Calcular totales
    const calcularTotales = () => {
        const valorDevolucion = Object.values(productosDevueltos).reduce(
            (sum, item) => sum + (item.cantidad * item.precio_unitario), 
            0
        );

        const valorNuevos = Object.values(productosNuevos).reduce(
            (sum, item) => sum + (item.cantidad * item.precio_unitario), 
            0
        );

        const diferencia = valorNuevos - valorDevolucion;

        return { valorDevolucion, valorNuevos, diferencia };
    };

    // Procesar el cambio
    const handleProcesarCambio = async () => {
        if (Object.keys(productosDevueltos).length === 0) {
            setError('Debes seleccionar al menos un producto a devolver');
            return;
        }

        if (Object.keys(productosNuevos).length === 0) {
            setError('Debes seleccionar al menos un producto nuevo');
            return;
        }

        setLoading(true);
        setError(null);

        const { valorDevolucion, valorNuevos, diferencia } = calcularTotales();

        const resultado = await procesarCambio({
            ventaOriginalId: ventaSeleccionada.id,
            productosDevueltos: Object.values(productosDevueltos),
            productosNuevos: Object.values(productosNuevos),
            valorDevolucion,
            valorNuevos,
            diferencia,
            motivo,
            usuarioId
        });

        setLoading(false);

        if (resultado.success) {
            onCambioCompletado();
        } else {
            setError(resultado.error || 'Error al procesar el cambio');
        }
    };

    // Cerrar sugerencias al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setMostrarSugerencias(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const { valorDevolucion, valorNuevos, diferencia } = calcularTotales();

    return (
        <div className="cd-modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="cd-modal-content">
                <div className="cd-modal-header">
                    <h2 className="cd-modal-title">
                        🔄 Procesar Cambio/Devolución
                    </h2>
                    <p style={{margin: '0.5rem 0 0', color: 'var(--color-text-medium)', fontSize: '0.875rem'}}>
                        Paso {pasoActual} de 5
                    </p>
                </div>

                <div className="cd-modal-body">
                    {error && (
                        <div className="alert alert-error" style={{marginBottom: 'var(--space-lg)'}}>
                            {error}
                        </div>
                    )}

                    {/* PASO 1: BUSCAR Y SELECCIONAR PRODUCTO */}
                    {pasoActual === PASOS.BUSCAR_PRODUCTO && (
                        <div className="cd-modal-section">
                            <h3 className="cd-modal-section-title">1. Busca el Producto</h3>
                            <p style={{marginBottom: 'var(--space-md)', color: 'var(--color-text-medium)', fontSize: '0.875rem'}}>
                                Busca el producto que el cliente quiere devolver o cambiar.
                            </p>
                            
                            <div style={{position: 'relative'}} ref={searchContainerRef}>
                                <div className="cd-search-box" style={{display: 'flex', gap: '0.5rem'}}>
                                    <input 
                                        type="text"
                                        placeholder="Escribe el nombre del producto..."
                                        value={searchTerm}
                                        onChange={(e) => handleInputChange(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleBuscarProductos();
                                                setMostrarSugerencias(false);
                                            }
                                        }}
                                        onFocus={() => {
                                            if (sugerencias.length > 0) {
                                                setMostrarSugerencias(true);
                                            }
                                        }}
                                        className="cd-search-input"
                                        autoFocus
                                        autoComplete="off"
                                        style={{flex: 1}}
                                    />
                                    <button 
                                        onClick={handleBuscarProductos}
                                        className="cd-search-button"
                                        disabled={loading || !searchTerm.trim()}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            borderRadius: 'var(--border-radius-md)',
                                            border: 'none',
                                            cursor: loading || !searchTerm.trim() ? 'not-allowed' : 'pointer',
                                            background: loading || !searchTerm.trim() ? 'var(--color-surface-400)' : 'var(--color-primary)',
                                            color: 'white',
                                            transition: 'all 0.2s ease',
                                            minWidth: '120px'
                                        }}
                                    >
                                        {loading ? (
                                            <>⏳ Buscando...</>
                                        ) : (
                                            <>🔍 Buscar</>
                                        )}
                                    </button>
                                </div>

                                {/* Dropdown de sugerencias */}
                                {mostrarSugerencias && sugerencias.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: '132px', // Espacio para el botón
                                        background: 'var(--color-surface-200)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--border-radius-md)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        marginTop: '0.25rem',
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        zIndex: 1000
                                    }}>
                                        {sugerencias.map((producto, index) => (
                                            <div
                                                key={producto.producto_id}
                                                onClick={() => handleSeleccionarSugerencia(producto)}
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    cursor: 'pointer',
                                                    borderBottom: index < sugerencias.length - 1 ? '1px solid var(--color-border)' : 'none',
                                                    transition: 'background 0.2s ease',
                                                    background: 'transparent'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-300)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div style={{fontWeight: 600, marginBottom: '0.25rem'}}>
                                                    {producto.nombre}
                                                </div>
                                                <div style={{fontSize: '0.75rem', color: 'var(--color-text-medium)', display: 'flex', gap: '1rem'}}>
                                                    <span>{formatCurrency(producto.precio_venta)}</span>
                                                    <span>• {producto.total_vendido} unidades vendidas</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {loading ? (
                                <div style={{textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-medium)'}}>
                                    <p style={{fontSize: '1rem', marginBottom: '0.5rem'}}>⏳ Buscando productos...</p>
                                    <p style={{fontSize: '0.875rem'}}>Esto puede tomar unos segundos</p>
                                </div>
                            ) : busquedaRealizada && productosEncontrados.length === 0 ? (
                                <div style={{textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-medium)'}}>
                                    <p style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>🔍</p>
                                    <p style={{fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem'}}>
                                        No se encontraron productos
                                    </p>
                                    <p style={{fontSize: '0.875rem'}}>
                                        No hay productos vendidos con el nombre "{searchTerm}"
                                    </p>
                                </div>
                            ) : productosEncontrados.length > 0 ? (
                                <>
                                    <p style={{fontSize: '0.875rem', color: 'var(--color-success)', marginBottom: 'var(--space-md)', fontWeight: 600}}>
                                        ✅ {productosEncontrados.length} producto(s) encontrado(s)
                                    </p>
                                    <div className="cd-productos-grid">
                                        {productosEncontrados.map(producto => (
                                            <div 
                                                key={producto.producto_id}
                                                className={`cd-producto-item ${productoSeleccionado?.producto_id === producto.producto_id ? 'cd-producto-item--selected' : ''}`}
                                                onClick={() => handleSeleccionarProducto(producto)}
                                                style={{cursor: 'pointer'}}
                                            >
                                                <div className="cd-producto-info">
                                                    <div className="cd-producto-nombre">{producto.nombre}</div>
                                                    <div className="cd-producto-precio">
                                                        {formatCurrency(producto.precio_venta)}
                                                    </div>
                                                    <div style={{fontSize: '0.75rem', color: 'var(--color-text-medium)', marginTop: '0.25rem'}}>
                                                        {producto.total_vendido} unidades vendidas en {producto.ventas_ids.length} venta(s)
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div style={{textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-medium)'}}>
                                    <p style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>👆</p>
                                    <p style={{fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem'}}>
                                        Comienza tu búsqueda
                                    </p>
                                    <p style={{fontSize: '0.875rem'}}>
                                        Escribe el nombre del producto y presiona Enter o haz clic en Buscar
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PASO 2: SELECCIONAR VENTA */}
                    {pasoActual === PASOS.SELECCIONAR_VENTA && (
                        <div className="cd-modal-section">
                            <h3 className="cd-modal-section-title">2. Selecciona la Venta</h3>
                            <p style={{marginBottom: 'var(--space-md)', color: 'var(--color-text-medium)', fontSize: '0.875rem'}}>
                                Producto: <strong>{productoSeleccionado?.nombre}</strong> - {formatCurrency(productoSeleccionado?.precio_venta)}
                            </p>
                            <p style={{marginBottom: 'var(--space-md)', color: 'var(--color-text-medium)', fontSize: '0.875rem'}}>
                                Selecciona en cuál venta se compró este producto:
                            </p>

                            {loading ? (
                                <p>Cargando ventas...</p>
                            ) : ventasDelProducto.length === 0 ? (
                                <p style={{textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-text-medium)'}}>
                                    No se encontraron ventas con este producto
                                </p>
                            ) : (
                                <ul className="cd-ventas-list">
                                    {ventasDelProducto.map(venta => (
                                        <li 
                                            key={venta.id}
                                            className={`cd-venta-item ${ventaSeleccionada?.id === venta.id ? 'cd-venta-item--selected' : ''}`}
                                            onClick={() => handleSeleccionarVenta(venta)}
                                        >
                                            <div>
                                                <strong>Venta #{venta.numero_venta || venta.id.substring(0, 8)}</strong>
                                                <p style={{margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-medium)'}}>
                                                    {new Date(venta.fecha_venta).toLocaleDateString()} • {formatCurrency(venta.total_venta)}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* PASO 3: SELECCIONAR PRODUCTOS DEVUELTOS */}
                    {pasoActual === PASOS.SELECCIONAR_DEVUELTOS && (
                        <div className="cd-modal-section">
                            <h3 className="cd-modal-section-title">3. Productos a Devolver</h3>
                            <p style={{marginBottom: 'var(--space-md)', color: 'var(--color-text-medium)'}}>
                                Venta: #{ventaSeleccionada?.numero_venta || ventaSeleccionada?.id.substring(0, 8)} • {formatCurrency(ventaSeleccionada?.total_venta)}
                            </p>

                            <div className="cd-productos-grid">
                                {productosVenta.map(pv => (
                                    <div key={pv.id} className={`cd-producto-item ${productosDevueltos[pv.id] ? 'cd-producto-item--selected' : ''}`}>
                                        <div className="cd-producto-info">
                                            <div className="cd-producto-nombre">{pv.producto?.nombre}</div>
                                            <div className="cd-producto-precio">
                                                {formatCurrency(pv.precio_unitario)} • Compró: {pv.cantidad} unidades
                                            </div>
                                        </div>
                                        <div className="cd-producto-cantidad">
                                            <label style={{fontSize: '0.875rem', color: 'var(--color-text-medium)'}}>
                                                Devuelve:
                                            </label>
                                            <input 
                                                type="number"
                                                min="1"
                                                max={pv.cantidad}
                                                placeholder="0"
                                                value={productosDevueltos[pv.id]?.cantidad || ''}
                                                onChange={(e) => handleCantidadDevuelto(pv.id, e.target.value)}
                                                className="cd-cantidad-input"
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p style={{marginTop: 'var(--space-md)', fontWeight: 600}}>
                                Total a devolver: {formatCurrency(valorDevolucion)}
                            </p>
                        </div>
                    )}

                    {/* PASO 4: SELECCIONAR PRODUCTOS NUEVOS */}
                    {pasoActual === PASOS.SELECCIONAR_NUEVOS && (
                        <div className="cd-modal-section">
                            <h3 className="cd-modal-section-title">4. Productos Nuevos a Entregar</h3>
                            
                            {/* Buscador de productos */}
                            <div className="cd-search-box" style={{marginBottom: 'var(--space-md)'}}>
                                <input 
                                    type="text"
                                    placeholder="Buscar producto por nombre..."
                                    value={filtroProductos}
                                    onChange={(e) => setFiltroProductos(e.target.value)}
                                    className="cd-search-input"
                                />
                            </div>
                            
                            <div className="cd-productos-grid" style={{maxHeight: '400px', overflowY: 'auto'}}>
                                {(() => {
                                    const productosFiltrados = productosDisponibles
                                        .filter(p => p.stock_actual > 0)
                                        .filter(p => 
                                            filtroProductos === '' || 
                                            p.nombre.toLowerCase().includes(filtroProductos.toLowerCase())
                                        );
                                    
                                    if (productosFiltrados.length === 0) {
                                        return (
                                            <p style={{textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-text-medium)'}}>
                                                {filtroProductos ? 'No se encontraron productos con ese nombre' : 'No hay productos disponibles con stock'}
                                            </p>
                                        );
                                    }
                                    
                                    return productosFiltrados.map(prod => (
                                        <div key={prod.id} className={`cd-producto-item ${productosNuevos[prod.id] ? 'cd-producto-item--selected' : ''}`}>
                                            <div className="cd-producto-info">
                                                <div className="cd-producto-nombre">{prod.nombre}</div>
                                                <div className="cd-producto-precio">
                                                    {formatCurrency(prod.precio_venta)} • Stock: {prod.stock_actual}
                                                </div>
                                            </div>
                                            <div className="cd-producto-cantidad">
                                                <label style={{fontSize: '0.875rem', color: 'var(--color-text-medium)'}}>
                                                    Cantidad:
                                                </label>
                                                <input 
                                                    type="number"
                                                    min="1"
                                                    max={prod.stock_actual}
                                                    placeholder="0"
                                                    value={productosNuevos[prod.id]?.cantidad || ''}
                                                    onChange={(e) => handleCantidadNuevo(prod.id, e.target.value)}
                                                    className="cd-cantidad-input"
                                                    onFocus={(e) => e.target.select()}
                                                />
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>

                            <p style={{marginTop: 'var(--space-md)', fontWeight: 600}}>
                                Total de productos nuevos: {formatCurrency(valorNuevos)}
                            </p>
                        </div>
                    )}

                    {/* PASO 5: CONFIRMAR CAMBIO */}
                    {pasoActual === PASOS.CONFIRMAR && (
                        <div className="cd-modal-section">
                            <h3 className="cd-modal-section-title">5. Confirmar Cambio</h3>

                            <div className="cd-resumen">
                                <div className="cd-resumen-row">
                                    <span className="cd-resumen-label">Productos Devueltos:</span>
                                    <span className="cd-resumen-value">
                                        {Object.values(productosDevueltos).length} producto(s)
                                    </span>
                                </div>
                                <div className="cd-resumen-row">
                                    <span className="cd-resumen-label">Valor Devolución:</span>
                                    <span className="cd-resumen-value">{formatCurrency(valorDevolucion)}</span>
                                </div>
                                <div className="cd-resumen-row">
                                    <span className="cd-resumen-label">Productos Nuevos:</span>
                                    <span className="cd-resumen-value">
                                        {Object.values(productosNuevos).length} producto(s)
                                    </span>
                                </div>
                                <div className="cd-resumen-row">
                                    <span className="cd-resumen-label">Valor Nuevos:</span>
                                    <span className="cd-resumen-value">{formatCurrency(valorNuevos)}</span>
                                </div>
                                <div className="cd-resumen-row">
                                    <span className="cd-resumen-label cd-resumen-total">Diferencia:</span>
                                    <span className={`cd-resumen-value cd-resumen-total ${
                                        diferencia > 0 ? 'cd-diferencia--positiva' : 
                                        diferencia < 0 ? 'cd-diferencia--negativa' : 
                                        'cd-diferencia--cero'
                                    }`}>
                                        {diferencia > 0 ? '+' : ''}{formatCurrency(diferencia)}
                                    </span>
                                </div>
                            </div>

                            {diferencia > 0 && (
                                <p style={{marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'rgba(46, 204, 113, 0.1)', borderRadius: 'var(--border-radius-sm)', color: 'var(--color-success)'}}>
                                    ✅ El cliente debe pagar: {formatCurrency(diferencia)}
                                </p>
                            )}

                            {diferencia < 0 && (
                                <p style={{marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'rgba(243, 156, 18, 0.1)', borderRadius: 'var(--border-radius-sm)', color: 'var(--color-warning)'}}>
                                    ⚠️ Se debe devolver al cliente: {formatCurrency(Math.abs(diferencia))}
                                </p>
                            )}

                            <div style={{marginTop: 'var(--space-lg)'}}>
                                <label style={{display: 'block', marginBottom: 'var(--space-sm)', fontWeight: 600}}>
                                    Motivo del Cambio(Opcional): <span style={{color: 'var(--color-danger)'}}>*</span>
                                </label>
                                <input 
                                    type="text"
                                    placeholder="Ej: Talla incorrecta, producto defectuoso..."
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-sm)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--border-radius-sm)',
                                        background: 'var(--color-surface-300)',
                                        color: 'var(--color-text-high)'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="cd-modal-footer">
                    {pasoActual > PASOS.BUSCAR_PRODUCTO && (
                        <button 
                            onClick={() => {
                                if (pasoActual === PASOS.SELECCIONAR_VENTA) {
                                    // Volver a buscar producto
                                    setProductoSeleccionado(null);
                                    setVentasDelProducto([]);
                                    setVentaSeleccionada(null);
                                }
                                setPasoActual(pasoActual - 1);
                            }}
                            className="cd-btn cd-btn--secondary"
                            disabled={loading}
                        >
                            ← Anterior
                        </button>
                    )}
                    
                    <button 
                        onClick={onClose}
                        className="cd-btn cd-btn--secondary"
                        disabled={loading}
                    >
                        Cancelar
                    </button>

                    {pasoActual < PASOS.CONFIRMAR ? (
                        <button 
                            onClick={() => {
                                if (pasoActual === PASOS.BUSCAR_PRODUCTO && !productoSeleccionado) {
                                    setError('Debes seleccionar un producto');
                                    return;
                                }
                                if (pasoActual === PASOS.SELECCIONAR_VENTA && !ventaSeleccionada) {
                                    setError('Debes seleccionar una venta');
                                    return;
                                }
                                if (pasoActual === PASOS.SELECCIONAR_DEVUELTOS && Object.keys(productosDevueltos).length === 0) {
                                    setError('Debes seleccionar al menos un producto a devolver');
                                    return;
                                }
                                setError(null);
                                setPasoActual(pasoActual + 1);
                            }}
                            className="cd-btn cd-btn--primary"
                            disabled={loading}
                        >
                            Siguiente →
                        </button>
                    ) : (
                        <button 
                            onClick={handleProcesarCambio}
                            className="cd-btn cd-btn--primary"
                            disabled={loading}
                        >
                            {loading ? 'Procesando...' : '✅ Confirmar Cambio'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProcesarCambioModal;