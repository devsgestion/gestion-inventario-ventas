# 🔧 Setup: Edge Function para Crear Usuarios

## Problema
No se puede usar `supabase.auth.admin.*` desde el frontend porque requiere la `service_role` key que debe mantenerse privada.

## Solución: Edge Function de Supabase

### Opción 1: Usar Supabase Edge Functions (Recomendado)

#### 1. Instalar Supabase CLI
```bash
# Windows (con npm)
npm install -g supabase

# O con Chocolatey
choco install supabase
```

#### 2. Login en Supabase
```bash
supabase login
```

#### 3. Crear Edge Function
```bash
cd c:\Users\DESARROLLO-PC\Desktop\Gestion-inventario-ventas\gestion-inventario-ventas
supabase functions new create-user-admin
```

#### 4. Copiar el código de la función
El archivo se creará en: `supabase/functions/create-user-admin/index.ts`

Reemplazar el contenido con el código de abajo.

#### 5. Desplegar la función
```bash
supabase functions deploy create-user-admin --project-ref mtqemkkyqvtdpphexbrw
```

---

## Código de la Edge Function

Archivo: `supabase/functions/create-user-admin/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase con service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Obtener datos del request
    const { 
      admin_id, 
      email, 
      password, 
      nombre_completo, 
      empresa_nombre, 
      rol 
    } = await req.json()

    // 1. Verificar que quien llama es superadmin
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', admin_id)
      .single()

    if (adminError || adminProfile.rol !== 'superadmin') {
      throw new Error('Solo los superadmins pueden crear usuarios')
    }

    // 2. Crear usuario en Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre_completo: nombre_completo
      }
    })

    if (userError) throw userError

    // 3. Crear empresa
    const { data: empresaData, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert([{ 
        nombre: empresa_nombre,
        owner_id: userData.user.id 
      }])
      .select()
      .single()

    if (empresaError) throw empresaError

    // 4. Crear perfil
    const { error: perfilError } = await supabaseAdmin
      .from('perfiles')
      .insert({
        id: userData.user.id,
        nombre: nombre_completo,
        nombre_completo: nombre_completo,
        empresa_id: empresaData.id,
        rol: rol,
        activo: true,
        created_by: admin_id
      })

    if (perfilError) throw perfilError

    // 5. Retornar éxito
    return new Response(
      JSON.stringify({
        success: true,
        user_id: userData.user.id,
        empresa_id: empresaData.id,
        message: 'Usuario creado exitosamente'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

---

## Opción 2: Backend Simple con Express (Alternativa)

Si no quieres usar Edge Functions, puedes crear un pequeño backend:

### 1. Crear carpeta backend
```bash
mkdir backend
cd backend
npm init -y
npm install express @supabase/supabase-js cors dotenv
```

### 2. Crear archivo `.env`
```
SUPABASE_URL=https://mtqemkkyqvtdpphexbrw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
PORT=3001
```

### 3. Crear `server.js`
```javascript
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')

const app = express()
app.use(cors())
app.use(express.json())

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

app.post('/api/admin/create-user', async (req, res) => {
  try {
    const { admin_id, email, password, nombre_completo, empresa_nombre, rol } = req.body

    // Verificar superadmin
    const { data: adminProfile } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', admin_id)
      .single()

    if (adminProfile?.rol !== 'superadmin') {
      return res.status(403).json({ error: 'No autorizado' })
    }

    // Crear usuario
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo }
    })

    if (userError) throw userError

    // Crear empresa
    const { data: empresaData, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert([{ nombre: empresa_nombre, owner_id: userData.user.id }])
      .select()
      .single()

    if (empresaError) throw empresaError

    // Crear perfil
    await supabaseAdmin.from('perfiles').insert({
      id: userData.user.id,
      nombre: nombre_completo,
      nombre_completo,
      empresa_id: empresaData.id,
      rol,
      activo: true,
      created_by: admin_id
    })

    res.json({ 
      success: true, 
      user_id: userData.user.id,
      empresa_id: empresaData.id 
    })

  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.listen(process.env.PORT, () => {
  console.log(`Backend running on port ${process.env.PORT}`)
})
```

### 4. Ejecutar backend
```bash
node server.js
```

---

## ¿Cuál opción elegir?

### Opción 1: Edge Functions ⭐ RECOMENDADO
- ✅ Serverless (no necesitas mantener servidor)
- ✅ Se integra perfectamente con Supabase
- ✅ Gratis en el plan free de Supabase
- ✅ Auto-escalable
- ❌ Requiere Supabase CLI

### Opción 2: Backend Express
- ✅ Más familiar si conoces Node.js
- ✅ Control total
- ✅ Puedes agregar más endpoints fácilmente
- ❌ Necesitas mantener servidor corriendo
- ❌ Costos de hosting

---

## Siguiente paso

¿Quieres que te ayude a configurar:
1. **Edge Function de Supabase** (recomendado)
2. **Backend con Express**
3. **Otra solución**
