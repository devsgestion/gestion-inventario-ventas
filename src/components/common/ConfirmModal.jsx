// src/components/common/ConfirmModal.jsx
// Modal de confirmación reutilizable

import React, { useState } from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning', // 'warning', 'danger', 'info', 'success'
    requireInput = false,
    inputPlaceholder = 'Ingresa un motivo...',
    inputLabel = 'Motivo'
}) => {
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (requireInput && !inputValue.trim()) {
            setError('Este campo es obligatorio');
            return;
        }
        onConfirm(inputValue.trim());
        setInputValue('');
        setError('');
    };

    const handleClose = () => {
        setInputValue('');
        setError('');
        onClose();
    };

    const getIcon = () => {
        switch (type) {
            case 'warning': return '⚠️';
            case 'danger': return '❌';
            case 'success': return '✅';
            case 'info': return 'ℹ️';
            default: return '❓';
        }
    };

    return (
        <div className="confirm-modal-overlay" onClick={handleClose}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className={`confirm-modal__icon confirm-modal__icon--${type}`}>
                    {getIcon()}
                </div>
                
                <h3 className="confirm-modal__title">{title}</h3>
                
                {message && (
                    typeof message === 'string' ? (
                        <p className="confirm-modal__message">{message}</p>
                    ) : (
                        <div className="confirm-modal__message">{message}</div>
                    )
                )}

                {requireInput && (
                    <div className="confirm-modal__input-group">
                        <label className="confirm-modal__label">{inputLabel}</label>
                        <textarea
                            className={`confirm-modal__textarea ${error ? 'confirm-modal__textarea--error' : ''}`}
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                setError('');
                            }}
                            placeholder={inputPlaceholder}
                            rows="3"
                            autoFocus
                        />
                        {error && <span className="confirm-modal__error">{error}</span>}
                    </div>
                )}

                <div className="confirm-modal__actions">
                    <button 
                        className="confirm-modal__btn confirm-modal__btn--cancel"
                        onClick={handleClose}
                    >
                        {cancelText}
                    </button>
                    <button 
                        className={`confirm-modal__btn confirm-modal__btn--confirm confirm-modal__btn--${type}`}
                        onClick={handleConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
