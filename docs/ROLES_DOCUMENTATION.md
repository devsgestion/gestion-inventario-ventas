# 📋 SISTEMA DE ROLES Y PERMISOS

**Sistema de Gestión de Inventario y Ventas**  
Fecha de creación: 7 de Noviembre, 2025

---

## 🎯 ESTRUCTURA DE ROLES (6 roles)

### 1. **GESTOR**
**Acceso:** Solo Inventario + Pedidos + Configuración

**Módulos disponibles:**
- ✅ Inventario (crear, editar, ajustar stock, registrar compras)
- ✅ Pedidos (crear, editar, aprobar, recibir)
- ✅ Configuración (acceso a configuración de empresa)

**Restricciones:**
- ❌ NO accede a Dashboard
- ❌ NO accede a Punto de Venta
- ❌ NO accede a Cambios/Devoluciones
- ❌ NO puede eliminar productos ni pedidos
- ❌ NO accede a Panel de Administración

---

### 2. **VENDEDOR**
**Acceso:** Inventario (consulta y edición) + POS + Cambios/Devoluciones + Configuración

**Módulos disponibles:**
- ✅ Punto de Venta (crear ventas)
- ✅ Inventario (consulta y edición de productos) 🔥
- ✅ Cambios y Devoluciones (procesar, ver histórico)
- ✅ Configuración (acceso a configuración de empresa)
- ✅ Puede abrir/cerrar caja 🔥

**Restricciones:**
- ❌ NO accede a Dashboard
- ❌ NO puede crear/eliminar productos ni ajustar stock
- ❌ NO accede a Pedidos
- ❌ NO accede a Panel de Administración

---

### 3. **ADMIN_VENDEDOR**
**Acceso:** Todo lo de Vendedor + Dashboard Avanzado + Permisos extendidos

**Módulos disponibles:**
- ✅ Punto de Venta (crear, editar ventas)
- ✅ Inventario (solo consulta con exportación)
- ✅ Cambios y Devoluciones (procesar y aprobar)
- ✅ Dashboard **AVANZADO** (utilidades, márgenes, valor inventario) 🔥
- ✅ Historial de Caja
- ✅ Puede abrir/cerrar caja

**Restricciones:**
- ❌ NO puede editar productos ni ajustar stock
- ❌ NO accede a Pedidos
- ❌ NO accede a Panel de Administración

---

### 4. **ADMIN_GESTOR**
**Acceso:** Todo lo de Gestor + Dashboard Avanzado + Permisos de eliminación

**Módulos disponibles:**
- ✅ Inventario (crear, editar, eliminar productos) 🔥
- ✅ Pedidos (crear, editar, eliminar, aprobar) 🔥
- ✅ Dashboard **AVANZADO** (utilidades, márgenes, valor inventario) 🔥
- ✅ Historial de Caja
- ✅ Puede ajustar stock y registrar compras

**Restricciones:**
- ❌ NO accede a Punto de Venta
- ❌ NO accede a Cambios/Devoluciones
- ❌ NO accede a Panel de Administración

---

### 5. **ADMIN**
**Acceso:** Todos los módulos MENOS Panel de Admin (usuarios)

**Módulos disponibles:**
- ✅ Punto de Venta (completo)
- ✅ Inventario (completo con eliminación)
- ✅ Pedidos (completo con eliminación)
- ✅ Cambios y Devoluciones (completo)
- ✅ Dashboard **COMPLETO** (todas las métricas)
- ✅ Configuración de Empresa
- ✅ Historial de Caja
- ✅ Puede abrir/cerrar caja
- ✅ Exportar reportes y datos

**Restricciones:**
- ❌ NO accede a Panel de Administración de Usuarios 🚫

---

### 6. **SUPERADMIN**
**Acceso:** TOTAL (todos los módulos sin restricciones)

**Módulos disponibles:**
- ✅ Panel de Administración de Usuarios
- ✅ Crear, editar, eliminar usuarios
- ✅ Asignar roles
- ✅ Todos los módulos del rol ADMIN
- ✅ Todas las funcionalidades del sistema

**Sin restricciones** ✅

---

## 📊 MATRIZ DE PERMISOS DETALLADA

