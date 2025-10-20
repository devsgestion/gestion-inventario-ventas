# 🖨️ Guía de Configuración de Impresoras - GestiON

## 📋 Requisitos Previos

### Hardware Necesario:
- **Impresora térmica de tickets** (58mm o 80mm recomendado)
- **Cable USB** o conexión **Bluetooth/WiFi**
- **Drivers de la impresora** instalados en el sistema

### Software Compatible:
- ✅ **Google Chrome** (Recomendado)
- ✅ **Microsoft Edge** 
- ✅ **Firefox** (funcionalidad limitada)
- ❌ Safari (no soporta todas las funciones)

---

## 🔧 Configuración Paso a Paso

### 1. **Conexión Física de la Impresora**

#### Para Impresoras USB:
1. Conecta la impresora al puerto USB de tu computadora
2. Enciende la impresora
3. Espera que Windows/macOS detecte automáticamente el dispositivo

#### Para Impresoras Bluetooth:
1. Activa el Bluetooth en la impresora (consulta manual)
2. Ve a **Configuración → Bluetooth** en tu sistema
3. Busca y conecta la impresora
4. Ingresa el PIN si es requerido (usualmente `0000` o `1234`)

#### Para Impresoras WiFi:
1. Conecta la impresora a tu red WiFi (botón WPS o configuración manual)
2. Anota la dirección IP asignada a la impresora
3. Agrega la impresora por IP en la configuración del sistema

---

### 2. **Instalación de Drivers**

#### Windows 10/11:
```bash
# Opción 1: Detección automática
1. Ve a Configuración → Dispositivos → Impresoras y escáneres
2. Clic en "Agregar impresora o escáner"
3. Selecciona tu impresora de la lista
4. Sigue el asistente de instalación

# Opción 2: Driver manual
1. Descarga drivers desde el sitio web del fabricante
2. Ejecuta el instalador como administrador
3. Reinicia el sistema si es requerido
```

#### macOS:
```bash
# Configuración de impresora
1. Ve a Preferencias del Sistema → Impresoras y Fax
2. Clic en el botón "+" para agregar impresora
3. Selecciona tu impresora de la lista
4. macOS descargará drivers automáticamente si están disponibles
```

#### Linux (Ubuntu/Debian):
```bash
# Instalar CUPS (sistema de impresión)
sudo apt update
sudo apt install cups cups-client

# Configurar impresora
1. Abre http://localhost:631 en tu navegador
2. Ve a "Administration" → "Add Printer"
3. Selecciona tu impresora y configura
```

---

### 3. **Configuración del Tamaño de Papel**

#### Windows:
```
1. Panel de Control → Dispositivos e impresoras
2. Clic derecho en tu impresora → "Propiedades de impresora"
3. Pestaña "Opciones avanzadas" → "Tamaño de papel"
4. Seleccionar:
   - Para 58mm: "Custom 58 x 200mm" 
   - Para 80mm: "Custom 80 x 200mm"
5. Aplicar → Aceptar
```

#### macOS:
```
1. Preferencias del Sistema → Impresoras y Fax
2. Seleccionar impresora → "Opciones y suministros"
3. Pestaña "Driver" → "Tamaño de papel"
4. "Gestionar tamaños personalizados..."
5. Crear nuevo tamaño: 80mm x 200mm (o 58mm x 200mm)
```

---

### 4. **Configuración en GestiON**

#### Acceder a la Configuración:
1. Ir a **Configuración** → **📄 Documentos y Facturas**
2. Clic en **🖨️ Configurar Impresora**

#### Configurar Parámetros:
- **Impresora:** Seleccionar de la lista detectada
- **Ancho de Papel:** 
  - `58mm` - Tickets muy compactos
  - `80mm` - **Recomendado** para mejor legibilidad
  - `A4` - Hojas completas para archivos
- **Tamaño de Fuente:** `12px` (recomendado)
- **Márgenes:** `3mm` (recomendado)
- **Auto-impresión:** Activar para imprimir automáticamente tras cada venta

