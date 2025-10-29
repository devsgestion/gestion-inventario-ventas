# 🔐 CONFIGURACIÓN DEL SISTEMA DE ADMINISTRACIÓN

## ⚠️ IMPORTANTE: Ejecuta estos pasos EN ORDEN

### **PASO 1: Ejecutar el SQL en Supabase**

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Ve a la sección **SQL Editor** (icono de base de datos en el menú lateral)
3. Abre el archivo `docs/SQL_ADD_ADMIN_SYSTEM.sql`
4. **Copia TODO el contenido** del archivo
5. **Pégalo en el SQL Editor** de Supabase
6. Haz clic en **Run** (o presiona Ctrl+Enter)
7. Verifica que veas el mensaje: ✅ **Success. No rows returned**

---

### **PASO 2: Establecer tu usuario como SUPERADMIN**

Después de ejecutar el SQL, necesitas configurar tu email como superadmin:

1. En el mismo **SQL Editor** de Supabase
2. Ejecuta este comando (reemplaza `tu-email@ejemplo.com` con tu email real):

```sql
UPDATE perfiles 
SET rol = 'superadmin' 
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'tu-email@ejemplo.com'
);
```

3. Verifica que se actualizó correctamente:

```sql
SELECT p.id, u.email, p.nombre_completo, p.rol, p.activo
FROM perfiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'tu-email@ejemplo.com';
```

Deberías ver tu usuario con `rol = 'superadmin'` ✅

---

### **PASO 3: Cerrar Sesión y Volver a Iniciar**

1. Sal de tu sesión actual en la aplicación (Cerrar Sesión)
2. Vuelve a iniciar sesión con tu email
3. Ahora deberías ver el menú **👥 Panel de Admin** en el sidebar

---

## 📋 ¿Qué hace este sistema?

### **Roles disponibles:**
- **superadmin** → Control total del sistema, puede crear usuarios
- **admin** → Puede gestionar inventario y ventas de su empresa
- **usuario** → Solo puede realizar ventas

### **Funciones principales:**

✅ **Solo superadmins pueden:**
- Acceder a `/admin`
- Ver la lista de todos los usuarios del sistema
- Crear nuevos usuarios y asignarles empresas
- Activar/desactivar usuarios
- Cambiar roles de usuarios (próximamente)

✅ **Seguridad implementada:**
- La ruta `/register` ya NO es pública
- Solo superadmins pueden crear cuentas
- Cada usuario está vinculado a una empresa
- Sistema de auditoría (quién creó a quién)
- Control de usuarios activos/inactivos

---

## 🧪 Prueba el sistema

1. Inicia sesión como superadmin
2. Ve a **Panel de Admin** (`/admin`)
3. Verás estadísticas de usuarios
4. Haz clic en **+ Crear Nuevo Usuario**
5. Llena el formulario:
   - Email del nuevo usuario
   - Contraseña temporal
   - Nombre completo
   - Nombre de su empresa
   - Rol (usuario, admin, o superadmin)
6. El usuario se crea automáticamente y puede iniciar sesión

---

## 🔍 Verificación

Para verificar que todo funciona:

```sql
-- Ver todos los usuarios y sus roles
SELECT 
    u.email,
    p.nombre_completo,
    p.rol,
    p.activo,
    e.nombre as empresa
FROM perfiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN empresas e ON e.id = p.empresa_id
ORDER BY p.created_at DESC;
```

---

## ⚠️ Troubleshooting

### **No veo el menú "Panel de Admin"**
- Verifica que tu usuario tenga `rol = 'superadmin'` en la base de datos
- Cierra sesión y vuelve a iniciar

### **Error al crear usuario**
- Verifica que ejecutaste el SQL completo
- Verifica que tu usuario es superadmin
- Revisa la consola del navegador (F12) para más detalles

### **No puedo acceder a /admin**
- El componente `AdminUsersPage` valida que seas superadmin
- Si no lo eres, te redirige automáticamente a `/inventario`

---

## 📝 Notas importantes

- El primer superadmin DEBE configurarse manualmente con SQL
- Una vez configurado, ese superadmin puede crear más usuarios
- Los usuarios nuevos reciben email de confirmación (opcional)
- Las contraseñas temporales deben tener mínimo 6 caracteres
- Cada usuario pertenece a UNA empresa

---

## 🚀 ¡Listo!

Una vez completados estos 3 pasos, tendrás control total sobre quién puede usar tu sistema.

**¿Necesitas ayuda?** Revisa los logs en la consola del navegador (F12) o en Supabase → Logs.