| **Permiso** | Gestor | Vendedor | Admin Vendedor | Admin Gestor | Admin | SuperAdmin |
|------------|:------:|:--------:|:--------------:|:------------:|:-----:|:----------:|
| **PANEL DE ADMINISTRACIÓN** |
| Acceder al Panel de Admin | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Gestionar Usuarios | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver Usuarios | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Crear Usuarios | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Eliminar Usuarios | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **VENTAS / PUNTO DE VENTA** |
| Ver Ventas | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Crear Ventas | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Editar Ventas | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Cancelar Ventas | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Abrir/Cerrar Caja 🔥 | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **INVENTARIO** |
| Ver Inventario | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar Inventario 🔥 | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Crear Productos | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Eliminar Productos | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Ajustar Stock | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Registrar Compras | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Importar Productos | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Exportar Inventario | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **PEDIDOS** |
| Ver Pedidos | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Crear Pedidos | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Editar Pedidos | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Eliminar Pedidos | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **CAMBIOS Y DEVOLUCIONES** |
| Ver Cambios | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Procesar Cambios | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Aprobar/Cancelar Cambios | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **DASHBOARD** |
| Acceder al Dashboard | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Ver Métricas Básicas | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Ver Utilidades/Márgenes 🔥 | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Ver Valor de Inventario | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Analytics Avanzados | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Exportar Dashboard | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **CONFIGURACIÓN Y REPORTES** |
| Acceder a Configuración 🔥 | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Editar Info de Empresa | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ver Historial de Caja | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Exportar Reportes | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## 🔐 NAVEGACIÓN POR ROL

### Ruta por defecto al iniciar sesión:

| Rol | Ruta Inicial |
|-----|-------------|
| **superadmin** | `/admin/users` |
| **admin** | `/dashboard` |
| **admin_vendedor** | `/ventas` |
| **admin_gestor** | `/inventario` |
| **vendedor** | `/ventas` |
| **gestor** | `/inventario` |

### Acceso a rutas:

| Ruta | Roles Permitidos |
|------|------------------|
| `/admin/users` | superadmin |
| `/dashboard` | admin_vendedor, admin_gestor, admin, superadmin |
| `/ventas` | vendedor, admin_vendedor, admin, superadmin |
| `/inventario` | Todos (con permisos filtrados) |
| `/pedidos` | gestor, admin_gestor, admin, superadmin |
| `/cambios-devoluciones` | vendedor, admin_vendedor, admin, superadmin |
| `/historial-caja` | admin_vendedor, admin_gestor, admin, superadmin |
| `/configuracion` | admin, superadmin |
| `/perfil` | Todos |

---

## 🛠️ IMPLEMENTACIÓN TÉCNICA

### Uso del hook `usePermissions`:

```javascript
import usePermissions from '@/hooks/usePermissions';

function MiComponente() {
  const permissions = usePermissions();

  // Verificar rol
  if (permissions.isSuperAdmin) {
    // Mostrar panel de admin
  }

  // Verificar permiso específico
  if (permissions.canEditProduct) {
    // Mostrar botón editar
  }

  // Verificar acceso a ruta
  if (permissions.canAccessRoute('/dashboard')) {
    // Renderizar enlace
  }

  // Obtener nombre del rol
  const roleName = permissions.getRoleName(); // "Super Administrador"

  // Verificar dashboard avanzado
  if (permissions.canViewFinancialMetrics) {
    // Mostrar utilidades y márgenes
  }
}
```

---

## 📝 GUÍA DE MIGRACIÓN

### Paso 1: Ejecutar `ROLES_MIGRATION.sql` en Supabase

```sql
-- El script actualiza el ENUM user_role con los 6 nuevos roles
```

### Paso 2: Actualizar usuarios existentes

Si tienes usuarios con roles antiguos:

```sql
-- Ejemplo: Migrar 'administrador' a 'admin'
UPDATE usuarios SET rol = 'admin'::user_role 
WHERE rol::TEXT = 'administrador';

-- Migrar 'usuario' a 'vendedor'
UPDATE usuarios SET rol = 'vendedor'::user_role 
WHERE rol::TEXT = 'usuario';
```

### Paso 3: Verificar componentes que usan `usePermissions()`

El hook ahora incluye:
- `isAdminVendedor`
- `isAdminGestor`
- Permisos para dashboard: `canViewFinancialMetrics`, `canViewInventoryValue`, etc.

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### 1. **Dashboard Diferenciado**
Los roles básicos (**gestor**, **vendedor**) ven el dashboard pero sin métricas financieras sensibles.

### 2. **Admin ≠ SuperAdmin**
El rol **admin** NO accede al panel de usuarios. Solo **superadmin** gestiona usuarios.

### 3. **Roles Admin Específicos**
- **admin_vendedor**: Especialista en ventas con analytics
- **admin_gestor**: Especialista en inventario/pedidos con analytics

### 4. **Seguridad en RLS**
Asegúrate de que las políticas RLS de Supabase coincidan con estos permisos.

---

## 🔄 PRÓXIMOS PASOS

1. ✅ Ejecutar `ROLES_MIGRATION.sql` en Supabase
2. ✅ Verificar que `usePermissions.js` esté actualizado
3. ✅ Actualizar `Sidebar.jsx` para mostrar/ocultar opciones por rol
4. ✅ Filtrar métricas en `DashboardPage.jsx` según `canViewFinancialMetrics`
5. ✅ Probar cada rol en desarrollo

---

**¿Tienes dudas sobre los permisos?** Revisa la matriz de permisos o consulta este documento.
