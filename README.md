# 📊 Sistema de Gestión de Inventario y Ventas

Sistema completo de punto de venta (POS) con control de inventario, gestión de ventas, pedidos, cambios/devoluciones y analytics en tiempo real.

## ✨ Características Principales

### 🎯 **Dashboard Analytics**
- 📊 Gráficos interactivos con Recharts
- 📈 Ventas y utilidad de los últimos 30 días
- 🏆 Top 10 productos más vendidos
- ⚠️ Alertas de stock bajo
- 📉 Comparación mensual (mes actual vs anterior)
- ⏰ Ventas por hora del día
- 💰 KPIs en tiempo real (ventas, utilidad, ticket promedio)

### 📦 **Gestión de Inventario**
- CRUD completo de productos
- Sistema de Costo Promedio Ponderado (CPP) automático
- Registro de compras con actualización de stock
- Ajustes manuales de inventario
- Alertas de stock mínimo
- Auditoría completa de movimientos
- Soporte para productos activos/inactivos

### 🛒 **Punto de Venta (POS)**
- Carrito de ventas persistente (LocalStorage)
- Edición inline de precios
- Permitir ventas con stock negativo (configurable)
- Control de caja (apertura/cierre diario)
- Impresión de tickets
- Cálculo automático de utilidad en tiempo real

### 🔄 **Cambios y Devoluciones**
- Procesamiento completo de cambios de productos
- Devoluciones con ajuste automático de precio
- Reversión automática de inventario
- Actualización de caja con diferencias
- Sistema de anulación con auditoría
- Trazabilidad completa

### 📋 **Gestor de Pedidos**
- Registro de pedidos por canal (WhatsApp, Llamada, Instagram)
- Estados configurables (Pendiente, En Proceso, En Viaje, Entregado, Cancelado)
- Asignación de productos a pedidos
- Edición y seguimiento de pedidos

### 👥 **Sistema de Usuarios y Roles**
- **Superadmin**: Control total + Panel de administración
- **Admin**: Gestión completa de la empresa
- **Vendedor**: Ventas, inventario, historial
- **Gestor**: Pedidos e inventario
- **Usuario**: Solo punto de venta

### 📊 **Reportes**
- Historial de caja por fecha
- Detalle de ventas por producto
- Reporte de utilidad neta
- Comparación mensual
- Productos más vendidos
- Exportación a Excel (xlsx)

### 🎨 **UX/UI**
- Tour guiado para nuevos usuarios
- Tema claro/oscuro
- Diseño responsive (móvil, tablet, desktop)
- Modales de confirmación profesionales
- Toasts/Notificaciones
- Animaciones suaves

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 19 + Vite
- **Routing**: React Router DOM v7
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Gráficos**: Recharts
- **Formularios**: React Hook Form
- **Animaciones**: Framer Motion
- **Exportación**: XLSX
- **Impresión**: React to Print
- **Tours Guiados**: React Joyride

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase (gratis)

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/devsgestion/gestion-inventario-ventas.git
   cd gestion-inventario-ventas
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crea un archivo `.env` en la raíz del proyecto:
   ```env
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```

4. **Configurar Supabase**
   
   Ejecuta los siguientes scripts SQL en tu proyecto de Supabase:
   - `docs/DATABASE_TABLES.md` (estructura de tablas)
   - `docs/DATABASE_FUNCTIONS.sql` (funciones RPC principales)
   - `docs/DASHBOARD_FUNCTIONS.sql` (funciones para el dashboard)

5. **Iniciar servidor de desarrollo**
   ```bash
   npm run dev
   ```

6. **Abrir en el navegador**
   ```
   http://localhost:5173
   ```

## 📁 Estructura del Proyecto

```
gestion-inventario-ventas/
├── docs/                       # Documentación
│   ├── DATABASE_TABLES.md      # Esquema de base de datos
│   ├── DATABASE_FUNCTIONS.md   # Funciones RPC principales
│   ├── DASHBOARD_FUNCTIONS.sql # Funciones del dashboard
│   └── DASHBOARD_README.md     # Guía del dashboard
├── src/
│   ├── api/                    # Cliente de Supabase
│   ├── assets/                 # Recursos estáticos
│   ├── components/             # Componentes React
│   │   ├── cambios/           # Cambios y devoluciones
│   │   ├── common/            # Componentes reutilizables
│   │   ├── dashboard/         # Gráficos del dashboard
│   │   ├── inventario/        # Gestión de productos
│   │   ├── layout/            # Layout y navegación
│   │   ├── pedidos/           # Gestión de pedidos
│   │   └── ventas/            # Punto de venta
│   ├── config/                # Configuraciones
│   ├── hooks/                 # Custom Hooks
│   ├── pages/                 # Páginas principales
│   ├── styles/                # Estilos CSS
│   ├── utils/                 # Utilidades
│   ├── App.jsx                # Componente principal
│   └── main.jsx               # Entry point
├── package.json
└── vite.config.js
```

## 🎯 Uso Rápido

### **Primer Registro**
1. Ve a `/register`
2. Crea tu cuenta y nombre de empresa
3. Serás creado como **admin** de tu empresa

### **Abrir Caja**
1. Ve a **Punto de Venta**
2. Haz clic en "Abrir Caja / Iniciar Día"

### **Agregar Productos**
1. Ve a **Inventario**
2. Clic en "Crear Nuevo Producto"
3. Llena el formulario y guarda

### **Registrar Compra (Stock)**
1. En Inventario, clic en el botón de compra del producto
2. Ingresa cantidad y costo de compra
3. El sistema calcula el CPP automáticamente

### **Realizar Venta**
1. Ve a **Punto de Venta**
2. Busca productos y agrégalos al carrito
3. Edita cantidades o precios si es necesario
4. Clic en "Finalizar Venta"

### **Ver Analytics**
1. Ve a **Dashboard**
2. Revisa KPIs, gráficos y tendencias
3. Haz clic en "Actualizar" para refrescar datos

## 📊 Funcionalidades del Dashboard

- **Ventas Hoy**: Total de ingresos del día actual
- **Ventas del Mes**: Con % de crecimiento vs mes anterior
- **Utilidad del Mes**: Ganancia neta con % de variación
- **Ticket Promedio**: Promedio de valor por transacción
- **Productos Activos**: Cantidad de productos en inventario
- **Stock Bajo**: Productos que necesitan reabastecimiento
- **Valor Inventario**: Stock total valorizado a costo

### **Gráficos Disponibles**
- 📈 Ventas y Utilidad - Últimos 30 días (líneas)
- 📊 Comparación Mensual (barras)
- 🏆 Top 10 Productos Más Vendidos (barras horizontales)
- ⚠️ Productos con Stock Bajo (donut)
- ⏰ Ventas por Hora - Hoy (área)

## 🔐 Sistema de Roles y Permisos

| Funcionalidad | Usuario | Vendedor | Gestor | Admin | Superadmin |
|--------------|---------|----------|--------|-------|------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ventas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver Inventario | ❌ | ✅ | ✅ | ✅ | ✅ |
| Editar Inventario | ❌ | ✅ | ✅ | ✅ | ✅ |
| Compras/Stock | ❌ | ❌ | ✅ | ✅ | ✅ |
| Pedidos | ❌ | ❌ | ✅ | ✅ | ✅ |
| Cambios/Devoluciones | ❌ | ✅ | ❌ | ✅ | ✅ |
| Historial Caja | ❌ | ✅ | ❌ | ✅ | ✅ |
| Configuración | ❌ | ❌ | ❌ | ✅ | ✅ |
| Admin Usuarios | ❌ | ❌ | ❌ | ❌ | ✅ |

## 📖 Documentación Adicional

- [Estructura de Tablas](docs/DATABASE_TABLES.md)
- [Funciones RPC](docs/DATABASE_FUNCTIONS.md)
- [Guía del Dashboard](docs/DASHBOARD_README.md)
- [Sistema de Diseño](DESIGN_SYSTEM.md)

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Autores

- **DevGestion Team** - [GitHub](https://github.com/devsgestion)

## 🙏 Agradecimientos

- Supabase por el excelente BaaS
- Recharts por los gráficos
- React Team por React 19
- Comunidad open source

## 📧 Contacto

- Email: contacto@devsgestion.com
- GitHub: [@devsgestion](https://github.com/devsgestion)

---

**Hecho con ❤️ en Colombia** 🇨🇴
