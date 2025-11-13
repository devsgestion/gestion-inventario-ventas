// src/components/gastos/RegistrarGastoModal.jsx

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { formatCurrencyCOP } from '../../utils/formatters';
import '../../styles/Gastos.css';

// Definición de categorías de gastos con colores sutiles del sistema e iconos SVG
export const CATEGORIAS_GASTOS = [
    { 
        value: 'nomina', 
        label: '💰 Nómina y Salarios', 
        color: '#3498db',
        icon: 'salary'
    },
    { 
        value: 'servicios', 
        label: '💡 Servicios Públicos', 
        color: '#2ecc71',
        icon: 'utilities'
    },
    { 
        value: 'alquiler', 
        label: '🏢 Alquiler y Arriendo', 
        color: '#f39c12',
        icon: 'building'
    },
    { 
        value: 'insumos', 
        label: '📦 Insumos y Materiales', 
        color: '#9b59b6',
        icon: 'box'
    },
    { 
        value: 'empaque', 
        label: '🛍️ Bolsas y Empaques', 
        color: '#e67e22',
        icon: 'package'
    },
    { 
        value: 'transporte', 
        label: '🚚 Transporte y Fletes', 
        color: '#1abc9c',
        icon: 'truck'
    },
    { 
        value: 'mantenimiento', 
        label: '🔧 Mantenimiento', 
        color: '#16a085',
        icon: 'tools'
    },
    { 
        value: 'publicidad', 
        label: '📢 Publicidad y Marketing', 
        color: '#e74c3c',
        icon: 'megaphone'
    },
    { 
        value: 'impuestos', 
        label: '📋 Impuestos y Tasas', 
        color: '#7F8C8D',
        icon: 'document'
    },
    { 
        value: 'otros', 
        label: '📌 Otros Gastos', 
        color: '#95a5a6',
        icon: 'other'
    }
];

// Componente para input de dinero con formato COP mejorado
const CurrencyInput = ({ field, placeholder, disabled }) => {
    const [displayValue, setDisplayValue] = useState(field.value ? formatCurrencyCOP(field.value) : '');
    const [isFocused, setIsFocused] = useState(false);

    const handleChange = (e) => {
        const rawValue = e.target.value.replace(/[^\d]/g, '');
        const numericValue = rawValue ? parseInt(rawValue, 10) : 0;
        
        field.onChange(numericValue);
        
        if (rawValue) {
            setDisplayValue(formatCurrencyCOP(numericValue));
        } else {
            setDisplayValue('');
        }
    };
    
    const handleFocus = (e) => {
        setIsFocused(true);
        const numericValue = field.value || '';
        setDisplayValue(numericValue.toString());
        e.target.select();
    };

    const handleBlur = (e) => {
        setIsFocused(false);
        if (field.value) {
            setDisplayValue(formatCurrencyCOP(field.value));
        } else {
            field.onChange(0);
            setDisplayValue('');
        }
        field.onBlur(e);
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            placeholder={placeholder}
            disabled={disabled}
            className={`form-input-modern currency-input ${isFocused ? 'focused' : ''}`}
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
        />
    );
};

