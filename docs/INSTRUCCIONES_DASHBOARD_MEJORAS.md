# 🚀 INSTRUCCIONES: Ejecutar Función SQL de Ventas por Hora con Productos

## 📋 Pasos para implementar la nueva funcionalidad

### 1️⃣ Ejecutar la función SQL en Supabase

1. Abre **Supabase Dashboard**
2. Ve a **SQL Editor** (menú lateral izquierdo)
3. Crea una nueva query
4. Copia y pega el contenido del archivo:
   ```
   docs/GET_VENTAS_POR_HORA_CON_PRODUCTOS.sql
   ```
5. Click en **RUN** (o presiona F5)
6. Verifica que aparezca el mensaje: ✅ **Success. No rows returned**

### 2️⃣ Verificar que la función fue creada

Ejecuta esta query para verificar:

```sql
-- Verificar que la función existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_ventas_por_hora_con_productos';
```

Deberías ver:
```
routine_name                      | routine_type
----------------------------------|-------------
get_ventas_por_hora_con_productos | FUNCTION
```

### 3️⃣ Probar la función (OPCIONAL)

Prueba la función con tu empresa_id:

```sql
-- Reemplaza 'TU-EMPRESA-ID' con tu UUID real
SELECT * FROM get_ventas_por_hora_con_productos('TU-EMPRESA-ID', CURRENT_DATE);
```

Deberías ver un resultado como:

```
hora  | hora_numero | total_ventas | transacciones | productos
------|-------------|--------------|---------------|--------------------------------------------------
00:00 | 0           | 0            | 0             | []
01:00 | 1           | 0            | 0             | []
...
08:00 | 8           | 150000       | 3             | [{"nombre": "Camisa Polo", "cantidad": 2, ...}]
09:00 | 9           | 250000       | 5             | [{"nombre": "Jean Slim", "cantidad": 4, ...}]
...
23:00 | 23          | 0            | 0             | []
```

---

## ✨ ¿Qué mejoras trae esta actualización?

### 🎨 Dashboard en Modo Oscuro
- ✅ Mejor contraste en todos los textos (KPIs, títulos, valores)
- ✅ Sombras más pronunciadas para mayor legibilidad
- ✅ Ejes y grillas de gráficos más visibles
- ✅ Tooltips con mejor contraste
- ✅ Estados vacíos con fondo sutil

### 📊 Ventas por Hora Mejorado
- ✅ **Tooltip expandido** muestra productos vendidos en cada hora
- ✅ **Panel lateral** con detalles completos al hacer click
- ✅ Lista de productos con:
  - Nombre del producto
  - Cantidad vendida
  - Precio unitario
  - Subtotal
- ✅ Diseño responsive y animado
- ✅ Funciona en modo claro y oscuro

---

## 🔄 Compatibilidad

La aplicación tiene **fallback automático**:

- ✅ Si la nueva función existe → Muestra productos
- ✅ Si NO existe → Usa la función antigua (sin productos)

**No es necesario modificar código adicional**, todo está listo para funcionar.

---

## 📱 Cómo usar la nueva funcionalidad

### En el Dashboard:

1. Ve a la sección **"Ventas por Hora - Hoy"**
2. **Pasa el mouse** sobre cualquier hora en el gráfico
   - Verás un tooltip con total ventas, transacciones Y productos
3. **Haz click** en una hora con ventas
   - Se abre un panel lateral con todos los detalles
4. **Cierra el panel** con la X o haciendo click fuera

### Características del panel:
- 📦 Lista completa de productos vendidos
- 💰 Subtotal por producto
- 🔢 Cantidad de cada producto
- 📊 Total de ventas y transacciones de la hora

---

## 🐛 Troubleshooting

### La función no se crea
**Error:** `relation "detalle_ventas" does not exist`
- Verifica que tu base de datos tenga la tabla `detalle_ventas`
- Ejecuta primero las migraciones de las tablas

### No veo productos en el Dashboard
1. Verifica que la función se ejecutó correctamente en Supabase
2. Abre la consola del navegador (F12)
3. Busca warnings que digan "Función con productos no disponible"
4. Si aparece, revisa que el nombre de la función sea exactamente:
   `get_ventas_por_hora_con_productos`

### Los gráficos no se ven bien en modo oscuro
- Limpia la caché del navegador (Ctrl + Shift + R)
- Verifica que el tema oscuro esté activado
- Revisa que los archivos CSS se hayan actualizado

---

## 📝 Archivos Modificados

```
src/
  ├── components/dashboard/
  │   ├── VentasPorHoraChart.jsx      ✅ ACTUALIZADO
  │   ├── VentasPorHoraChart.css      ✅ NUEVO
  │   ├── ProductosChart.jsx          ✅ ACTUALIZADO
  │   └── VentasChart.jsx             ✅ ACTUALIZADO
  ├── hooks/
  │   └── useDashboard.js             ✅ ACTUALIZADO
  └── styles/
      └── Dashboard.css               ✅ ACTUALIZADO

docs/
  └── GET_VENTAS_POR_HORA_CON_PRODUCTOS.sql  ✅ NUEVO
```

---

## ✅ Checklist de Implementación

- [ ] Ejecutar función SQL en Supabase
- [ ] Verificar que la función existe
- [ ] Probar con datos reales (opcional)
- [ ] Refrescar navegador (Ctrl + Shift + R)
- [ ] Probar tooltip en "Ventas por Hora"
- [ ] Hacer click en una hora con ventas
- [ ] Verificar panel lateral funciona
- [ ] Probar en modo oscuro
- [ ] Verificar responsividad en móvil

---

## 🎉 ¡Listo!

Una vez ejecutado el SQL, la funcionalidad estará **100% operativa** sin necesidad de reiniciar el servidor de desarrollo.

**Recarga la página del Dashboard** y disfruta de las mejoras! 🚀
