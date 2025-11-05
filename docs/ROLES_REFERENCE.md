# 🔐 Sistema de Roles y Permisos

## Roles Disponibles

### 👑 SuperAdmin (Super Administrador)
**Acceso:** TODO el sistema
- ✅ Panel de Administración de Usuarios
- ✅ Configuración de Empresa
- ✅ Inventario (completo)
- ✅ Punto de Venta
- ✅ Gestor de Pedidos
- ✅ Historial de Caja
- ✅ Crear/Eliminar cualquier recurso

**Ideal para:** Propietario del negocio

---

### 🔧 Admin (Administrador)
**Acceso:** Todo excepto Panel de Admin
- ✅ Configuración de Empresa
- ✅ Inventario (completo)
- ✅ Punto de Venta
- ✅ Gestor de Pedidos
- ✅ Historial de Caja
- ✅ Abrir/Cerrar Caja
- ❌ Panel de Admin (no puede crear usuarios)

**Ideal para:** Gerente o encargado de la tienda

---

### 🛍️ Vendedor
**Acceso:** Inventario + Ventas + Caja
- ✅ Inventario (ver y editar existentes)
- ✅ Punto de Venta (completo)
- ✅ Historial de Caja
- ✅ Abrir/Cerrar Caja
- ❌ Crear/Eliminar productos
- ❌ Gestor de Pedidos
- ❌ Configuración

**Ideal para:** Personal de ventas en tienda física

---

### 📦 Gestor (Gestor de Pedidos)
**Acceso:** Inventario + Pedidos
- ✅ Inventario (crear, editar, ajustar stock)
- ✅ Gestor de Pedidos (completo)
- ✅ Punto de Venta (básico)
- ✅ Registrar compras
- ❌ Historial de Caja
- ❌ Abrir/Cerrar Caja
- ❌ Configuración

**Ideal para:** Encargado de bodega o pedidos por mayor

---

### 👤 Usuario (Básico)
**Acceso:** Solo ventas básicas
- ✅ Punto de Venta (solo vender)
- ✅ Ver inventario
- ❌ Editar productos
- ❌ Abrir/Cerrar Caja
- ❌ Otros módulos

**Ideal para:** Empleado temporal o con acceso muy limitado

---

## Configuración en Base de Datos

### 1. Ejecutar SQL de actualización

```sql
-- Actualizar constraint de roles
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;

ALTER TABLE perfiles 
ADD CONSTRAINT perfiles_rol_check 
CHECK (rol IN ('superadmin', 'admin', 'vendedor', 'gestor', 'usuario'));
```

### 2. Asignar roles a usuarios

```sql
-- Cambiar rol de un usuario
UPDATE perfiles 
SET rol = 'vendedor'  -- o 'gestor', 'admin', etc.
WHERE email = 'usuario@ejemplo.com';
```

### 3. Verificar roles existentes

```sql
SELECT nombre, email, rol 
FROM perfiles 
ORDER BY created_at DESC;
```

---

## Matriz de Permisos Detallada

| Módulo/Acción | SuperAdmin | Admin | Vendedor | Gestor | Usuario |
|---------------|:----------:|:-----:|:--------:|:------:|:-------:|
| **Panel Admin** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Configuración Empresa** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Historial de Caja** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Abrir/Cerrar Caja** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver Inventario** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editar Producto** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Crear Producto** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Eliminar Producto** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ajustar Stock** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Registrar Compra** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Punto de Venta** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Cancelar Venta** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ver Pedidos** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Crear Pedido** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Editar Pedido** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Eliminar Pedido** | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Navegación según Rol

### Menú visible para cada rol:

**SuperAdmin:**
- 📦 Inventario
- 🛒 Punto de Venta
- 📋 Gestor de Pedidos
- 📜 Historial de Caja
- 👥 Panel de Admin

**Admin:**
- 📦 Inventario
- 🛒 Punto de Venta
- 📋 Gestor de Pedidos
- 📜 Historial de Caja

**Vendedor:**
- 📦 Inventario
- 🛒 Punto de Venta
- 📜 Historial de Caja

**Gestor:**
- 📦 Inventario
- 🛒 Punto de Venta
- 📋 Gestor de Pedidos

**Usuario:**
- 🛒 Punto de Venta

---

## Ejemplo de Asignación de Roles

### Escenario: Tienda de Ropa

1. **Dueño:** `superadmin` - Control total
2. **Gerente:** `admin` - Maneja todo el día a día
3. **Cajeros:** `vendedor` - Venden y manejan caja
4. **Encargado de Pedidos:** `gestor` - Recibe pedidos y ajusta inventario
5. **Empleado Temporal:** `usuario` - Solo puede vender

```sql
-- Configurar roles
UPDATE perfiles SET rol = 'admin' WHERE email = 'gerente@tienda.com';
UPDATE perfiles SET rol = 'vendedor' WHERE email = 'cajero1@tienda.com';
UPDATE perfiles SET rol = 'vendedor' WHERE email = 'cajero2@tienda.com';
UPDATE perfiles SET rol = 'gestor' WHERE email = 'bodega@tienda.com';
UPDATE perfiles SET rol = 'usuario' WHERE email = 'temporal@tienda.com';
```

---

## Notas Importantes

- Los roles se definen en la columna `rol` de la tabla `perfiles`
- Cada usuario solo puede tener UN rol
- Los permisos se verifican en `usePermissions.js`
- El sistema redirige automáticamente según el rol al iniciar sesión
- Los componentes se ocultan/muestran según permisos