const RegistrarGastoModal = ({ onClose, onGastoRegistrado, isSubmitting: externalSubmitting }) => {
    const { control, register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            concepto: '',
            categoria: '',
            monto: 0,
            metodo_pago: 'efectivo',
            numero_factura: '',
            proveedor: '',
            descripcion: '',
            fecha_gasto: new Date().toISOString().split('T')[0]
        }
    });

    const [error, setError] = useState(null);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
    const metodoPago = watch('metodo_pago');
    const monto = watch('monto');

    const onSubmit = async (formData) => {
        setError(null);
        
        // Validación adicional
        if (!formData.concepto || formData.concepto.trim() === '') {
            setError('El concepto es obligatorio');
            return;
        }

        if (!formData.categoria) {
            setError('Debe seleccionar una categoría');
            return;
        }

        if (!formData.monto || formData.monto <= 0) {
            setError('El monto debe ser mayor a cero');
            return;
        }

        try {
            await onGastoRegistrado(formData);
            onClose();
        } catch (err) {
            setError(err.message || 'Error al registrar el gasto');
        }
    };

    const isProcessing = isSubmitting || externalSubmitting;

    return (
        <div className="gastos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="gastos-modal-content-modern">
                <div className="gastos-modal-header-modern">
                    <div className="gastos-modal-icon-wrapper">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <div className="gastos-modal-title-section">
                        <h2 className="gastos-modal-title">Registrar Nuevo Gasto</h2>
                        <p className="gastos-modal-subtitle">Completa la información del gasto</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="gastos-close-modal-btn" 
                        disabled={isProcessing}
                        type="button"
                        aria-label="Cerrar modal"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
                
                <div className="gastos-modal-body-modern">
                    {error && (
                        <div className="gastos-alert-modern error">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit(onSubmit)} className="gastos-form-modern">
                        {/* Selección Visual de Categoría */}
                        <div className="form-section">
                            <label className="form-label-modern">
                                Categoría del Gasto <span className="required">*</span>
                            </label>
                            <div className="categorias-grid-selector">
                                {CATEGORIAS_GASTOS.map(cat => (
                                    <label 
                                        key={cat.value}
                                        className={`categoria-option ${categoriaSeleccionada === cat.value ? 'selected' : ''}`}
                                        style={{
                                            '--cat-color': cat.color
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            value={cat.value}
                                            disabled={isProcessing}
                                            {...register("categoria", { 
                                                required: "La categoría es obligatoria",
                                                onChange: (e) => setCategoriaSeleccionada(e.target.value)
                                            })}
                                        />
                                        <div className="categoria-option-content">
                                            <div className="categoria-option-icon" style={{ backgroundColor: cat.color }}>
                                                {cat.label.split(' ')[0]}
                                            </div>
                                            <span className="categoria-option-text">
                                                {cat.label.substring(cat.label.indexOf(' ') + 1)}
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            {errors.categoria && (
                                <p className="form-error-modern">{errors.categoria.message}</p>
                            )}
                        </div>

                        {/* Concepto y Monto - Destacados */}
                        <div className="form-row">
                            <div className="form-group-modern full-width">
                                <label className="form-label-modern" htmlFor="concepto">
                                    Concepto del Gasto <span className="required">*</span>
                                </label>
                                <div className="input-with-icon">
                                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                                    </svg>
                                    <input
                                        id="concepto"
                                        type="text"
                                        placeholder="Ej: Pago de empleado, Compra de bolsas..."
                                        disabled={isProcessing}
                                        className="form-input-modern"
                                        {...register("concepto", { 
                                            required: "El concepto es obligatorio",
                                            minLength: { value: 3, message: "Mínimo 3 caracteres" }
                                        })}
                                    />
                                </div>
                                {errors.concepto && (
                                    <p className="form-error-modern">{errors.concepto.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group-modern">
                                <Controller
                                    name="monto"
                                    control={control}
                                    rules={{ 
                                        required: "El monto es obligatorio", 
                                        min: { value: 1, message: "El monto debe ser mayor a cero" } 
                                    }}
                                    render={({ field }) => (
                                        <div>
                                            <label className="form-label-modern" htmlFor="monto">
                                                Monto <span className="required">*</span>
                                            </label>
                                            <div className="input-with-icon">
                                                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                                                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2"/>
                                                </svg>
                                                <CurrencyInput 
                                                    field={field} 
                                                    placeholder="$0"
                                                    disabled={isProcessing}
                                                />
                                            </div>
                                        </div>
                                    )}
                                />
                                {errors.monto && (
                                    <p className="form-error-modern">{errors.monto.message}</p>
                                )}
                                {monto > 0 && (
                                    <span className="input-hint success">
                                        ✓ Monto válido
                                    </span>
                                )}
                            </div>

                            <div className="form-group-modern">
                                <label className="form-label-modern" htmlFor="fecha_gasto">
                                    Fecha del Gasto
                                </label>
                                <div className="input-with-icon">
                                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                    <input
                                        id="fecha_gasto"
                                        type="date"
                                        disabled={isProcessing}
                                        className="form-input-modern"
                                        {...register("fecha_gasto")}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Método de Pago - Selector Visual */}
                        <div className="form-section">
                            <label className="form-label-modern">Método de Pago</label>
                            <div className="metodo-pago-grid">
                                <label className={`metodo-option ${metodoPago === 'efectivo' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        value="efectivo"
                                        disabled={isProcessing}
                                        {...register("metodo_pago")}
                                    />
                                    <div className="metodo-content">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                                            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                        <span>Efectivo</span>
                                    </div>
                                </label>
                                <label className={`metodo-option ${metodoPago === 'transferencia' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        value="transferencia"
                                        disabled={isProcessing}
                                        {...register("metodo_pago")}
                                    />
                                    <div className="metodo-content">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 3h18v8H3V3ZM3 13h18v8H3v-8Z" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                        <span>Transferencia</span>
                                    </div>
                                </label>
                                <label className={`metodo-option ${metodoPago === 'tarjeta' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        value="tarjeta"
                                        disabled={isProcessing}
                                        {...register("metodo_pago")}
                                    />
                                    <div className="metodo-content">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                                            <path d="M1 10h22" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                        <span>Tarjeta</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Información Adicional */}
                        <div className="form-section">
                            <div className="section-title-small">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                Información Adicional (Opcional)
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group-modern">
                                <label className="form-label-modern" htmlFor="proveedor">
                                    Proveedor/Destinatario
                                </label>
                                <div className="input-with-icon">
                                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2"/>
                                    </svg>
                                    <input
                                        id="proveedor"
                                        type="text"
                                        placeholder="Nombre del proveedor"
                                        disabled={isProcessing}
                                        className="form-input-modern"
                                        {...register("proveedor")}
                                    />
                                </div>
                            </div>

                            <div className="form-group-modern">
                                <label className="form-label-modern" htmlFor="numero_factura">
                                    Número de Factura
                                </label>
                                <div className="input-with-icon">
                                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                    <input
                                        id="numero_factura"
                                        type="text"
                                        placeholder="FAC-12345"
                                        disabled={isProcessing}
                                        className="form-input-modern"
                                        {...register("numero_factura")}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group-modern full-width">
                            <label className="form-label-modern" htmlFor="descripcion">
                                Descripción Adicional
                            </label>
                            <textarea
                                id="descripcion"
                                placeholder="Agrega cualquier detalle relevante sobre este gasto..."
                                disabled={isProcessing}
                                className="form-textarea-modern"
                                rows="3"
                                {...register("descripcion")}
                            />
                        </div>

                        {metodoPago === 'efectivo' && (
                            <div className="gastos-alert-modern info">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                Este gasto se registrará como pago en efectivo (solo para control)
                            </div>
                        )}

                        <div className="gastos-modal-footer-modern">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                disabled={isProcessing} 
                                className="btn-secondary-modern"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={isProcessing} 
                                className="btn-primary-modern"
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="spinner-small" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Registrar Gasto
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegistrarGastoModal;
