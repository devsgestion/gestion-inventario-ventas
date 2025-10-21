import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient'; 
import { formatCurrencyCOP } from '../../utils/formatters';
// 🛑 CRÍTICO: Importar estilos base y específicos 🛑
import '../../styles/inventario.css';
import './RegistroCompraForm.css';

const RegistroCompraForm = ({ empresaId, productoInicial, onClose, onCompraRegistrada }) => {
    const [producto, setProducto] = useState(productoInicial);
    const [compraData, setCompraData] = useState({
        cantidad: 1,
        nuevoCostoUnitario: productoInicial ? productoInicial.precio_costo : 0, 
    });
    const [loading, setLoading] = useState(false);
    // 🛑 NUEVOS ESTADOS PARA CONFIRMACIÓN Y ÉXITO 🛑
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [nuevoCPP, setNuevoCPP] = useState(0);

    // Si tu formulario es muy complejo y necesitas buscar el producto:
    const handleProductSelected = (selectedProduct) => {
        setProducto(selectedProduct);
        setCompraData(prev => ({ 
            ...prev, 
            nuevoCostoUnitario: selectedProduct.precio_costo 
        }));
    };
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCompraData({ ...compraData, [name]: parseFloat(value) });
    };

    // 🛑 NUEVA FUNCIÓN: Mostrar confirmación antes de guardar 🛑
    const handleConfirmSave = () => {
        if (!producto || compraData.cantidad <= 0 || compraData.nuevoCostoUnitario < 0) {
            alert("Por favor, selecciona un producto, la cantidad debe ser positiva y el costo no puede ser negativo.");
            return;
        }
        setShowConfirmModal(true);
    };

    // 🛑 FUNCIÓN MODIFICADA: Guardar después de confirmación 🛑
    const confirmarGuardarCompra = async () => {
        setShowConfirmModal(false);
        setLoading(true);

        // 🛑 LLAMADA A LA RPC: Se envían los datos para que el backend calcule el CPP 🛑
        const { data, error } = await supabase.rpc('registrar_compra', {
            p_empresa_id: empresaId,
            p_producto_id: producto.id,
            p_cantidad_ingreso: compraData.cantidad,
            p_costo_compra: compraData.nuevoCostoUnitario, 
        });
        
        setLoading(false);

        if (error) {
            alert('❌ Error al registrar la compra: ' + error.message);
            console.error(error);
        } else {
            // 🛑 MOSTRAR TOAST DE ÉXITO EN LUGAR DE ALERT 🛑
            setNuevoCPP(data.nuevo_cpp);
            setShowSuccessToast(true);
            
            setTimeout(() => {
                setShowSuccessToast(false);
                onCompraRegistrada();
                onClose();
            }, 2500);
        }
    };

    // --- Renderizado del Modal ---
    return (
        <div className="c-modal-overlay">
            <div className="c-modal-content c-modal-content--compra">
                <div className="c-compra-header">
                    <h3>📥 Registro de Ingreso de Stock</h3>
                </div>
                
                {producto && (
                    <div className="c-producto-info">
                        <div className="c-producto-info__title">
                            {producto.nombre}
                        </div>
                        <div className="c-producto-info__details">
                            <div className="c-producto-info__detail">
                                <span className="c-producto-info__label">Stock Actual:</span>
                                <span className="c-producto-info__value">{producto.stock_actual} unidades</span>
                            </div>
                            <div className="c-producto-info__detail">
                                <span className="c-producto-info__label">CPP Actual:</span>
                                <span className="c-producto-info__value">{formatCurrencyCOP(producto.precio_costo)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {!producto && (
                    <p className="c-form-message c-form-message--help u-mb-lg">
                        Por favor, busca y selecciona el producto a ingresar.
                    </p>
                )}

                {producto && (
                    <div className="c-compra-form">
                        <div className="c-compra-form__group">
                            <label htmlFor="cantidad" className="c-compra-form__label c-compra-form__label--required">
                                Cantidad de Unidades Compradas
                            </label>
                            <input
                                type="number"
                                id="cantidad"
                                name="cantidad"
                                value={compraData.cantidad}
                                onChange={handleChange}
                                min="1"
                                required
                                className="c-compra-form__input"
                                placeholder="Ingresa la cantidad comprada"
                            />
                        </div>

                        <div className="c-compra-form__group">
                            <label htmlFor="nuevoCostoUnitario" className="c-compra-form__label c-compra-form__label--required">
                                Costo Unitario de ESTA Compra (Factura)
                            </label>
                            <input
                                type="number"
                                id="nuevoCostoUnitario"
                                name="nuevoCostoUnitario"
                                value={compraData.nuevoCostoUnitario}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                required
                                className="c-compra-form__input"
                                placeholder="0.00"
                            />
                            <p className="c-compra-form__help">
                                El Costo Promedio Ponderado se calculará automáticamente.
                            </p>
                        </div>
                    </div>
                )}
                
                <div className="c-compra-footer">
                    <div className="c-compra-footer__actions">
                        <button onClick={onClose} className="btn btn--compra-cancelar">
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirmSave}
                            disabled={loading || !producto} 
                            className={`btn btn--compra-guardar ${loading ? 'btn--compra-guardar--loading' : ''}`}
                        >
                            {loading ? 'Procesando...' : 'Guardar Compra'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 🛑 MODAL DE CONFIRMACIÓN 🛑 */}
            {showConfirmModal && (
                <div className="c-modal-overlay c-modal-overlay--secondary">
                    <div className="c-modal-content c-modal-content--confirm">
                        <div className="c-modal-header">
                            <h3 className="c-modal-title">¿Confirmar registro de compra?</h3>
                        </div>
                        <div className="c-modal-body">
                            <div className="c-compra-confirm-details">
                                <p><strong>Producto:</strong> {producto.nombre}</p>
                                <p><strong>Cantidad:</strong> {compraData.cantidad} unidades</p>
                                <p><strong>Costo unitario:</strong> {formatCurrencyCOP(compraData.nuevoCostoUnitario)}</p>
                                <p><strong>Total compra:</strong> {formatCurrencyCOP(compraData.cantidad * compraData.nuevoCostoUnitario)}</p>
                            </div>
                            <p className="c-form-message c-form-message--help u-mt-md">
                                Esta acción actualizará el stock y recalculará el Costo Promedio Ponderado.
                            </p>
                            <div className="c-modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>
                                    Cancelar
                                </button>
                                <button className="btn btn-primary btn-success" onClick={confirmarGuardarCompra}>
                                    Sí, Registrar Compra
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🛑 TOAST DE ÉXITO 🛑 */}
            {showSuccessToast && (
                <div className="c-toast c-toast--success c-toast--compra">
                    <div className="c-toast__icon">✅</div>
                    <div className="c-toast__content">
                        <div className="c-toast__title">¡Compra registrada exitosamente!</div>
                        <div className="c-toast__message">
                            Nuevo CPP: {formatCurrencyCOP(nuevoCPP)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegistroCompraForm;