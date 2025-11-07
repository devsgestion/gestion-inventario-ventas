# 📊 Dashboard con Recharts - Guía de Implementación

## ✅ Instalación Completada

Se ha implementado un **Dashboard completo con gráficos interactivos** utilizando Recharts.

---

## 🚀 PASOS PARA COMPLETAR LA IMPLEMENTACIÓN

### **Paso 1: Ejecutar las Funciones SQL en Supabase**

1. Ve a tu proyecto de Supabase
2. Navega a: **SQL Editor** → **New Query**
3. Copia y pega TODO el contenido del archivo: `docs/DASHBOARD_FUNCTIONS.sql`
4. Haz clic en **Run** para ejecutar el script

Esto creará las siguientes funciones RPC:
- ✅ `get_ventas_ultimos_30_dias()` - Ventas diarias últimos 30 días
- ✅ `get_productos_mas_vendidos()` - Top productos vendidos
- ✅ `get_productos_bajo_stock()` - Productos con inventario bajo
- ✅ `get_comparacion_mensual()` - Comparación mes actual vs anterior
- ✅ `get_resumen_general()` - Estadísticas generales del negocio
- ✅ `get_ventas_por_hora()` - Ventas por hora del día

---

### **Paso 2: Verificar que el Frontend esté actualizado**

El código del frontend ya está listo. Verifica que tengas estos archivos:

#### **Componentes creados:**
- ✅ `src/components/dashboard/VentasChart.jsx`
- ✅ `src/components/dashboard/ProductosChart.jsx`
- ✅ `src/components/dashboard/StockChart.jsx`
- ✅ `src/components/dashboard/ComparacionChart.jsx`
- ✅ `src/components/dashboard/VentasPorHoraChart.jsx`

#### **Hook creado:**
- ✅ `src/hooks/useDashboard.js`

#### **Página creada:**
- ✅ `src/pages/DashboardPage.jsx`
- ✅ `src/styles/Dashboard.css`

#### **Rutas agregadas:**
- ✅ Ruta `/dashboard` en `App.jsx`
- ✅ Enlace en `Sidebar.jsx`

---

### **Paso 3: Probar el Dashboard**

1. Asegúrate de que el servidor de desarrollo esté corriendo:
   ```bash
   npm run dev
   ```

2. Inicia sesión en tu aplicación

3. Haz clic en **📊 Dashboard** en el menú lateral

4. Deberías ver:
   - **7 tarjetas KPI** con estadísticas principales
   - **Gráfico de ventas** de los últimos 30 días
   - **Comparación mensual** (mes actual vs anterior)
   - **Top 10 productos más vendidos**
   - **Productos con stock bajo** (si los hay)
   - **Ventas por hora del día actual**

---

## 📋 Características del Dashboard

### **1. KPIs (Indicadores Clave)**
- 💰 Ventas Hoy
- 📈 Ventas del Mes (con % de variación)
- 💵 Utilidad del Mes (con % de variación)
- 🏷️ Ticket Promedio
- 📦 Productos Activos
- ⚠️ Stock Bajo
- 🏦 Valor del Inventario

### **2. Gráficos Interactivos**
- **Líneas**: Ventas y utilidad últimos 30 días
- **Barras**: Comparación mes actual vs anterior
- **Barras Horizontales**: Top 10 productos más vendidos
- **Circular (Donut)**: Productos con stock bajo
- **Área**: Ventas por hora del día

### **3. Funcionalidades**
- ✅ Responsive (se adapta a móviles)
- ✅ Modo oscuro compatible
- ✅ Tooltips informativos en todos los gráficos
- ✅ Animaciones suaves
- ✅ Actualización en tiempo real
- ✅ Botón de refrescar manual

---

## 🎨 Personalización

### **Cambiar colores de los gráficos:**

Edita los archivos en `src/components/dashboard/`:
- `VentasChart.jsx`: Líneas 45-46 (colores de líneas)
- `ProductosChart.jsx`: Líneas 18-21 (colores de barras)
- `StockChart.jsx`: Líneas 25-28 (colores del donut)

