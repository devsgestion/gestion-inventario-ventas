// Configuración para logs de debugging
export const DEBUG_CONFIG = {
  enableProfileLogs: true,
  enableBootstrapLogs: true,
  enableInventoryLogs: true,
  enableRecoveryLogs: true,
  enableAuthLogs: true
};

// Función helper para logs condicionales
export const debugLog = (category, message, ...args) => {
  if (DEBUG_CONFIG[`enable${category}Logs`]) {
    console.log(message, ...args);
  }
};
