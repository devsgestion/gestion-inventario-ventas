// src/hooks/useToast.js
// Custom hook para manejar toasts

import { useState, useCallback } from 'react';

let toastId = 0;

const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = toastId++;
        const newToast = { id, message, type, duration };

        setToasts((prev) => [...prev, newToast]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return {
        toasts,
        showToast,
        removeToast,
    };
};

export default useToast;
