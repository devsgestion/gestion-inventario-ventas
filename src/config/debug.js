// Configuración para logs de debugging
export const DEBUG_CONFIG = {
  enableProfileLogs: false,      // ⚠️ DESACTIVADO - Causa demasiados re-renders
  enableBootstrapLogs: false,    // ⚠️ DESACTIVADO - Causa demasiados re-renders
  enableInventoryLogs: false,    // ⚠️ DESACTIVADO - Estabilidad HMR
  enableRecoveryLogs: false,     // ⚠️ DESACTIVADO - Estabilidad HMR
  enableAuthLogs: false          // ⚠️ DESACTIVADO - Causa demasiados re-renders
};

// Función helper para logs condicionales
export const debugLog = (category, message, ...args) => {
  if (DEBUG_CONFIG[`enable${category}Logs`]) {
    console.log(message, ...args);
  }
};
