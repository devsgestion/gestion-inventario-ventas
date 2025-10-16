# 🎨 Sistema de Diseño - Gestión de Inventario SAAS

## 📁 Estructura de Archivos CSS

```
src/
├── styles/
│   ├── globals.css      # Variables, reset, utilidades base
│   └── components.css   # Componentes reutilizables
├── index.css           # Importaciones principales
└── pages/
    └── *.css          # Estilos específicos de página
```

## 🎯 Filosofía del Sistema

- **Minimalista**: Colores neutros y espaciado generoso
- **Consistente**: Variables CSS para mantener coherencia
- **Modular**: Componentes reutilizables
- **Responsive**: Mobile-first design
- **Accesible**: Preparado para usuarios con discapacidades

## 🎨 Paleta de Colores

### Colores Principales
```css
--color-primary: #2563eb        /* Azul principal */
--color-primary-hover: #1d4ed8  /* Azul hover */
--color-accent: #059669         /* Verde accent */
```

### Backgrounds
```css
--color-bg-main: #f8fafc        /* Fondo principal */
--color-bg-card: #ffffff        /* Fondo de cards */
--color-bg-hover: #f1f5f9       /* Hover states */
```

### Texto
```css
--color-text-primary: #0f172a   /* Texto principal */
--color-text-secondary: #64748b /* Texto secundario */
--color-text-muted: #94a3b8     /* Texto deshabilitado */
```

## 🧱 Componentes Reutilizables

### Botones

```jsx
// Botón Primario
<button className="btn btn-primary">Crear Producto</button>

// Botón Secundario
<button className="btn btn-secondary">Cancelar</button>

// Tamaños
<button className="btn btn-primary btn-sm">Pequeño</button>
<button className="btn btn-primary btn-lg">Grande</button>

// Estados
<button className="btn btn-success">Éxito</button>
<button className="btn btn-error">Error</button>
```

### Cards

```jsx
// Card Básica
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Título</h3>
  </div>
  <div className="card-body">
    Contenido de la card
  </div>
</div>

// Card de Estadísticas
<div className="card card-stats">
  <h4 className="card-title">Ventas Totales</h4>
  <h2 className="card-value">$25,600.00</h2>
</div>
```

### Formularios

```jsx
// Input con Label
<div className="form-group">
  <label className="form-label required">Nombre del Producto</label>
  <input 
    type="text" 
    className="form-input" 
    placeholder="Ingrese el nombre"
  />
  <div className="form-help">Ayuda contextual</div>
</div>

// Estados de Error
<input className="form-input error" />
<div className="form-error">Este campo es requerido</div>
```

### Badges

```jsx
<span className="badge badge-success">Activo</span>
<span className="badge badge-error">Agotado</span>
<span className="badge badge-warning">Poco Stock</span>
```

### Alertas

```jsx
<div className="alert alert-success">
  <div className="alert-title">¡Éxito!</div>
  <div className="alert-description">Producto creado correctamente</div>
</div>
```

## 📐 Sistema de Espaciado

```css
--spacing-1: 0.25rem   /* 4px */
--spacing-2: 0.5rem    /* 8px */
--spacing-3: 0.75rem   /* 12px */
--spacing-4: 1rem      /* 16px */
--spacing-6: 1.5rem    /* 24px */
--spacing-8: 2rem      /* 32px */
--spacing-12: 3rem     /* 48px */
```

### Uso con Utilidades

```jsx
// Margins
<div className="mt-4 mb-6">Contenido</div>

// Paddings
<div className="p-4">Contenido</div>

// Gaps (Flexbox/Grid)
<div className="flex gap-4">Items</div>
```

## 📱 Responsive Design

### Breakpoints
```css
--breakpoint-sm: 640px
--breakpoint-md: 768px
--breakpoint-lg: 1024px
```

### Clases Responsive
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

## 🎭 Estados y Animaciones

### Estados de Carga
```jsx
// Loading Spinner
<div className="loading-spinner"></div>

// Loading Dots
<div className="loading-dots">
  <span></span>
  <span></span>
  <span></span>
</div>

// Skeleton Loading
<div className="skeleton skeleton-text"></div>
```

### Estados de Página
```jsx
// Estado de Carga
<div className="loading-state">
  <div className="loading-spinner"></div>
  <p>Cargando datos...</p>
</div>

// Estado Vacío
<div className="empty-state">
  <p>No hay productos disponibles</p>
</div>
```

## 🔧 Utilidades Comunes

### Layout
```jsx
<div className="flex items-center justify-between">
<div className="grid grid-cols-3 gap-4">
<div className="container">
```

### Tipografía
```jsx
<h1 className="text-2xl font-bold text-primary">
<p className="text-sm text-muted">
<span className="font-medium text-center">
```

### Espaciado y Bordes
```jsx
<div className="p-4 m-2 rounded shadow">
<div className="border border-primary rounded-lg">
```

## 📋 Mejores Prácticas

### 1. **Usar Variables CSS**
```css
/* ✅ Correcto */
color: var(--color-primary);

/* ❌ Incorrecto */
color: #2563eb;
```

### 2. **Composición de Clases**
```jsx
// ✅ Correcto - Combinar clases del sistema
<button className="btn btn-primary btn-lg">

// ❌ Incorrecto - CSS inline
<button style={{backgroundColor: 'blue'}}>
```

### 3. **Estructura de Archivos CSS**
```css
/* archivo-especifico.css */

/* Solo estilos específicos que no están en el sistema */
.mi-componente-especial {
  /* Usar variables del sistema */
  background: var(--color-bg-card);
  padding: var(--spacing-4);
}
```

### 4. **Responsive Mobile-First**
```css
/* ✅ Correcto - Mobile primero */
.mi-clase {
  font-size: var(--text-sm);
}

@media (min-width: 768px) {
  .mi-clase {
    font-size: var(--text-lg);
  }
}
```

## 🚀 Implementación en Páginas Nuevas

### 1. Crear archivo CSS específico
```css
/* src/pages/MiNuevaPagina.css */

.mi-pagina-container {
  /* Usar variables del sistema */
  padding: var(--spacing-8);
  max-width: 1200px;
  margin: 0 auto;
}

.mi-componente-especial {
  /* Combinar con clases existentes cuando sea posible */
}
```

### 2. En el componente JSX
```jsx
import './MiNuevaPagina.css';

const MiNuevaPagina = () => {
  return (
    <div className="mi-pagina-container">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Mi Página</h1>
        <button className="btn btn-primary">Acción</button>
      </header>
      
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body">
            Contenido
          </div>
        </div>
      </main>
    </div>
  );
};
```

## 🎯 Beneficios del Sistema

1. **Consistencia Visual**: Mismo look en toda la app
2. **Desarrollo Rápido**: Componentes listos para usar
3. **Fácil Mantenimiento**: Cambios centralizados
4. **Responsive**: Funciona en todos los dispositivos
5. **Accesible**: Cumple estándares de accesibilidad
6. **Escalable**: Fácil agregar nuevos componentes

## 📚 Recursos Adicionales

- Todas las variables están en `src/styles/globals.css`
- Todos los componentes en `src/styles/components.css`
- Ejemplos de uso en `src/pages/InventarioPage.jsx`
- Sistema basado en principios de design systems modernos

¡Ahora tienes un sistema de diseño completo y profesional para tu SAAS! 🎉