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

    const gastosFiltrados = gastos.filter(gasto => {
        if (filtroCategoria === 'todas') return true;
        return gasto.categoria === filtroCategoria;
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

            {/* Header */}
            <div className="gastos-header">
                <div className="gastos-header-title">
                    <h1>💸 Gastos Varios</h1>
                    <p className="gastos-subtitle">Control de gastos operacionales del negocio</p>
                </div>
                {permissions.canRegisterExpenses && (
                    <button 
                        className="btn btn-primary gastos-btn-nuevo"
                        onClick={() => setShowRegistrarModal(true)}
                        disabled={loading || procesando}
                    >
                        <span>➕</span> Registrar Gasto
                    </button>
                )}
            </div>

            {/* Filtros */}
            <div className="gastos-filtros">
                <div className="gastos-filtro-grupo">
                    <label htmlFor="filtro-fecha">📅 Fecha:</label>
                    <input
                        id="filtro-fecha"
                        type="date"
                        value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                        className="gastos-filtro-input"
                    />
                </div>
                
                <div className="gastos-filtro-grupo">
                    <label htmlFor="filtro-categoria">🏷️ Categoría:</label>
                    <select
                        id="filtro-categoria"
                        value={filtroCategoria}
                        onChange={(e) => setFiltroCategoria(e.target.value)}
                        className="gastos-filtro-select"
                    >
                        <option value="todas">Todas las categorías</option>
                        {CATEGORIAS_GASTOS.map(cat => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>

                <button 
                    className="btn btn-secondary gastos-btn-actualizar"
                    onClick={cargarDatos}
                    disabled={loading}
                >
                    🔄 Actualizar
                </button>
            </div>

            {/* Resumen */}
            <div className="gastos-resumen">
                <div className="gastos-resumen-card gastos-resumen-total">
                    <div className="gastos-resumen-icon">💰</div>
                    <div className="gastos-resumen-info">
                        <h3>Total Gastos</h3>
                        <p className="gastos-resumen-valor">{formatCurrencyCOP(totalGastos)}</p>
                    </div>
                </div>

                <div className="gastos-resumen-card">
                    <div className="gastos-resumen-icon">📊</div>
                    <div className="gastos-resumen-info">
                        <h3>Cantidad de Gastos</h3>
                        <p className="gastos-resumen-valor">{gastosFiltrados.length}</p>
                    </div>
                </div>

                <div className="gastos-resumen-card">
                    <div className="gastos-resumen-icon">📅</div>
                    <div className="gastos-resumen-info">
                        <h3>Fecha Seleccionada</h3>
                        <p className="gastos-resumen-valor">{formatFecha(filtroFecha)}</p>
                    </div>
                </div>
            </div>

            {/* Resumen por Categoría */}
            {Object.keys(resumenCategorias).length > 0 && (
                <div className="gastos-categorias-resumen">
                    <h3>📈 Resumen por Categoría</h3>
                    <div className="gastos-categorias-grid">
                        {Object.entries(resumenCategorias).map(([categoria, datos]) => {
                            const catInfo = getCategoriaInfo(categoria);
                            return (
                                <div 
                                    key={categoria} 
                                    className="gastos-categoria-card"
                                    style={{ borderLeft: `4px solid ${catInfo.color}` }}
                                >
                                    <div className="gastos-categoria-header">
                                        <span className="gastos-categoria-nombre">{catInfo.label}</span>
                                        <span className="gastos-categoria-cantidad">
                                            {datos.cantidad} {datos.cantidad === 1 ? 'gasto' : 'gastos'}
                                        </span>
                                    </div>
                                    <div className="gastos-categoria-total">
                                        {formatCurrencyCOP(datos.total)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Lista de Gastos */}
            <div className="gastos-lista-container">
                <h3>📋 Listado de Gastos</h3>
                
                {loading ? (
                    <div className="gastos-loading">
                        <div className="spinner"></div>
                        <p>Cargando gastos...</p>
                    </div>
                ) : gastosFiltrados.length === 0 ? (
                    <div className="gastos-empty">
                        <span className="gastos-empty-icon">📭</span>
                        <p>No hay gastos registrados para esta fecha y categoría</p>
                        {permissions.canRegisterExpenses && (
                            <button 
                                className="btn btn-primary"
                                onClick={() => setShowRegistrarModal(true)}
                            >
                                Registrar Primer Gasto
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="gastos-lista">
                        {gastosFiltrados.map(gasto => {
                            const catInfo = getCategoriaInfo(gasto.categoria);
                            const usuarioNombre = gasto.usuario?.nombre_completo || gasto.usuario?.nombre || 'Usuario';
                            
                            return (
                                <div 
                                    key={gasto.id} 
                                    className={`gasto-card ${gasto.anulado ? 'gasto-anulado' : ''}`}
                                    style={{ borderLeft: `4px solid ${catInfo.color}` }}
                                >
                                    <div className="gasto-card-header">
                                        <span 
                                            className="gasto-categoria-badge"
                                            style={{ backgroundColor: catInfo.color }}
                                        >
                                            {catInfo.label}
                                        </span>
                                        <span className="gasto-monto">
                                            {formatCurrencyCOP(gasto.monto)}
                                        </span>
                                    </div>

                                    <div className="gasto-card-body">
                                        <h4 className="gasto-concepto">{gasto.concepto}</h4>
                                        
                                        {gasto.proveedor && (
                                            <p className="gasto-proveedor">
                                                <span>🏪</span> {gasto.proveedor}
                                            </p>
                                        )}
                                        
                                        {gasto.descripcion && (
                                            <p className="gasto-descripcion">{gasto.descripcion}</p>
                                        )}
                                        
                                        {gasto.numero_factura && (
                                            <p className="gasto-factura">
                                                <span>📄</span> Factura: {gasto.numero_factura}
                                            </p>
                                        )}
                                    </div>

                                    <div className="gasto-card-footer">
                                        <div className="gasto-meta">
                                            <span className="gasto-metodo-pago">
                                                {gasto.metodo_pago === 'efectivo' && '💵 Efectivo'}
                                                {gasto.metodo_pago === 'transferencia' && '🏦 Transferencia'}
                                                {gasto.metodo_pago === 'tarjeta' && '💳 Tarjeta'}
                                            </span>
                                            <span className="gasto-fecha-hora">
                                                🕐 {formatHora(gasto.created_at)}
                                            </span>
                                            <span className="gasto-usuario">
                                                👤 {usuarioNombre}
                                            </span>
                                        </div>

                                        {!gasto.anulado && permissions.canCancelExpenses && (
                                            <button 
                                                className="btn btn-danger btn-sm gasto-btn-anular"
                                                onClick={() => handleOpenAnularModal(gasto)}
                                                disabled={procesando}
                                            >
                                                🗑️ Anular
                                            </button>
                                        )}

                                        {gasto.anulado && (
                                            <div className="gasto-anulado-info">
                                                <span className="gasto-anulado-badge">❌ ANULADO</span>
                                                <p className="gasto-anulado-motivo">
                                                    Motivo: {gasto.motivo_anulacion}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
