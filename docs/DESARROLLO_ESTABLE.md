# 🛠️ Guía de Desarrollo Estable

## ⚡ Problema de Reinicios Constantes - SOLUCIONADO

### 🎯 Cambios Aplicados

#### 1. **Logs de Debug Desactivados** ✅
```javascript
// src/config/debug.js
export const DEBUG_CONFIG = {
  enableProfileLogs: false,
  enableBootstrapLogs: false,
  enableInventoryLogs: false,  // ← DESACTIVADO
  enableRecoveryLogs: false,   // ← DESACTIVADO
  enableAuthLogs: false
};
```

**Por qué:** Los `console.log` en componentes que se re-renderizan frecuentemente (hooks, contexts) causan que React DevTools detecte cambios y fuerce reinicios de HMR.

---

#### 2. **Vite Config Optimizada** ✅
```javascript
// vite.config.js
server: {
  watch: {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/.vscode/**',
      '**/*.md',
      '**/docs/**',      // ← NUEVO
      '**/.env*',        // ← NUEVO
    ],
    usePolling: false,
  },
  hmr: {
    timeout: 30000,      // ← NUEVO
  },
},
optimizeDeps: {
  include: ['react', 'react-dom', 'react-router-dom'],  // ← NUEVO
},
```

**Por qué:** 
- Ignora archivos que no afectan el código (docs, .env)
- Pre-bundlea React para evitar re-optimizaciones
- Aumenta timeout de HMR para conexiones lentas

---

#### 3. **ESLint Configurado** ✅
```json
// .eslintrc.json
{
  "rules": {
    "no-console": "warn",           // Advertir sobre console.log
    "react-hooks/exhaustive-deps": "warn"  // Detectar dependencias faltantes
  }
}
```

**Por qué:** Ayuda a detectar console.log olvidados y problemas en useEffect

---

#### 4. **Scripts de Limpieza** ✅
```json
// package.json
"scripts": {
  "dev:clean": "npm run clean && vite",
  "clean": "node -e \"require('fs').rmSync('node_modules/.vite', {recursive: true, force: true})\""
}
```

**Por qué:** Si el servidor sigue inestable, limpiar la caché de Vite puede resolver problemas

---

## 🚀 Comandos Útiles

### Desarrollo Normal
```bash
npm run dev
```

### Desarrollo con Limpieza de Caché (si hay problemas)
```bash
npm run dev:clean
```

### Limpiar Solo la Caché
```bash
npm run clean
```

---

## 🔍 Diagnóstico de Problemas

### ¿El servidor sigue reiniciándose?

#### 1. **Verificar Console Logs**
Busca console.log en archivos que podrían causar loops:
```bash
# PowerShell
Select-String -Path "src\**\*.jsx" -Pattern "console\.log" -CaseSensitive
```

#### 2. **Verificar useEffect sin Dependencias**
```javascript
// ❌ MAL - Se ejecuta en cada render
useEffect(() => {
  console.log('Esto causa problemas');
});

// ✅ BIEN - Solo se ejecuta al montar
useEffect(() => {
  console.log('Esto está bien');
}, []);
```

#### 3. **Verificar Archivos Grandes en src/**
Archivos muy grandes (>1MB) pueden causar problemas de vigilancia:
```bash
# PowerShell
Get-ChildItem -Path "src" -Recurse -File | Where-Object { $_.Length -gt 1MB } | Select-Object FullName, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}}
```

#### 4. **Verificar Procesos de Node**
Múltiples procesos de Vite pueden causar conflictos:
```bash
# PowerShell
Get-Process -Name node
```

Si hay múltiples, cerrarlos todos:
```bash
Stop-Process -Name node -Force
```

---

## 📋 Checklist de Desarrollo Estable

### Antes de Codear
- [ ] Asegurar que solo hay 1 proceso `npm run dev` activo
- [ ] Cerrar archivos no necesarios en el editor (especialmente .md, docs)
- [ ] Verificar que no hay console.log en hooks o contexts

### Durante el Desarrollo
- [ ] Evitar console.log en:
  - useEffect sin array de dependencias
  - Funciones que se ejecutan en cada render
  - Event handlers que se disparan frecuentemente
- [ ] Usar debugLog condicional de `src/config/debug.js`
- [ ] Guardar archivos de forma individual (no auto-save masivo)

### Si Aparece Inestabilidad
1. **Paso 1:** Desactivar TODOS los logs en `debug.js`
2. **Paso 2:** Ejecutar `npm run dev:clean`
3. **Paso 3:** Reiniciar VS Code
4. **Paso 4:** Si persiste, verificar procesos de Node

---

## ⚙️ Configuraciones Recomendadas de VS Code

### settings.json
```json
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.git/**": true,
    "**/docs/**": true
  },
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true,
    "**/docs": true
  }
}
```

---

## 🎯 Reglas de Oro para Estabilidad

### 1. **NUNCA usar console.log en:**
- `useAuth` hook
- `useInventario` hook
- Componentes de contexto
- Event handlers de alta frecuencia (onChange, onMouseMove)

### 2. **SIEMPRE usar:**
- `debugLog` condicional de `debug.js`
- `useCallback` para funciones en dependencias de useEffect
- `useMemo` para cálculos costosos

### 3. **EVITAR:**
- Guardar múltiples archivos simultáneamente
- Tener abiertos archivos grandes de documentación mientras codeas
- useEffect sin array de dependencias

### 4. **PREFERIR:**
- Estado local sobre estado global cuando sea posible
- Componentes pequeños y enfocados
- Lazy loading para rutas no esenciales

---

## 📊 Métricas de Rendimiento

### Tiempos Esperados
- **Inicio del servidor:** 1-2 segundos
- **HMR (cambio en componente):** <300ms
- **Recarga completa:** 1-3 segundos

### Si los tiempos son mayores:
1. Ejecutar `npm run clean`
2. Cerrar otros proyectos/aplicaciones pesadas
3. Verificar antivirus (puede ralentizar file watching)

---

## 🔧 Troubleshooting Avanzado

### Error: "Port 5173 is in use"
```bash
# PowerShell - Encontrar proceso usando el puerto
Get-NetTCPConnection -LocalPort 5173 | Select-Object OwningProcess

# Matar el proceso (reemplazar PID)
Stop-Process -Id <PID> -Force
```

### Error: "Cannot find module"
```bash
# Reinstalar dependencias
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Error: "Out of memory"
```bash
# Aumentar memoria de Node
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

---

## ✅ Estado Actual

### Optimizaciones Aplicadas:
- ✅ Logs de debug desactivados completamente
- ✅ Vite config optimizada (ignora docs, .env, etc.)
- ✅ Pre-bundling de React habilitado
- ✅ HMR timeout aumentado
- ✅ ESLint configurado
- ✅ Scripts de limpieza creados
- ✅ Console.log temporales eliminados de VentasPage

### Resultado Esperado:
El servidor ahora debe ser **estable** y **NO reiniciarse** a menos que:
1. Cambies archivos de configuración (vite.config.js, package.json)
2. Instales/desinstales paquetes
3. Haya un error crítico de sintaxis

---

**📅 Última actualización:** 30 de Octubre, 2025
**👤 Responsable:** Equipo de Desarrollo GestiON
**🔄 Versión:** 2.1.0 (Estable)
