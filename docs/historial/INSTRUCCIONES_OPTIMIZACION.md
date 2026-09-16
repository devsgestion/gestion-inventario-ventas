# 🚀 Instrucciones para Solucionar Errores y Optimizar el Sistema

Se han detectado errores de **Timeout (57014)** y **Error Interno del Servidor (500)**. Estos errores ocurren porque las consultas a la base de datos están tardando demasiado en ejecutarse, especialmente al calcular las ventas del día y al cerrar la caja.

Para solucionar esto definitivamente y optimizar el sistema, hemos generado un script SQL de alto rendimiento.

## ✅ Pasos para aplicar la solución

1.  Abre el archivo `docs/FIX_PERFORMANCE_ISSUES.sql` que hemos creado en tu proyecto.
2.  Copia **todo** el contenido de ese archivo.
3.  Ve a tu panel de **Supabase** -> **SQL Editor**.
4.  Crea una nueva consulta (New Query).
5.  Pega el código copiado y haz clic en **RUN**.

## 🛠️ ¿Qué hace esta optimización?

1.  **Crea Índices Inteligentes:** Agrega índices en las tablas `ventas`, `detalle_venta` y `cambios_devoluciones` para que las búsquedas por fecha y empresa sean instantáneas.
2.  **Optimiza `get_ventas_del_dia`:** Reescribe la función para usar rangos de fechas eficientes en lugar de conversiones lentas, reduciendo drásticamente el tiempo de ejecución.
3.  **Optimiza `get_utilidad_del_dia`:** Aplica la misma lógica de optimización para el cálculo de utilidades.

Una vez ejecutado el script, los errores de timeout al cerrar caja y cargar el dashboard deberían desaparecer por completo.
