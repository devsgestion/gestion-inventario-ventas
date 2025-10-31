// src/utils/errorMessages.js
// Traducciones de errores de Supabase al español

/**
 * Traduce mensajes de error de Supabase al español
 * @param {Error} error - Objeto de error de Supabase
 * @returns {string} Mensaje de error en español
 */
export const translateSupabaseError = (error) => {
    if (!error) return 'Ha ocurrido un error desconocido';

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';

    // Errores de autenticación
    if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid credentials')) {
        return 'Credenciales incorrectas. Verifica tu correo y contraseña.';
    }

    if (errorMessage.includes('email not confirmed')) {
        return 'Debes confirmar tu correo electrónico antes de iniciar sesión.';
    }

    if (errorMessage.includes('user not found')) {
        return 'No existe una cuenta con ese correo electrónico.';
    }

    if (errorMessage.includes('user already registered') || errorMessage.includes('already exists')) {
        return 'Ya existe una cuenta con ese correo electrónico.';
    }

    if (errorMessage.includes('invalid email')) {
        return 'El formato del correo electrónico no es válido.';
    }

    if (errorMessage.includes('password') && errorMessage.includes('short')) {
        return 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (errorMessage.includes('weak password')) {
        return 'La contraseña es muy débil. Usa al menos 6 caracteres.';
    }

    // Errores de rate limiting (demasiados intentos)
    if (errorMessage.includes('email rate limit exceeded') || errorMessage.includes('too many requests')) {
        return 'Has enviado demasiadas solicitudes. Por favor espera unos minutos antes de intentar nuevamente.';
    }

    if (errorMessage.includes('rate limit')) {
        return 'Has realizado demasiados intentos. Espera unos minutos antes de volver a intentar.';
    }

    // Errores de sesión
    if (errorMessage.includes('session expired') || errorMessage.includes('token expired')) {
        return 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
    }

    if (errorMessage.includes('invalid token') || errorMessage.includes('jwt')) {
        return 'La sesión no es válida. Por favor inicia sesión nuevamente.';
    }

    if (errorMessage.includes('refresh token') && errorMessage.includes('not found')) {
        return 'Tu sesión ha caducado. Por favor inicia sesión nuevamente.';
    }

    // Errores de recuperación de contraseña
    if (errorMessage.includes('link expired') || errorMessage.includes('token has expired')) {
        return 'El enlace de recuperación ha expirado. Solicita uno nuevo desde el login.';
    }

    if (errorMessage.includes('invalid recovery token')) {
        return 'El enlace de recuperación no es válido. Solicita uno nuevo.';
    }

    if (errorMessage.includes('password reset')) {
        return 'Error al restablecer la contraseña. Intenta solicitar un nuevo enlace.';
    }

    // Errores de red
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        return 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
    }

    if (errorMessage.includes('timeout')) {
        return 'La solicitud tardó demasiado tiempo. Verifica tu conexión e intenta nuevamente.';
    }

    // Errores de base de datos
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
        return 'Ya existe un registro con esos datos.';
    }

    if (errorMessage.includes('foreign key constraint')) {
        return 'No se puede completar la operación debido a dependencias existentes.';
    }

    if (errorMessage.includes('permission denied') || errorMessage.includes('not authorized')) {
        return 'No tienes permisos para realizar esta acción.';
    }

    // Errores de validación
    if (errorMessage.includes('null value')) {
        return 'Faltan campos obligatorios. Por favor completa todos los datos.';
    }

    if (errorMessage.includes('invalid input')) {
        return 'Los datos ingresados no son válidos.';
    }

    // Errores de PKCE
    if (errorMessage.includes('code verifier')) {
        return 'Error de autenticación. Por favor cierra esta ventana e intenta nuevamente desde el enlace del correo.';
    }

    if (errorMessage.includes('pkce')) {
        return 'Error en el proceso de autenticación. Solicita un nuevo enlace.';
    }

    // Error genérico de Supabase
    if (error.status === 400) {
        return 'Solicitud incorrecta. Verifica los datos ingresados.';
    }

    if (error.status === 401) {
        return 'No autorizado. Por favor inicia sesión nuevamente.';
    }

    if (error.status === 403) {
        return 'Acceso denegado. No tienes permisos para esta acción.';
    }

    if (error.status === 404) {
        return 'No se encontró el recurso solicitado.';
    }

    if (error.status === 500) {
        return 'Error del servidor. Por favor intenta más tarde.';
    }

    if (error.status === 503) {
        return 'Servicio temporalmente no disponible. Intenta más tarde.';
    }

    // Si no hay coincidencia, devolver el mensaje original o uno genérico
    return error.message || 'Ha ocurrido un error. Por favor intenta nuevamente.';
};

/**
 * Mensajes de éxito en español
 */
export const successMessages = {
    login: '¡Bienvenido! Iniciando sesión...',
    logout: 'Sesión cerrada correctamente',
    register: '¡Cuenta creada exitosamente! Redirigiendo...',
    passwordReset: 'Contraseña actualizada correctamente',
    passwordResetEmailSent: 'Te hemos enviado un correo con instrucciones para restablecer tu contraseña',
    profileUpdated: 'Perfil actualizado correctamente',
    productCreated: 'Producto creado exitosamente',
    productUpdated: 'Producto actualizado correctamente',
    productDeleted: 'Producto eliminado correctamente',
    saleCompleted: 'Venta registrada exitosamente',
    stockAdjusted: 'Stock ajustado correctamente',
    purchaseRegistered: 'Compra registrada exitosamente',
};

/**
 * Mensajes de validación en español
 */
export const validationMessages = {
    requiredField: 'Este campo es obligatorio',
    invalidEmail: 'Ingresa un correo electrónico válido',
    passwordTooShort: 'La contraseña debe tener al menos 6 caracteres',
    passwordsDontMatch: 'Las contraseñas no coinciden',
    invalidNumber: 'Ingresa un número válido',
    invalidPrice: 'Ingresa un precio válido',
    invalidQuantity: 'Ingresa una cantidad válida',
    minValue: (min) => `El valor mínimo es ${min}`,
    maxValue: (max) => `El valor máximo es ${max}`,
};
