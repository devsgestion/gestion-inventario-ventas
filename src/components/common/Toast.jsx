// src/components/common/Toast.jsx
// Sistema de notificaciones tipo toast

import React, { useEffect } from 'react';
import './Toast.css';

const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '📢';
        }
    };

    return (
        <div className={`toast toast--${type}`}>
            <div className="toast__icon">{getIcon()}</div>
            <div className="toast__content">
                <p className="toast__message">{message}</p>
            </div>
            <button className="toast__close" onClick={onClose}>
                ×
            </button>
        </div>
    );
};

// Componente contenedor para manejar múltiples toasts
export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
};

export default Toast;