### **Cambiar límite de productos mostrados:**

En `DashboardPage.jsx`, el hook `useDashboard` carga por defecto:
- Top 10 productos más vendidos
- Últimos 30 días de ventas

Puedes modificarlo llamando manualmente:
```javascript
fetchProductosMasVendidos(20, 60) // Top 20, últimos 60 días
```

---

## 🔧 Solución de Problemas

### **Error: "function does not exist"**
- ✅ Asegúrate de haber ejecutado el SQL en Supabase
- ✅ Verifica que las funciones tengan permisos `GRANT EXECUTE`

### **Dashboard vacío o sin datos**
- ✅ Verifica que tengas ventas registradas en tu empresa
- ✅ Abre la consola del navegador (F12) para ver errores
- ✅ Verifica que `empresaId` esté definido

### **Gráficos no se muestran**
- ✅ Verifica que Recharts esté instalado: `npm list recharts`
- ✅ Revisa la consola del navegador por errores de importación

### **Errores de permisos en Supabase**
- ✅ Ejecuta los `GRANT EXECUTE` al final del SQL
- ✅ Verifica que las políticas RLS permitan acceso

---

## 📊 Próximas Mejoras Recomendadas

### **1. Filtros de Fecha**
Agregar selectores para elegir rangos de fechas personalizados:
```jsx
<input type="date" onChange={handleFechaChange} />
```

### **2. Exportar a PDF/Excel**
Botón para exportar los gráficos y datos:
```jsx
<button onClick={exportToPDF}>📄 Exportar PDF</button>
```

### **3. Gráfico de Categorías**
Si agregas categorías a productos, mostrar ventas por categoría:
```jsx
<PieChart data={ventasPorCategoria} />
```

### **4. Comparación Anual**
Gráfico comparando mes a mes del año:
```jsx
<LineChart data={ventasMensuales} />
```

### **5. Mapa de Calor**
Días de la semana con más ventas:
```jsx
<ResponsiveContainer>
  <BarChart data={ventasPorDiaSemana} />
</ResponsiveContainer>
```

---

## 🎯 Uso de las Funciones RPC

### **Ejemplo en código:**
```javascript
// Obtener ventas de los últimos 30 días
const { data, error } = await supabase.rpc('get_ventas_ultimos_30_dias', {
  p_empresa_id: 'tu-empresa-uuid'
});

// Obtener top 5 productos de los últimos 7 días
const { data, error } = await supabase.rpc('get_productos_mas_vendidos', {
  p_empresa_id: 'tu-empresa-uuid',
  p_limite: 5,
  p_dias: 7
});
```

---

## 📝 Checklist de Implementación

- [ ] Ejecutar `docs/DASHBOARD_FUNCTIONS.sql` en Supabase
- [ ] Verificar que `npm install recharts` esté completo
- [ ] Probar la ruta `/dashboard` en el navegador
- [ ] Verificar que los gráficos carguen datos
- [ ] Probar en dispositivo móvil (responsive)
- [ ] Probar botón de actualizar
- [ ] Verificar modo oscuro
- [ ] Revisar tooltips en todos los gráficos

---

## 🎉 ¡Listo!

Tu Dashboard ya está implementado. Solo falta ejecutar el SQL en Supabase y ya tendrás analytics profesionales en tu aplicación.

**¿Necesitas ayuda?** Revisa la consola del navegador (F12) para ver errores detallados.

---

## 📞 Soporte

Si encuentras algún problema, verifica:
1. ✅ Supabase está accesible
2. ✅ Las funciones SQL están creadas
3. ✅ Hay datos de ventas en la base de datos
4. ✅ El usuario tiene permisos de lectura

**Fecha de creación:** 7 de Noviembre, 2025
**Versión:** 1.0.0
**Tecnologías:** React + Recharts + Supabase
