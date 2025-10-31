/**
 * Definiciones de pasos para los tours guiados de cada módulo
 * Cada paso tiene: target (selector CSS), content (texto), title (título opcional)
 */

export const inventarioTourSteps = [
    {
        target: '.c-inventario__search-bar',
        content: 'Usa la barra de búsqueda para encontrar productos rápidamente por referencia o nombre.',
        title: '🔍 Búsqueda de Productos',
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '.c-inventario__filters',
        content: 'Filtra los productos por estado (Activos/Inactivos) o por alertas de stock mínimo.',
        title: '🎯 Filtros',
        placement: 'bottom',
    },
    {
        target: '.c-inventario__add-btn',
        content: 'Haz clic aquí para agregar un nuevo producto al inventario. Define el precio de venta inicial aquí.',
        title: '➕ Agregar Producto',
        placement: 'left',
    },
    {
        target: 'tbody tr:first-child',
        content: '💡 TIP IMPORTANTE: Haz clic directamente sobre el precio de venta para modificarlo rápidamente sin editar todo el producto. Esto es útil para ajustes de precios frecuentes.',
        title: '� Editar Precio de Venta',
        placement: 'top',
    },
    {
        target: 'tbody tr:first-child .c-productos-lista__menu-btn',
        content: 'Haz clic en los 3 puntos (⋮) para ver el menú de acciones disponibles. ¡Haz clic ahora en este botón para abrir el menú antes de continuar!',
        title: '⚙️ Menú de Acciones',
        placement: 'left',
        spotlightClicks: true,
        disableBeacon: false,
    },
    {
        target: 'tbody tr:first-child',
        content: `Ahora puedes ver el menú de acciones que acabas de abrir. Estas son las opciones disponibles:

📝 **Editar Nombre**: Cambia solo el nombre del producto sin modificar stock, precios ni otros datos.

🛒 **Registrar Compra**: Usa esta opción cuando compras más unidades a tu proveedor. El sistema actualiza automáticamente el stock y recalcula el CPP (Costo Promedio Ponderado).

⚙️ **Ajustar Stock**: Para correcciones manuales de inventario físico. Usa esto cuando el stock real no coincide con el sistema (pérdidas, roturas, sobrantes).

⏸ **Desactivar/Activar**: Oculta temporalmente el producto de las ventas SIN eliminarlo. Útil para productos de temporada o agotados temporalmente.

🗑 **Eliminar** (solo en inactivos): Elimina permanentemente el producto del sistema.`,
        title: '📋 Explicación de Cada Acción',
        placement: 'bottom',
        disableOverlayClose: true,
        spotlightClicks: false,
    },
    {
        target: '.c-inventario__stats',
        content: 'Aquí puedes ver estadísticas importantes: total de productos activos, alertas de stock mínimo y valor total del inventario. Puedes cerrar el menú de acciones haciendo clic fuera de él.',
        title: '📊 Estadísticas del Inventario',
        placement: 'top',
    },
];

export const ventasTourSteps = [
    {
        target: '.c-ventas__caja-controls',
        content: '⚠️ MUY IMPORTANTE: Al iniciar tu jornada, haz clic en "Abrir Caja" UNA SOLA VEZ. Al finalizar el día, haz clic en "Cerrar Caja" UNA SOLA VEZ. NO abras y cierres múltiples veces en el mismo día, esto genera errores en el historial y reporte de caja.',
        title: '🏦 Gestión de Caja (Crítico)',
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '.c-ventas__search',
        content: 'Busca productos para agregar a la venta por referencia o nombre. Solo se muestran productos con stock disponible.',
        title: '🔍 Buscar Productos',
        placement: 'bottom',
    },
    {
        target: '.c-ventas__productos-lista',
        content: 'Aquí aparecen los productos disponibles. Haz clic en añadir para agregarlo al carrito de venta.',
        title: '📦 Lista de Productos',
        placement: 'right',
    },
    {
        target: '.c-ventas__carrito',
        content: '💡 TIP: Puedes ajustar cantidades directamente. También puedes hacer clic sobre el precio para modificarlo si necesitas aplicar un descuento o precio especial para esa venta.',
        title: '🛒 Carrito de Ventas',
        placement: 'left',
    },
    {
        target: '.c-ventas__total',
        content: 'Aquí se muestra el total de la venta. Verifica el monto antes de finalizar.',
        title: '💰 Total de la Venta',
        placement: 'top',
    },
    {
        target: '.c-ventas__finalizar-btn',
        content: 'Cuando termines de agregar productos y verificar el total, haz clic aquí para registrar la venta. El stock se descontará automáticamente y se generará el reporte.',
        title: '✅ Finalizar Venta',
        placement: 'top',
    },
];

export const configuracionTourSteps = [
    {
        target: '.c-settings__empresa',
        content: 'Configura la información de tu empresa: nombre, NIT, dirección y teléfono.',
        title: '🏢 Datos de la Empresa',
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '.c-settings__usuarios',
        content: 'Administra los usuarios del sistema, asigna roles y permisos.',
        title: '👥 Gestión de Usuarios',
        placement: 'right',
    },
    {
        target: '.c-settings__backup',
        content: 'Realiza copias de seguridad de tus datos y configura respaldos automáticos.',
        title: '💾 Respaldos',
        placement: 'right',
    },
];

/**
 * Verifica si un tour ya fue completado
 * @param {string} tourKey - Clave del tour
 * @returns {boolean}
 */
export function isTourCompleted(tourKey) {
    return localStorage.getItem(`tour_${tourKey}_completed`) === 'true';
}

/**
 * Marca un tour como completado
 * @param {string} tourKey - Clave del tour
 */
export function markTourAsCompleted(tourKey) {
    localStorage.setItem(`tour_${tourKey}_completed`, 'true');
}

/**
 * Resetea el estado de un tour (útil para testing)
 * @param {string} tourKey - Clave del tour
 */
export function resetTour(tourKey) {
    localStorage.removeItem(`tour_${tourKey}_completed`);
}

/**
 * Resetea TODOS los tours (útil para volver a ver todos desde el inicio)
 */
export function resetAllTours() {
    const tourKeys = ['inventario', 'ventas', 'configuracion'];
    tourKeys.forEach(key => {
        localStorage.removeItem(`tour_${key}_completed`);
    });
    console.log('✅ Todos los tours han sido reseteados. Recarga la página para verlos nuevamente.');
}
