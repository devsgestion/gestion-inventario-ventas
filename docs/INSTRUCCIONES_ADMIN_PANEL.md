# Instrucciones para Actualizar Panel de Administración

## Cambios Realizados

Se ha actualizado el Panel de Administración (`AdminUsersPage.jsx`) para incluir los nuevos roles del sistema y la funcionalidad de edición de roles.

### Nuevos Roles Soportados

El sistema ahora soporta **6 roles diferentes**:

1. **Vendedor** - Inventario + POS + Cambios/Devoluciones
2. **Gestor** - Solo Inventario + Pedidos
3. **Admin Vendedor** - Todo lo de vendedor + Dashboard avanzado
4. **Admin Gestor** - Todo lo de gestor + Dashboard avanzado
5. **Admin** - Todos los módulos excepto Panel de Admin (usuarios)
6. **Superadmin** - Control total del sistema

### Funcionalidades Nuevas

✅ **Dropdown de roles actualizado** - Al crear un nuevo usuario, ahora se muestran los 6 roles con descripciones
✅ **Botón "Editar Rol"** - Permite cambiar el rol de usuarios existentes
✅ **Modal de edición de rol** - Interfaz amigable para cambiar roles con validaciones
✅ **Badges de roles** - Colores distintivos para cada rol en la tabla de usuarios
✅ **Validaciones de seguridad** - Un usuario no puede cambiar su propio rol

### Colores de los Badges de Roles

- **Superadmin**: Morado (#a855f7) 🟣
- **Admin**: Azul (#3b82f6) 🔵
- **Admin Gestor**: Naranja (#f97316) 🟠
- **Admin Vendedor**: Cyan (#0ea5e9) 🔷
- **Vendedor**: Verde (#22c55e) 🟢
- **Gestor**: Amarillo (#eab308) 🟡

---

## ⚠️ ACCIÓN REQUERIDA: Ejecutar en Supabase

Para que la funcionalidad de edición de roles funcione correctamente, **DEBES EJECUTAR** el siguiente script SQL en tu base de datos Supabase:

### Archivo: `UPDATE_USER_ROLE_FUNCTION.sql`

Ubicación: `docs/UPDATE_USER_ROLE_FUNCTION.sql`

Este archivo contiene:

1. **Función `update_user_role`**: Permite actualizar el rol de un usuario
2. **Validaciones de seguridad**: Solo superadmin puede cambiar roles
3. **Tabla de auditoría opcional**: `audit_log` para registrar cambios de roles

### Pasos para Ejecutar:

1. Abre tu proyecto en Supabase Dashboard
2. Ve a **SQL Editor**
3. Abre el archivo `docs/UPDATE_USER_ROLE_FUNCTION.sql`
4. Copia todo el contenido del archivo
5. Pégalo en el SQL Editor de Supabase
6. Click en **"Run"** o **"Ejecutar"**
7. Verifica que no haya errores en la consola

### Tabla de Auditoría (Opcional pero Recomendada)

Si deseas llevar un registro de todos los cambios de roles, descomenta y ejecuta también la sección de creación de la tabla `audit_log` al final del archivo SQL.

Esta tabla te permitirá:
- Ver quién cambió el rol de un usuario
- Cuándo se hizo el cambio
- Qué rol tenía antes y después
- Auditoría completa de cambios administrativos

---

## Probando la Funcionalidad

Una vez ejecutado el script SQL, puedes probar:

1. **Acceder como superadmin** al Panel Admin (`/admin`)
2. **Ver la lista de usuarios** con sus roles en badges de colores
3. **Crear un nuevo usuario** seleccionando uno de los 6 roles disponibles
4. **Editar el rol** de un usuario existente:
   - Click en "Editar Rol"
   - Seleccionar el nuevo rol del dropdown
   - Guardar cambios
5. **Verificar que no puedes editar tu propio rol** (mensaje de error)

---

## Estructura de Archivos Modificados

```
src/
├── pages/
│   └── AdminUsersPage.jsx          ✅ Actualizado con todos los roles y edición
├── styles/
│   └── AdminPage.css               ✅ Estilos para badges de nuevos roles
docs/
├── UPDATE_USER_ROLE_FUNCTION.sql   🆕 Función SQL para actualizar roles
└── INSTRUCCIONES_ADMIN_PANEL.md    🆕 Este archivo
```

---

## Permisos por Rol (Referencia)

| Acción | Vendedor | Gestor | Admin Vendedor | Admin Gestor | Admin | Superadmin |
|--------|----------|--------|----------------|--------------|-------|------------|
| POS/Ventas | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Cambios/Devoluciones | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Ver inventario | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar inventario | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Gestionar pedidos | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Dashboard | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Reportes avanzados | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Cambiar roles | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Soporte

Si encuentras algún error:

1. Verifica que ejecutaste el script SQL `UPDATE_USER_ROLE_FUNCTION.sql`
2. Revisa la consola del navegador para errores de JavaScript
3. Revisa los logs de Supabase para errores de base de datos
4. Asegúrate de que tu usuario tenga rol `superadmin` en la tabla `perfiles`

---

## Notas Técnicas

- La función `update_user_role` usa `SECURITY DEFINER` para ejecutarse con privilegios elevados
- Solo usuarios con rol `superadmin` pueden ejecutar esta función
- La validación de roles se hace tanto en el frontend como en el backend
- Los badges de roles se actualizan automáticamente al refrescar la lista
- El modal de edición muestra el rol actual antes de cambiarlo
