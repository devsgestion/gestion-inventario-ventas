-- =========================================================================
-- 💸 MÓDULO DE GASTOS VARIOS - Sistema de Control de Gastos Operacionales
-- =========================================================================
-- Descripción: Sistema completo para registrar, consultar y anular gastos
-- del negocio (nómina, servicios, insumos, transporte, etc.)
-- IMPORTANTE: Este módulo es SOLO PARA REGISTRO. No afecta el saldo de caja.
-- Autor: Sistema GestiON
-- Fecha: 10 de Noviembre, 2025
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. TABLA PRINCIPAL: gastos
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gastos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES perfiles(id),
    
    -- Información del gasto
    concepto TEXT NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    monto DECIMAL(15, 2) NOT NULL CHECK (monto > 0),
    metodo_pago VARCHAR(50) DEFAULT 'efectivo', -- efectivo, transferencia, tarjeta
    
    -- Documentación opcional
    numero_factura VARCHAR(100),
    proveedor TEXT,
    descripcion TEXT,
    foto_soporte TEXT, -- URL de imagen opcional (recibo/factura)
    
    -- Estado y control
    estado VARCHAR(20) DEFAULT 'registrado', -- registrado, anulado
    anulado BOOLEAN DEFAULT FALSE,
    fecha_anulacion TIMESTAMPTZ,
    usuario_anula_id UUID REFERENCES perfiles(id),
    motivo_anulacion TEXT,
    
    -- Auditoría de fechas
    fecha_gasto DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_gastos_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    CONSTRAINT fk_gastos_usuario FOREIGN KEY (usuario_id) REFERENCES perfiles(id),
    CONSTRAINT fk_gastos_usuario_anula FOREIGN KEY (usuario_anula_id) REFERENCES perfiles(id)
);

-- -------------------------------------------------------------------------
-- 2. ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gastos_empresa ON gastos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha_gasto DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria);
CREATE INDEX IF NOT EXISTS idx_gastos_estado ON gastos(estado, anulado);
CREATE INDEX IF NOT EXISTS idx_gastos_usuario ON gastos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_gastos_empresa_fecha ON gastos(empresa_id, fecha_gasto DESC);

-- -------------------------------------------------------------------------
-- 3. TRIGGER: Actualizar updated_at automáticamente
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_gastos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gastos_updated_at ON gastos;
CREATE TRIGGER trigger_gastos_updated_at
    BEFORE UPDATE ON gastos
    FOR EACH ROW
    EXECUTE FUNCTION update_gastos_updated_at();

