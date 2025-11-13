// src/pages/GastosPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import usePermissions from '../hooks/usePermissions';
import useGastos from '../hooks/useGastos';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/common/Toast';
import ConfirmModal from '../components/common/ConfirmModal';
import RegistrarGastoModal, { CATEGORIAS_GASTOS } from '../components/gastos/RegistrarGastoModal';
import { formatCurrencyCOP } from '../utils/formatters';
import '../styles/Gastos.css';

const GastosPage = () => {
    const { perfil, isLoading: isAuthLoading } = useAuth();
    const permissions = usePermissions();
    const navigate = useNavigate();
    const empresaId = perfil?.empresa_id;

    const {
        gastos,
        loading,
        obtenerGastos,
        obtenerGastosPorFecha,
        registrarGasto,
        anularGasto,
        obtenerResumenPorCategoria,
        obtenerTotalGastos
    } = useGastos(empresaId);

    const { toasts, showToast, removeToast } = useToast();

    const [showRegistrarModal, setShowRegistrarModal] = useState(false);
    const [showAnularModal, setShowAnularModal] = useState(false);
    const [gastoToAnular, setGastoToAnular] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const [filtroCategoria, setFiltroCategoria] = useState('todas');
    const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0]);
    const [resumenCategorias, setResumenCategorias] = useState({});
    const [totalGastos, setTotalGastos] = useState(0);
    const [vistaActual, setVistaActual] = useState('cards'); // 'cards' o 'tabla'
    const [busqueda, setBusqueda] = useState('');

    // Verificar permisos
    useEffect(() => {
        if (perfil && !permissions.canViewExpenses) {
            showToast('Acceso denegado: No tienes permisos para ver gastos', 'error', 5000);
            navigate('/ventas');
        }
    }, [perfil, permissions, navigate, showToast]);

    // Cargar gastos iniciales
    useEffect(() => {
        if (empresaId) {
            cargarDatos();
        }
    }, [empresaId, filtroFecha]);

    const cargarDatos = async () => {
        await obtenerGastosPorFecha(filtroFecha);
        const resumen = await obtenerResumenPorCategoria(filtroFecha);
        setResumenCategorias(resumen);
        const total = await obtenerTotalGastos(filtroFecha);
        setTotalGastos(total);
    };

    const handleRegistrarGasto = async (gastoData) => {
        setProcesando(true);
        try {
            const result = await registrarGasto(gastoData);
            
            if (result.success) {
                showToast('Gasto registrado exitosamente', 'success');
                setShowRegistrarModal(false);
                await cargarDatos();
            } else {
                showToast(result.message || 'Error al registrar el gasto', 'error');
            }
        } catch (error) {
            showToast(error.message || 'Error al registrar el gasto', 'error');
        } finally {
            setProcesando(false);
        }
    };

    const handleOpenAnularModal = (gasto) => {
        setGastoToAnular(gasto);
        setShowAnularModal(true);
    };

    const handleConfirmAnular = async (motivo) => {
        if (!gastoToAnular) return;

        setProcesando(true);
        try {
            const result = await anularGasto(gastoToAnular.id, motivo);
            
            if (result.success) {
                showToast('Gasto anulado exitosamente', 'success');
                setShowAnularModal(false);
                setGastoToAnular(null);
                await cargarDatos();
            } else {
                showToast(result.message || 'Error al anular el gasto', 'error');
            }
        } catch (error) {
            showToast(error.message || 'Error al anular el gasto', 'error');
        } finally {
            setProcesando(false);
        }
    };

    // Filtrado mejorado con búsqueda
    const gastosFiltrados = gastos.filter(gasto => {
        // Filtro de categoría
        if (filtroCategoria !== 'todas' && gasto.categoria !== filtroCategoria) {
            return false;
        }
        
        // Filtro de búsqueda
        if (busqueda) {
            const searchLower = busqueda.toLowerCase();
            return (
                gasto.concepto?.toLowerCase().includes(searchLower) ||
                gasto.proveedor?.toLowerCase().includes(searchLower) ||
                gasto.descripcion?.toLowerCase().includes(searchLower) ||
                gasto.numero_factura?.toLowerCase().includes(searchLower)
            );
        }
        
        return true;
    });

    const getCategoriaInfo = (categoriaValue) => {
        return CATEGORIAS_GASTOS.find(cat => cat.value === categoriaValue) || 
               { label: categoriaValue, color: '#6b7280' };
    };

    const formatFecha = (fecha) => {
        const date = new Date(fecha + 'T00:00:00');
        return date.toLocaleDateString('es-CO', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    };

    const formatHora = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-CO', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    if (isAuthLoading || !perfil) {
        return <div className="loading-spinner">Cargando...</div>;
    }

    return (
        <div className="gastos-page">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header Moderno */}
            <div className="gastos-header-modern">
                <div className="gastos-header-content">
                    <div className="gastos-header-icon">💸</div>
                    <div className="gastos-header-text">
                        <h1>Gestión de Gastos</h1>
                        <p className="gastos-subtitle">Control total de los gastos operacionales de tu empresa</p>
                    </div>
                </div>
                {permissions.canRegisterExpenses && (
                    <button 
                        className="btn btn-primary gastos-btn-nuevo-modern"
                        onClick={() => setShowRegistrarModal(true)}
                        disabled={loading || procesando}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Registrar Gasto
                    </button>
                )}
            </div>

            {/* Resumen Dashboard Mejorado */}
            <div className="gastos-dashboard-resumen">
                <div className="gastos-stats-card total-card">
                    <div className="stats-icon total-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <div className="stats-content">
                        <span className="stats-label">Total de Gastos</span>
                        <h2 className="stats-value">{formatCurrencyCOP(totalGastos)}</h2>
                        <span className="stats-date">{formatFecha(filtroFecha)}</span>
                    </div>
                </div>

                <div className="gastos-stats-card">
                    <div className="stats-icon count-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                            <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                    </div>
                    <div className="stats-content">
                        <span className="stats-label">Cantidad de Gastos</span>
                        <h2 className="stats-value">{gastosFiltrados.length}</h2>
                        <span className="stats-sublabel">{gastosFiltrados.length === 1 ? 'registro' : 'registros'}</span>
                    </div>
                </div>

                <div className="gastos-stats-card">
                    <div className="stats-icon category-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                    </div>
                    <div className="stats-content">
                        <span className="stats-label">Categorías Activas</span>
                        <h2 className="stats-value">{Object.keys(resumenCategorias).length}</h2>
                        <span className="stats-sublabel">del total de {CATEGORIAS_GASTOS.length}</span>
                    </div>
                </div>
            </div>

            {/* Filtros Mejorados */}
            <div className="gastos-filtros-modern">
                <div className="filtros-left">
                    <div className="filtro-search">
                        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar por concepto, proveedor, factura..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="search-input"
                        />
                        {busqueda && (
                            <button 
                                className="clear-search"
                                onClick={() => setBusqueda('')}
                                aria-label="Limpiar búsqueda"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="filtro-wrapper">
                        <svg className="filtro-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <select
                            value={filtroCategoria}
                            onChange={(e) => setFiltroCategoria(e.target.value)}
                            className="filtro-select-modern"
                        >
                            <option value="todas">Todas las categorías</option>
                            {CATEGORIAS_GASTOS.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filtro-wrapper">
                        <svg className="filtro-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <input
                            type="date"
                            value={filtroFecha}
                            onChange={(e) => setFiltroFecha(e.target.value)}
                            className="filtro-date-modern"
                        />
                    </div>
                </div>

                <div className="filtros-right">
                    <div className="vista-toggle">
                        <button 
                            className={`vista-btn ${vistaActual === 'cards' ? 'active' : ''}`}
                            onClick={() => setVistaActual('cards')}
                            aria-label="Vista de tarjetas"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                        </button>
                        <button 
                            className={`vista-btn ${vistaActual === 'tabla' ? 'active' : ''}`}
                            onClick={() => setVistaActual('tabla')}
                            aria-label="Vista de tabla"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </button>
                    </div>

                    <button 
                        className="btn-icon-modern"
                        onClick={cargarDatos}
                        disabled={loading}
                        title="Actualizar datos"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Resumen por Categoría Mejorado */}
            {Object.keys(resumenCategorias).length > 0 && (
                <div className="gastos-categorias-section">
                    <div className="section-header">
                        <h3>� Distribución por Categoría</h3>
                        <span className="section-count">{Object.keys(resumenCategorias).length} categorías</span>
                    </div>
                    <div className="gastos-categorias-grid-modern">
                        {Object.entries(resumenCategorias)
                            .sort((a, b) => b[1].total - a[1].total)
                            .map(([categoria, datos]) => {
                            const catInfo = getCategoriaInfo(categoria);
                            const porcentaje = ((datos.total / totalGastos) * 100).toFixed(1);
                            return (
                                <div 
                                    key={categoria} 
                                    className="categoria-card-modern"
                                >
                                    <div className="categoria-header-modern">
                                        <div 
                                            className="categoria-badge-modern"
                                            style={{ backgroundColor: catInfo.color }}
                                        >
                                            {catInfo.label.split(' ')[0]}
                                        </div>
                                        <span className="categoria-porcentaje">{porcentaje}%</span>
                                    </div>
                                    <h4 className="categoria-nombre-modern">{catInfo.label.substring(catInfo.label.indexOf(' ') + 1)}</h4>
                                    <div className="categoria-stats">
                                        <span className="categoria-total-modern">{formatCurrencyCOP(datos.total)}</span>
                                        <span className="categoria-cantidad-modern">
                                            {datos.cantidad} {datos.cantidad === 1 ? 'gasto' : 'gastos'}
                                        </span>
                                    </div>
                                    <div className="categoria-progress-bar">
                                        <div 
                                            className="categoria-progress-fill"
                                            style={{ 
                                                width: `${porcentaje}%`,
                                                backgroundColor: catInfo.color 
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Lista de Gastos Mejorada */}
            <div className="gastos-content-section">
                <div className="section-header">
                    <h3>📋 Listado de Gastos</h3>
                    <div className="section-info">
                        {busqueda && (
                            <span className="results-info">
                                {gastosFiltrados.length} {gastosFiltrados.length === 1 ? 'resultado' : 'resultados'}
                            </span>
                        )}
                    </div>
                </div>
                
                {loading ? (
                    <div className="gastos-loading-modern">
                        <div className="spinner-modern"></div>
                        <p>Cargando gastos...</p>
                    </div>
                ) : gastosFiltrados.length === 0 ? (
                    <div className="gastos-empty-modern">
                        <div className="empty-icon">
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 11H3v10h6V11ZM21 11h-6v10h6V11ZM15 3H9v6h6V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h3>No hay gastos registrados</h3>
                        <p>
                            {busqueda 
                                ? 'No se encontraron gastos que coincidan con tu búsqueda'
                                : 'Comienza registrando tu primer gasto para esta fecha y categoría'
                            }
                        </p>
                        {permissions.canRegisterExpenses && !busqueda && (
                            <button 
                                className="btn btn-primary"
                                onClick={() => setShowRegistrarModal(true)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                Registrar Primer Gasto
                            </button>
                        )}
                    </div>
                ) : vistaActual === 'cards' ? (
                    <div className="gastos-grid-modern">
                        {gastosFiltrados.map(gasto => {
                            const catInfo = getCategoriaInfo(gasto.categoria);
                            const usuarioNombre = gasto.usuario?.nombre_completo || gasto.usuario?.nombre || 'Usuario';
                            
                            return (
                                <div 
                                    key={gasto.id} 
                                    className={`gasto-card-modern ${gasto.anulado ? 'gasto-anulado' : ''}`}
                                >
                                    <div className="gasto-card-header-modern">
                                        <div 
                                            className="gasto-categoria-tag"
                                            style={{ backgroundColor: catInfo.color }}
                                        >
                                            {catInfo.label.split(' ')[0]}
                                        </div>
                                        <span className="gasto-monto-modern">
                                            {formatCurrencyCOP(gasto.monto)}
                                        </span>
                                    </div>

                                    <div className="gasto-card-body-modern">
                                        <h4 className="gasto-concepto-modern">{gasto.concepto}</h4>
                                        
                                        {/* Fecha del gasto - Destacada */}
                                        <div className="gasto-detail-row gasto-fecha-destacada">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                                                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            </svg>
                                            <span><strong>Fecha:</strong> {formatFecha(gasto.fecha_gasto || filtroFecha)}</span>
                                        </div>
                                        
                                        {gasto.proveedor && (
                                            <div className="gasto-detail-row">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2"/>
                                                    <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2"/>
                                                </svg>
                                                <span>{gasto.proveedor}</span>
                                            </div>
                                        )}
                                        
                                        {gasto.descripcion && (
                                            <p className="gasto-descripcion-modern">{gasto.descripcion}</p>
                                        )}
                                        
                                        {gasto.numero_factura && (
                                            <div className="gasto-detail-row">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                                                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                                <span>Factura: {gasto.numero_factura}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="gasto-card-footer-modern">
                                        <div className="gasto-meta-modern">
                                            <span className="gasto-metodo-pago-modern">
                                                {gasto.metodo_pago === 'efectivo' && (
                                                    <>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                                                            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2"/>
                                                        </svg>
                                                        Efectivo
                                                    </>
                                                )}
                                                {gasto.metodo_pago === 'transferencia' && (
                                                    <>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M3 3h18v8H3V3ZM3 13h18v8H3v-8Z" stroke="currentColor" strokeWidth="2"/>
                                                        </svg>
                                                        Transferencia
                                                    </>
                                                )}
                                                {gasto.metodo_pago === 'tarjeta' && (
                                                    <>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                                                            <path d="M1 10h22" stroke="currentColor" strokeWidth="2"/>
                                                        </svg>
                                                        Tarjeta
                                                    </>
                                                )}
                                            </span>
                                            <span className="gasto-fecha-hora-modern">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                                {formatHora(gasto.created_at)}
                                            </span>
                                            <span className="gasto-usuario-modern">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                                                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                                                </svg>
                                                {usuarioNombre}
                                            </span>
                                        </div>

                                        {!gasto.anulado && permissions.canCancelExpenses && (
                                            <button 
                                                className="gasto-btn-anular-modern"
                                                onClick={() => handleOpenAnularModal(gasto)}
                                                disabled={procesando}
                                                title="Anular gasto"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                            </button>
                                        )}

                                        {gasto.anulado && (
                                            <div className="gasto-anulado-badge-modern">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                                    <path d="m15 9-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                                Anulado
                                                <span className="anulado-motivo-tooltip">{gasto.motivo_anulacion}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // Vista de Tabla
                    <div className="gastos-table-container">
                        <table className="gastos-table-modern">
                            <thead>
                                <tr>
                                    <th>Concepto</th>
                                    <th>Categoría</th>
                                    <th>Monto</th>
                                    <th>Método</th>
                                    <th>Proveedor</th>
                                    <th>Fecha/Hora</th>
                                    <th>Usuario</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gastosFiltrados.map(gasto => {
                                    const catInfo = getCategoriaInfo(gasto.categoria);
                                    const usuarioNombre = gasto.usuario?.nombre_completo || gasto.usuario?.nombre || 'Usuario';
                                    
                                    return (
                                        <tr key={gasto.id} className={gasto.anulado ? 'row-anulado' : ''}>
                                            <td>
                                                <div className="table-concepto">
                                                    <strong>{gasto.concepto}</strong>
                                                    {gasto.descripcion && (
                                                        <small>{gasto.descripcion}</small>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span 
                                                    className="table-categoria-badge"
                                                    style={{ backgroundColor: catInfo.color }}
                                                >
                                                    {catInfo.label}
                                                </span>
                                            </td>
                                            <td className="table-monto">{formatCurrencyCOP(gasto.monto)}</td>
                                            <td className="table-metodo">{gasto.metodo_pago}</td>
                                            <td>{gasto.proveedor || '-'}</td>
                                            <td className="table-fecha">
                                                {formatFecha(gasto.fecha_gasto || filtroFecha)}
                                                <small>{formatHora(gasto.created_at)}</small>
                                            </td>
                                            <td>{usuarioNombre}</td>
                                            <td>
                                                {!gasto.anulado && permissions.canCancelExpenses ? (
                                                    <button 
                                                        className="table-btn-anular"
                                                        onClick={() => handleOpenAnularModal(gasto)}
                                                        disabled={procesando}
                                                    >
                                                        Anular
                                                    </button>
                                                ) : gasto.anulado ? (
                                                    <span className="table-anulado-text">Anulado</span>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Registrar Gasto */}
            {showRegistrarModal && (
                <RegistrarGastoModal
                    onClose={() => setShowRegistrarModal(false)}
                    onGastoRegistrado={handleRegistrarGasto}
                    isSubmitting={procesando}
                />
            )}

            {/* Modal Anular Gasto */}
            {showAnularModal && gastoToAnular && (
                <ConfirmModal
                    title="Anular Gasto"
                    message={`¿Está seguro de anular este gasto?\n\nConcepto: ${gastoToAnular.concepto}\nMonto: ${formatCurrencyCOP(gastoToAnular.monto)}\n\nEsto solo marcará el gasto como anulado en los registros.`}
                    onConfirm={handleConfirmAnular}
                    onCancel={() => {
                        setShowAnularModal(false);
                        setGastoToAnular(null);
                    }}
                    confirmText="Sí, Anular"
                    cancelText="Cancelar"
                    requireMotivo={true}
                    motivoLabel="Motivo de la anulación"
                    isProcessing={procesando}
                />
            )}
        </div>
    );
};

export default GastosPage;
