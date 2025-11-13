# Estructura CSS del Módulo de Gastos

## 📁 Organización de Archivos

El módulo de gastos utiliza un sistema modular de CSS para mejor mantenibilidad:

### Archivo Principal
- **`Gastos.css`** - Estilos de la página principal de gastos
  - Layout general
  - Header con gradiente
  - Dashboard de estadísticas
  - Filtros avanzados
  - Sección de categorías
  - Vista de cards y tabla
  - Estados vacío/loading
  - Responsive
  - Importa módulos: `GastosModal.css` y `GastosForm.css`

### Módulos
- **`gastos/GastosModal.css`** - Estilos del modal
  - Overlay con backdrop blur
  - Estructura del modal
  - Header con gradiente
  - Botón de cerrar (X) mejorado con animación
  - Body y footer
  - Alertas
  - Animaciones (fadeIn, slideUp, spin)
  - Responsive para modal
  - Scrollbar personalizado

- **`gastos/GastosForm.css`** - Estilos de formularios
  - Inputs base
  - Input con icono
  - Currency input especializado
  - Selector visual de categorías (grid)
  - Selector visual de métodos de pago (grid)
  - Mensajes de error y hints
  - Responsive para formularios

## 🎨 Clases Únicas del Módulo

Para evitar conflictos con otros módulos, todas las clases tienen el prefijo `gastos-`:

### Modal
- `.gastos-modal-overlay`
- `.gastos-modal-content-modern`
- `.gastos-modal-header-modern`
- `.gastos-modal-icon-wrapper`
- `.gastos-modal-title-section`
- `.gastos-modal-title`
- `.gastos-modal-subtitle`
- `.gastos-close-modal-btn` ⭐ **Botón X mejorado**
- `.gastos-modal-body-modern`
- `.gastos-modal-footer-modern`
- `.gastos-alert-modern`

### Formularios
- `.gastos-form-modern`
- `.categorias-grid-selector`
- `.categoria-option`
- `.categoria-option-content`
- `.categoria-option-icon`
- `.categoria-option-text`
- `.metodo-pago-grid`
- `.metodo-option`
- `.metodo-content`

### Página Principal
- `.gastos-page`
- `.gastos-header-modern`
- `.gastos-dashboard-resumen`
- `.gastos-stats-card`
- `.gastos-filtros-modern`
- `.gastos-categorias-section`
- `.gastos-grid-modern`
- `.gasto-card-modern`
- `.gastos-table-modern`

## 🎯 Características Destacadas

### 1. Botón de Cerrar Modal (X)
El botón `.gastos-close-modal-btn` tiene:
- ✨ Animación de rotación 90° al hover
- 🎨 Cambio de color a rojo (#e74c3c) al hover
- 💫 Efecto de escala suave
- 🔒 Estado disabled con opacidad reducida
- 🌟 Backdrop blur con borde semitransparente

### 2. Selectores Visuales
- **Categorías**: Grid adaptativo con íconos de colores
- **Métodos de Pago**: Tarjetas interactivas con SVG icons
- Estados hover con elevación y sombras
- Estados checked con borde y fondo de marca

### 3. Animaciones
- `gastos-fadeIn` - Fade in suave para overlay
- `gastos-slideUp` - Slide up con cubic-bezier para modal
- `gastos-spin` - Rotación para spinner
- `gastos-fadeInPage` - Fade in para página completa

## 📱 Responsive

### Breakpoints
- **768px** - Tablet: Layout a 1 columna, filtros verticales
- **480px** - Móvil: Modal fullscreen, texto más pequeño

## 🔧 Mantenimiento

### Para agregar nuevos estilos:
1. Identifica el módulo apropiado (Modal, Form, o Principal)
2. Usa el prefijo `gastos-` para todas las clases
3. Sigue la convención de nombres existente
4. Documenta clases complejas con comentarios

### Para modificar estilos:
1. Busca la clase en el módulo correspondiente
2. Mantén la consistencia con el design system (variables CSS)
3. Verifica responsive en todos los breakpoints
4. Prueba estados hover, focus, active, disabled

## 🎨 Variables CSS Usadas

Del `global.css`:
- Espaciado: `--space-xs`, `--space-sm`, `--space-md`, `--space-lg`, `--space-xl`
- Colores: `--color-brand`, `--color-danger`, `--color-success`, etc.
- Bordes: `--border-radius-sm`, `--border-radius-md`, `--border-radius-lg`
- Superficie: `--color-surface-200`, `--color-surface-300`
- Texto: `--color-text-high`, `--color-text-medium`, `--color-text-low`

## 📝 Notas

- **Backup disponible**: `Gastos.css.backup` contiene la versión anterior completa
- **Modularidad**: Los archivos pueden importarse independientemente si es necesario
- **Performance**: Los @import se resuelven en tiempo de build
- **Compatibilidad**: Todas las animaciones tienen fallbacks