-- -------------------------------------------------------------------------
-- 4. FUNCIÓN RPC: registrar_gasto
-- -------------------------------------------------------------------------
-- Descripción: Registra un nuevo gasto (SOLO PARA REGISTRO, no afecta caja)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION registrar_gasto(
    p_empresa_id UUID,
    p_usuario_id UUID,
    p_concepto TEXT,
    p_categoria VARCHAR,
    p_monto DECIMAL,
    p_metodo_pago VARCHAR DEFAULT 'efectivo',
    p_numero_factura VARCHAR DEFAULT NULL,
    p_proveedor TEXT DEFAULT NULL,
    p_descripcion TEXT DEFAULT NULL,
    p_fecha_gasto DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    v_gasto_id UUID;
    v_estado_caja RECORD;
    v_result JSON;
BEGIN
    -- Validaciones
    IF p_monto <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser mayor a cero';
    END IF;
    
    IF p_concepto IS NULL OR TRIM(p_concepto) = '' THEN
        RAISE EXCEPTION 'El concepto es obligatorio';
    END IF;
    
    IF p_categoria IS NULL OR TRIM(p_categoria) = '' THEN
        RAISE EXCEPTION 'La categoría es obligatoria';
    END IF;
    
    -- Insertar el gasto (sin validar caja ni saldo)
    INSERT INTO gastos (
        empresa_id, 
        usuario_id, 
        concepto, 
        categoria, 
        monto,
        metodo_pago,
        numero_factura,
        proveedor,
        descripcion,
        fecha_gasto,
        estado
    ) VALUES (
        p_empresa_id,
        p_usuario_id,
        p_concepto,
        p_categoria,
        p_monto,
        p_metodo_pago,
        p_numero_factura,
        p_proveedor,
        p_descripcion,
        p_fecha_gasto,
        'registrado'
    )
    RETURNING id INTO v_gasto_id;
    
    -- NO descontamos de la caja - Solo registro
    
    -- Construir respuesta exitosa
    v_result := json_build_object(
        'success', true,
        'gasto_id', v_gasto_id,
        'message', 'Gasto registrado exitosamente',
        'monto', p_monto,
        'metodo_pago', p_metodo_pago
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    -- Retornar error en formato JSON
    RETURN json_build_object(
        'success', false,
        'message', SQLERRM,
        'error_detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------------------------
-- 5. FUNCIÓN RPC: anular_gasto
-- -------------------------------------------------------------------------
-- Descripción: Anula un gasto (SOLO marca como anulado, no devuelve dinero)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION anular_gasto(
    p_gasto_id UUID,
    p_usuario_anula_id UUID,
    p_motivo_anulacion TEXT
)
RETURNS JSON AS $$
DECLARE
    v_gasto RECORD;
    v_estado_caja RECORD;
    v_result JSON;
BEGIN
    -- Validaciones
    IF p_motivo_anulacion IS NULL OR TRIM(p_motivo_anulacion) = '' THEN
        RAISE EXCEPTION 'Debe proporcionar un motivo para la anulación';
    END IF;
    
    -- Obtener información del gasto
    SELECT * INTO v_gasto
    FROM gastos
    WHERE id = p_gasto_id
    AND anulado = FALSE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Gasto no encontrado o ya está anulado';
    END IF;
    
    -- NO validamos ni devolvemos dinero a la caja - Solo registro
    
    -- Marcar el gasto como anulado
    UPDATE gastos
    SET anulado = TRUE,
        estado = 'anulado',
        fecha_anulacion = NOW(),
        usuario_anula_id = p_usuario_anula_id,
        motivo_anulacion = p_motivo_anulacion
    WHERE id = p_gasto_id;
    
    -- NO devolvemos dinero a la caja - Solo registro
    
    -- Construir respuesta exitosa
    v_result := json_build_object(
        'success', true,
        'message', 'Gasto anulado exitosamente',
        'monto_devuelto', v_gasto.monto,
        'metodo_pago', v_gasto.metodo_pago
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    -- Retornar error en formato JSON
    RETURN json_build_object(
        'success', false,
        'message', SQLERRM,
        'error_detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------------------------
-- 6. VISTA: Resumen de gastos por categoría mensual
-- -------------------------------------------------------------------------
CREATE OR REPLACE VIEW vista_gastos_mensuales AS
SELECT 
    empresa_id,
    DATE_TRUNC('month', fecha_gasto) as mes,
    categoria,
    COUNT(*) as cantidad_gastos,
    SUM(monto) as total_categoria,
    AVG(monto) as promedio_gasto,
    MIN(monto) as gasto_minimo,
    MAX(monto) as gasto_maximo
FROM gastos
WHERE anulado = FALSE
GROUP BY empresa_id, DATE_TRUNC('month', fecha_gasto), categoria
ORDER BY mes DESC, total_categoria DESC;

-- -------------------------------------------------------------------------
-- 7. VISTA: Resumen de gastos diarios
-- -------------------------------------------------------------------------
CREATE OR REPLACE VIEW vista_gastos_diarios AS
SELECT 
    empresa_id,
    fecha_gasto,
    COUNT(*) as total_gastos,
    SUM(CASE WHEN metodo_pago = 'efectivo' THEN monto ELSE 0 END) as total_efectivo,
    SUM(CASE WHEN metodo_pago = 'transferencia' THEN monto ELSE 0 END) as total_transferencia,
    SUM(CASE WHEN metodo_pago = 'tarjeta' THEN monto ELSE 0 END) as total_tarjeta,
    SUM(monto) as total_dia
FROM gastos
WHERE anulado = FALSE
GROUP BY empresa_id, fecha_gasto
ORDER BY fecha_gasto DESC;

-- -------------------------------------------------------------------------
-- 8. HABILITAR ROW LEVEL SECURITY (RLS)
-- -------------------------------------------------------------------------
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver gastos de su empresa
DROP POLICY IF EXISTS "Usuarios pueden ver gastos de su empresa" ON gastos;
CREATE POLICY "Usuarios pueden ver gastos de su empresa"
    ON gastos FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
    );

-- Política: Los usuarios pueden insertar gastos en su empresa
DROP POLICY IF EXISTS "Usuarios pueden insertar gastos" ON gastos;
CREATE POLICY "Usuarios pueden insertar gastos"
    ON gastos FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM perfiles WHERE id = auth.uid()
        )
    );

-- Política: Solo usuarios con permisos pueden actualizar (anular) gastos
DROP POLICY IF EXISTS "Usuarios pueden actualizar gastos" ON gastos;
CREATE POLICY "Usuarios pueden actualizar gastos"
    ON gastos FOR UPDATE
    USING (
        empresa_id IN (
            SELECT empresa_id FROM perfiles 
            WHERE id = auth.uid()
            AND rol IN ('admin', 'superadmin', 'admin_gestor')
        )
    );

-- -------------------------------------------------------------------------
-- 9. COMENTARIOS EN LA TABLA (Documentación)
-- -------------------------------------------------------------------------
COMMENT ON TABLE gastos IS 'Registro de gastos operacionales del negocio';
COMMENT ON COLUMN gastos.concepto IS 'Descripción breve del gasto';
COMMENT ON COLUMN gastos.categoria IS 'Categoría del gasto (nomina, servicios, insumos, etc.)';
COMMENT ON COLUMN gastos.monto IS 'Valor del gasto en pesos colombianos';
COMMENT ON COLUMN gastos.metodo_pago IS 'Método de pago: efectivo, transferencia, tarjeta';
COMMENT ON COLUMN gastos.numero_factura IS 'Número de factura o recibo (opcional)';
COMMENT ON COLUMN gastos.proveedor IS 'Nombre del proveedor o destinatario del pago';
COMMENT ON COLUMN gastos.foto_soporte IS 'URL de la imagen del recibo o factura (opcional)';
COMMENT ON COLUMN gastos.anulado IS 'Indica si el gasto fue anulado';
COMMENT ON COLUMN gastos.motivo_anulacion IS 'Razón por la cual se anuló el gasto';

-- =========================================================================
-- ✅ SCRIPT COMPLETADO
-- =========================================================================
-- Instrucciones de uso:
-- 1. Ejecutar este script completo en el SQL Editor de Supabase
-- 2. Verificar que no haya errores en la ejecución
-- 3. La tabla 'gastos' y todas las funciones estarán listas para usar
-- 4. Usar registrar_gasto() y anular_gasto() desde el frontend con RPC
-- =========================================================================
