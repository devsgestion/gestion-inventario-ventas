// src/components/gastos/RegistrarGastoModal.jsx

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { formatCurrencyCOP } from '../../utils/formatters';
import '../../styles/Gastos.css';

// Definición de categorías de gastos con colores sutiles del sistema
export const CATEGORIAS_GASTOS = [
    { value: 'nomina', label: '💰 Nómina y Salarios', color: '#3498db' },      // brand
    { value: 'servicios', label: '💡 Servicios Públicos', color: '#2ecc71' },  // success
    { value: 'alquiler', label: '🏢 Alquiler y Arriendo', color: '#f39c12' },  // warning
    { value: 'insumos', label: '📦 Insumos y Materiales', color: '#9b59b6' },  // purple (suave)
    { value: 'empaque', label: '🛍️ Bolsas y Empaques', color: '#e67e22' },    // orange (suave)
    { value: 'transporte', label: '🚚 Transporte y Fletes', color: '#1abc9c' }, // turquoise
    { value: 'mantenimiento', label: '🔧 Mantenimiento', color: '#16a085' },   // green-blue
    { value: 'publicidad', label: '📢 Publicidad y Marketing', color: '#e74c3c' }, // danger
    { value: 'impuestos', label: '📋 Impuestos y Tasas', color: '#7F8C8D' },   // info
    { value: 'otros', label: '📌 Otros Gastos', color: '#95a5a6' }             // gray (suave)
];

// Componente para input de dinero con formato COP
const CurrencyInput = ({ field, placeholder, disabled, label }) => {
    const [displayValue, setDisplayValue] = useState(field.value ? formatCurrencyCOP(field.value) : '');

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
        const numericValue = field.value || '';
        setDisplayValue(numericValue.toString());
        e.target.select();
    };

    const handleBlur = (e) => {
        if (field.value) {
            setDisplayValue(formatCurrencyCOP(field.value));
        } else {
            field.onChange(0);
            setDisplayValue('');
        }
        field.onBlur(e);
    };

    return (
        <div className="gastos-form-group">
            <label className="gastos-form-label" htmlFor={field.name}>{label}</label>
            <input
                id={field.name}
                type="text"
                inputMode="numeric"
                placeholder={placeholder}
                disabled={disabled}
                className="gastos-form-input"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
            />
        </div>
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
    const metodoPago = watch('metodo_pago');

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
        <div className="gastos-modal-overlay">
            <div className="gastos-modal-content">
                <div className="gastos-modal-header">
                    <h2 className="gastos-modal-title">
                        <span>💸</span> Registrar Nuevo Gasto
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="gastos-modal-close-btn" 
                        disabled={isProcessing}
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>
                
                <div className="gastos-modal-body">
                    {error && (
                        <div className="gastos-alert gastos-alert-error">
                            ⚠️ {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="gastos-form-grid">
                            
                            {/* Concepto */}
                            <div className="gastos-form-group gastos-full-width">
                                <label className="gastos-form-label" htmlFor="concepto">
                                    Concepto del Gasto: <span className="required">*</span>
                                </label>
                                <input
                                    id="concepto"
                                    type="text"
                                    placeholder="Ej: Pago de empleado, Compra de bolsas"
                                    disabled={isProcessing}
                                    className="gastos-form-input"
                                    {...register("concepto", { 
                                        required: "El concepto es obligatorio",
                                        minLength: { value: 3, message: "Mínimo 3 caracteres" }
                                    })}
                                />
                                {errors.concepto && (
                                    <p className="gastos-form-error">{errors.concepto.message}</p>
                                )}
                            </div>

                            {/* Categoría */}
                            <div className="gastos-form-group">
                                <label className="gastos-form-label" htmlFor="categoria">
                                    Categoría: <span className="required">*</span>
                                </label>
                                <select
                                    id="categoria"
                                    disabled={isProcessing}
                                    className="gastos-form-select"
                                    {...register("categoria", { required: "La categoría es obligatoria" })}
                                >
                                    <option value="">Seleccionar categoría...</option>
                                    {CATEGORIAS_GASTOS.map(cat => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.categoria && (
                                    <p className="gastos-form-error">{errors.categoria.message}</p>
                                )}
                            </div>

                            {/* Monto */}
                            <Controller
                                name="monto"
                                control={control}
                                rules={{ 
                                    required: "El monto es obligatorio", 
                                    min: { value: 1, message: "El monto debe ser mayor a cero" } 
                                }}
                                render={({ field }) => (
                                    <CurrencyInput 
                                        field={field} 
                                        label={<>Monto: <span className="required">*</span></>}
                                        placeholder="$0"
                                        disabled={isProcessing}
                                    />
                                )}
                            />
                            {errors.monto && (
                                <p className="gastos-form-error">{errors.monto.message}</p>
                            )}

                            {/* Método de Pago */}
                            <div className="gastos-form-group">
                                <label className="gastos-form-label" htmlFor="metodo_pago">
                                    Método de Pago:
                                </label>
                                <select
                                    id="metodo_pago"
                                    disabled={isProcessing}
                                    className="gastos-form-select"
                                    {...register("metodo_pago")}
                                >
                                    <option value="efectivo">💵 Efectivo</option>
                                    <option value="transferencia">🏦 Transferencia</option>
                                    <option value="tarjeta">💳 Tarjeta</option>
                                </select>
                            </div>

                            {/* Fecha del Gasto */}
                            <div className="gastos-form-group">
                                <label className="gastos-form-label" htmlFor="fecha_gasto">
                                    Fecha del Gasto:
                                </label>
                                <input
                                    id="fecha_gasto"
                                    type="date"
                                    disabled={isProcessing}
                                    className="gastos-form-input"
                                    {...register("fecha_gasto")}
                                />
                            </div>

                            {/* Número de Factura */}
                            <div className="gastos-form-group">
                                <label className="gastos-form-label" htmlFor="numero_factura">
                                    Número de Factura:
                                </label>
                                <input
                                    id="numero_factura"
                                    type="text"
                                    placeholder="Ej: FAC-12345 (opcional)"
                                    disabled={isProcessing}
                                    className="gastos-form-input"
                                    {...register("numero_factura")}
                                />
                            </div>

                            {/* Proveedor */}
                            <div className="gastos-form-group">
                                <label className="gastos-form-label" htmlFor="proveedor">
                                    Proveedor/Destinatario:
                                </label>
                                <input
                                    id="proveedor"
                                    type="text"
                                    placeholder="Ej: Juan Pérez, Empresa XYZ"
                                    disabled={isProcessing}
                                    className="gastos-form-input"
                                    {...register("proveedor")}
                                />
                            </div>

                            {/* Descripción */}
                            <div className="gastos-form-group gastos-full-width">
                                <label className="gastos-form-label" htmlFor="descripcion">
                                    Descripción Adicional:
                                </label>
                                <textarea
                                    id="descripcion"
                                    placeholder="Información adicional sobre el gasto (opcional)"
                                    disabled={isProcessing}
                                    className="gastos-form-textarea"
                                    rows="3"
                                    {...register("descripcion")}
                                />
                            </div>
                        </div>

                        {/* Alerta de efectivo */}
                        {metodoPago === 'efectivo' && (
                            <div className="gastos-alert gastos-alert-info">
                                ℹ️ Este gasto se registrará como pago en efectivo (solo para control)
                            </div>
                        )}

                        <div className="gastos-modal-footer">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                disabled={isProcessing} 
                                className="btn btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={isProcessing} 
                                className="btn btn-primary btn-success"
                            >
                                {isProcessing ? '⏳ Guardando...' : '✅ Registrar Gasto'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegistrarGastoModal;
