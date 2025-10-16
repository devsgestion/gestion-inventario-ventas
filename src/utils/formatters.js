// src/utils/formatters.js

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

export const formatCurrencyCOP = (value) => {
    const numericValue = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(numericValue)) {
        return COP_FORMATTER.format(0);
    }
    return COP_FORMATTER.format(numericValue);
};

export const parseDecimal = (value, fallback = 0) => {
    if (value === '' || value === null || value === undefined) {
        return fallback;
    }
    const normalized = typeof value === 'string' ? value.replace(',', '.') : value;
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? fallback : parsed;
};

export const parseInteger = (value, fallback = 0) => {
    if (value === '' || value === null || value === undefined) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};
