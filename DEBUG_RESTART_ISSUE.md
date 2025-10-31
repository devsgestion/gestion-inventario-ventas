# 🔍 Diagnóstico de Reinicios - Pasos de Depuración

## Cambios Aplicados para Estabilizar

### ✅ 1. useAuth.jsx
- Removido throttling de 500ms
- Eliminado sessionStorage blocking
- Removido bloqueo de 30 segundos en loadProfile
- Simplificado lógica de SIGNED_IN

### ✅ 2. ProtectedRoute.jsx
- Agregado `timeoutExecutedRef` para prevenir múltiples timeouts
- Timeout solo se ejecuta una vez

### ✅ 3. usePageVisibility.js
- Simplificado: solo rastrea `isVisible`
- Removido `wasHidden`, `needsRecovery` y `recoveryExecutedRef`

### ✅ 4. useInventario.js
- Agregado `cajaStatusFetchedRef`
- `checkCajaStatus` solo se llama UNA VEZ al montar

## 🔧 Posibles Causas Restantes

### A. Botones de Recarga Manual (ProtectedRoute.jsx)
**Ubicación:** Líneas 30 y 57
```jsx
<button onClick={() => window.location.reload()}>
  Recargar si tarda mucho
</button>
```
**Problema:** Si los usuarios hacen clic por impaciencia
**Solución:** Remover o deshabilitar después del primer clic

### B. Supabase Auth Events Duplicados
**Archivo:** supabaseClient.js
- Los eventos `online/offline` están activos
- Puede haber múltiples listeners de auth

### C. Hot Module Replacement (HMR) de Vite
**Archivo:** vite.config.js
- HMR timeout configurado a 30 segundos
- Puede estar recargando durante desarrollo

### D. Supabase Realtime
**Archivo:** useInventario.js
- Canal de Realtime activo
- Puede estar disparando refrescos excesivos

## 📋 Pasos de Depuración Recomendados

### Paso 1: Revisar Consola del Navegador (F12)
Buscar mensajes con:
- `🔴 ProtectedRoute timeout`
- `⚡ Realtime Update`
- `Auth event:`
- `Bootstrap`
- `[vite]` o `[HMR]`
- Errores de red o CORS

### Paso 2: Verificar Network Tab
- ¿Hay muchas llamadas a `/auth/v1/token`?
- ¿Hay llamadas fallidas repetitivas?
- ¿Hay llamadas a `/realtime/v1`?

### Paso 3: Verificar Application Tab > Local Storage
- `supabase.auth.token` - ¿Cambia constantemente?
- Otros valores de tour o configuración

### Paso 4: Deshabilitar HMR Temporalmente
Ejecutar en modo producción:
```bash
npm run build
npm run preview
```
Si el problema desaparece → Es HMR de Vite

### Paso 5: Agregar Logs de Depuración
Modificar `useAuth.jsx` para agregar más logs:
```javascript
console.log('🔵 [useAuth] Renderizado', { 
  isBootstrapping, 
  hasSession: !!session, 
  hasProfile: !!perfil 
});
```

### Paso 6: Revisar Variables de Entorno
```bash
# Verificar que estén definidas
echo $env:VITE_SUPABASE_URL
echo $env:VITE_SUPABASE_ANON_KEY
```

## 🎯 Próximos Pasos Sugeridos

1. **Inmediato:** Revisar consola del navegador y compartir errores
2. **Si continúa:** Probar en modo producción (`npm run build && npm run preview`)
3. **Si persiste:** Agregar más logs de depuración
4. **Última opción:** Deshabilitar Realtime temporalmente

## 🚨 Señales de Alerta

- **Múltiples "Bootstrap finalizado"** → useAuth se está re-ejecutando
- **Muchos "Auth event: SIGNED_IN"** → Eventos duplicados
- **"[vite] page reload"** → HMR causando recargas
- **"ProtectedRoute timeout"** → Bootstrap está tardando demasiado
- **Errores 401/403** → Token inválido, forzando logout/login

## 💡 Soluciones Adicionales si Todo lo Anterior Falla

### Opción A: Deshabilitar Detección de URL en Auth
```javascript
// supabaseClient.js
detectSessionInUrl: false, // Cambiar a false
```

### Opción B: Aumentar Timeout de Bootstrap
```javascript
// useAuth.jsx - línea ~110
bootstrapTimeoutId = setTimeout(() => {
  // ...
}, 2000); // Aumentar de 800 a 2000
```

### Opción C: Deshabilitar Auto-refresh de Token
```javascript
// supabaseClient.js
autoRefreshToken: false, // Solo para debug
```

### Opción D: Remover Realtime Temporalmente
Comentar el `useEffect` de Realtime en `useInventario.js` (líneas 75-104)