#### Prueba de Impresión:
1. Clic en **🧪 Prueba de Impresión**
2. Verificar que el ticket se imprime correctamente
3. Ajustar configuración si es necesario
4. **Guardar Configuración**

---

## 🛠️ Solución de Problemas Comunes

### Problema: "No se detecta la impresora"
**Soluciones:**
- ✅ Verificar que la impresora esté encendida y conectada
- ✅ Reinstalar drivers de la impresora
- ✅ Probar con un cable USB diferente
- ✅ Reiniciar el servicio de cola de impresión:
  ```bash
  # Windows (ejecutar como administrador)
  net stop spooler
  net start spooler
  ```

### Problema: "El ticket se corta o no imprime completo"
**Soluciones:**
- ✅ Verificar configuración de tamaño de papel en el sistema
- ✅ Ajustar márgenes en GestiON (probar con `0mm`)
- ✅ Verificar que hay papel suficiente en la impresora
- ✅ Cambiar ancho de papel en GestiON (58mm → 80mm)

### Problema: "El texto se ve muy pequeño o muy grande"
**Soluciones:**
- ✅ Ajustar **Tamaño de Fuente** en configuración GestiON
- ✅ Cambiar **Ancho de Papel** (80mm permite texto más grande)
- ✅ Verificar configuración DPI de la impresora en el sistema

### Problema: "La impresión es muy lenta"
**Soluciones:**
- ✅ Actualizar drivers de la impresora
- ✅ Usar conexión USB en lugar de Bluetooth para mejor velocidad
- ✅ Verificar que no hay trabajos pendientes en la cola de impresión
- ✅ Reducir **Número de Copias** en configuración

### Problema: "No imprime en Chrome/navegador"
**Soluciones:**
- ✅ Verificar que Chrome puede acceder a la impresora (permitir permisos)
- ✅ Probar con **Microsoft Edge** como alternativa
- ✅ Verificar configuración de seguridad del navegador
- ✅ Hacer la prueba en modo incógnito para descartar extensiones

---

## 📋 Impresoras Recomendadas

### Impresoras Térmicas 80mm (Recomendadas):
- **EPSON TM-T20III** - USB/Ethernet - ⭐⭐⭐⭐⭐
- **BIXOLON SRP-330II** - USB/Serial - ⭐⭐⭐⭐
- **Star Micronics TSP143III** - USB/Bluetooth - ⭐⭐⭐⭐⭐
- **Citizen CT-S310A** - USB - ⭐⭐⭐⭐

### Impresoras Térmicas 58mm (Económicas):
- **MUNBYN ITPP047** - USB/Bluetooth - ⭐⭐⭐⭐
- **Rongta RP58U** - USB - ⭐⭐⭐
- **GOOJPRT PT210** - Bluetooth - ⭐⭐⭐

### Características a Buscar:
- ✅ **Velocidad:** Mínimo 150mm/s
- ✅ **Conectividad:** USB (más estable) + Bluetooth/WiFi (opcional)
- ✅ **Drivers:** Compatibles con Windows/macOS/Linux
- ✅ **Papel:** Térmico de 80mm x 80mm (rollos estándar)

---

## 🔒 Consideraciones de Seguridad

### Permisos del Navegador:
- GestiON requiere permisos de impresión del navegador
- La primera vez se solicitará confirmación
- La configuración se guarda localmente en cada dispositivo

### Privacidad de Datos:
- Las configuraciones de impresora se almacenan solo en tu navegador local
- No se envían datos de impresión a servidores externos
- Cada usuario configura su propia impresora independientemente

---

## 📞 Soporte Técnico

### Información a Preparar:
- Modelo exacto de tu impresora
- Sistema operativo y versión
- Navegador utilizado
- Captura de pantalla del error (si aplica)

### Contacto:
- 📧 Email: soporte@gestion.com
- 💬 Chat en vivo: Disponible en la aplicación
- 📱 WhatsApp: +57 300 123 4567

---

**💡 Tip Final:** Para mejores resultados, usa siempre **impresoras térmicas de 80mm** con **Google Chrome** en conexión **USB**. Esta combinación ofrece la máxima compatibilidad y velocidad de impresión.
