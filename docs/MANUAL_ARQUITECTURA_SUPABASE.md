# 📘 Manual de Arquitectura: Frontend + Supabase

Este documento explica cómo funciona la conexión entre tu aplicación React (Frontend) y Supabase (Backend-as-a-Service), y cómo manejar los datos sin tener un servidor backend tradicional (como Node.js, Python o PHP).

---

## 1. ¿Cómo funciona sin Backend?

En una arquitectura tradicional, tienes:
`Frontend (React) <--> API (Node.js/Express) <--> Base de Datos`

En tu proyecto, usamos una arquitectura **Serverless / BaaS (Backend as a Service)**:
`Frontend (React) <--> Supabase (API Automática + BD)`

**Supabase** actúa como tu backend. Te proporciona automáticamente una API REST segura basada en tu base de datos PostgreSQL. No necesitas crear "endpoints" manualmente; Supabase los crea por ti al instante cuando creas una tabla.

---

## 2. La Conexión: `supabaseClient.js`

El corazón de la conexión está en `src/api/supabaseClient.js`.

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { ... });
```

*   **`supabaseUrl`**: La dirección de tu proyecto en la nube.
*   **`supabaseAnonKey`**: Una llave pública que permite al frontend "hablar" con la base de datos.
*   **Seguridad**: Aunque esta llave es pública, **no da acceso total**. El acceso real se controla mediante **RLS (Row Level Security)** en la base de datos (ver sección 5).

---

## 3. Endpoints vs. Consultas Directas

En lugar de llamar a una URL como `fetch('/api/productos')`, usas la librería de cliente de Supabase para construir la consulta directamente en Javascript.

### A. Leer Datos (SELECT)
**Tradicional:** `GET /api/productos`
**Supabase:**
```javascript
const { data, error } = await supabase
  .from('productos')          // Tabla
  .select('*')                // Columnas (o 'id, nombre, precio')
  .eq('empresa_id', 123)      // Filtro (WHERE)
  .order('nombre');           // Orden
```

### B. Insertar Datos (INSERT)
**Tradicional:** `POST /api/productos`
**Supabase:**
```javascript
const { error } = await supabase
  .from('productos')
  .insert({
    nombre: 'Coca Cola',
    precio: 2500,
    empresa_id: 123
  });
```

### C. Actualizar Datos (UPDATE)
**Tradicional:** `PUT /api/productos/5`
**Supabase:**
```javascript
const { error } = await supabase
  .from('productos')
  .update({ precio: 3000 })
  .eq('id', 5); // IMPORTANTE: Siempre usar .eq() para no actualizar todo
```

---

## 4. Lógica Compleja: RPC (Remote Procedure Calls)

A veces necesitas hacer algo más complejo que solo leer o escribir, como "Cerrar Caja" (que implica sumar ventas, calcular totales, bloquear registros, etc.). Para esto no hacemos 20 llamadas desde el frontend, usamos **Funciones SQL** almacenadas en la base de datos.

Esto es lo más parecido a un "Endpoint Custom".

**Ejemplo: Cerrar Caja**
1.  Existe una función SQL llamada `cerrar_caja_diaria`.
2.  Desde el frontend la llamas así:

```javascript
const { data, error } = await supabase.rpc('cerrar_caja_diaria', { 
  p_empresa_id: 123,
  p_usuario_id: 'abc-def' 
});
```

Esto ejecuta la lógica en el servidor de base de datos, garantizando velocidad y seguridad.

---

## 5. Seguridad: RLS (Row Level Security)

Como el frontend conecta directo a la BD, ¿qué impide que un usuario borre los datos de otra empresa?

**RLS (Políticas de Seguridad a Nivel de Fila)**.
Son reglas que viven en la base de datos PostgreSQL, no en el código JS.

Ejemplo de una política real en tu proyecto:
```sql
-- "Solo puedes ver productos de TU empresa"
CREATE POLICY "Ver productos propios" ON productos
FOR SELECT
USING ( empresa_id = (SELECT empresa_id FROM perfiles WHERE id = auth.uid()) );
```

Cuando haces `supabase.from('productos').select('*')`, Supabase automáticamente añade ese filtro "invisible" al final. Si intentas pedir datos de otra empresa, la base de datos devuelve vacío.

---

## 6. Autenticación (Auth)

No necesitas programar login, tokens JWT, ni cookies.
Supabase Auth maneja todo.

*   **Login:** `supabase.auth.signInWithPassword({ email, password })`
*   **Usuario Actual:** `supabase.auth.getUser()`
*   **Sesión:** Supabase guarda el token en `localStorage` automáticamente. Cada vez que haces una petición a la BD, ese token se envía solo.

---

## 7. Realtime (Tiempo Real)

Una ventaja enorme es que puedes "escuchar" cambios sin recargar la página.

**Ejemplo en `useInventario.js`:**
```javascript
supabase
  .channel('cambios-inventario')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'productos' }, 
    (payload) => {
      console.log('Alguien modificó un producto:', payload);
      actualizarLista(); // Refrescar pantalla
    }
  )
  .subscribe();
```

---

## Resumen para Desarrolladores

1.  **No busques la carpeta `/controllers` o `/routes`**: No existen.
2.  **Mira los `hooks/`**: Ahí está la lógica de conexión (`useInventario`, `useVentas`).
3.  **Mira la carpeta `docs/`**: Ahí están los archivos `.sql` que definen la estructura de la BD y las funciones RPC.
4.  **Si necesitas lógica nueva**:
    *   Si es simple (CRUD): Hazlo directo en el frontend con `supabase.from()`.
    *   Si es compleja (Transacciones, cálculos): Crea una función SQL y llámala con `supabase.rpc()`.
