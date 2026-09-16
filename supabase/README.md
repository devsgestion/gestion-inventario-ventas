# Base de datos (Supabase)

Esta carpeta es la **fuente de verdad** del esquema de la base de datos.
Los archivos de `docs/*.sql` son históricos: se ejecutaron a mano en distintos
momentos, algunos se pisan entre sí, y no garantizan reflejar el estado real.

## Estructura

```
supabase/
├── inspect/          # Consultas de SOLO LECTURA para ver el estado real
│   ├── 01_estado_actual.sql
│   └── resultado_estado_actual.csv   (exportado desde Supabase, ver abajo)
└── migrations/       # Cambios versionados. Se aplican en orden, una sola vez.
    └── 0001_baseline.sql             (snapshot del estado real, pendiente)
```

## Regla de oro (el negocio usa esto a diario)

1. **Nunca** ejecutar SQL en producción sin backup previo.
2. Todo cambio va en un archivo nuevo en `migrations/` con número consecutivo.
   Nunca se edita una migración ya aplicada.
3. Cada migración debe ser **compatible con el frontend ya desplegado**
   (mantener firmas de funciones RPC, no renombrar columnas en uso).
4. Aplicar fuera del horario de atención y verificar después el ciclo completo:
   abrir caja → vender → devolución → cerrar caja → dashboard cuadra.

## Cómo hacer backup (antes de cualquier cambio)

**Opción A – Dashboard (sin instalar nada):**
Supabase Dashboard → *Database* → *Backups*. En el plan gratuito no hay
backups automáticos; en Pro hay diarios. Si hay uno reciente, anotar la fecha.

**Opción B – Volcado manual con la CLI (recomendado, funciona en cualquier plan):**

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db dump -f supabase/backups/backup_$(date +%Y%m%d).sql
npx supabase db dump --data-only -f supabase/backups/datos_$(date +%Y%m%d).sql
```

El `<ref-del-proyecto>` es la parte `xxxxxxxx` de `https://xxxxxxxx.supabase.co`.
La carpeta `supabase/backups/` está en `.gitignore` (contiene datos reales).

## Cómo inventariar el estado actual

1. Abrir `inspect/01_estado_actual.sql`, copiar todo.
2. Supabase Dashboard → *SQL Editor* → *New query* → pegar → **Run**.
   Es solo lectura; no modifica nada.
3. En los resultados, *Export* → *Download JSON* (o CSV).
4. Guardar como `supabase/inspect/resultado_estado_actual.json` (o `.csv`).
5. Generar el baseline:

```bash
node supabase/inspect/generar_baseline.js
```

Eso escribe `migrations/0001_baseline.sql`. El archivo de resultado está en
`.gitignore` porque incluye conteos y definiciones internas; el baseline sí se versiona.

## Cómo aplicar una migración

Por ahora, manualmente: copiar el contenido del archivo al SQL Editor y
ejecutar. Registrar la fecha de aplicación en `migrations/APLICADAS.md`.
