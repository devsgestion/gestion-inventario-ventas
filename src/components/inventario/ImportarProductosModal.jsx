// src/components/inventario/ImportarProductosModal.jsx

import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import * as XLSX from 'xlsx';
import './ImportarProductosModal.css';

const ImportarProductosModal = ({ empresaId, onClose, onImportComplete }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [showPreview, setShowPreview] = useState(false);
    const [importResult, setImportResult] = useState(null);

    // Función para descargar plantilla Excel
    const descargarPlantilla = () => {
        const plantilla = [
            {
                'Código Referencia': 'ACC001',
                'Nombre': 'Cadena oro 14k 50cm',
                'Categoría': 'Cadenas',
                'Stock Inicial': 5,
                'Precio Costo': 45000,
                'Precio Venta': 65000,
                'Alerta Stock Mínimo': 2
            },
            {
                'Código Referencia': 'ACC002',
                'Nombre': 'Aretes perla pequeños',
                'Categoría': 'Aretes',
                'Stock Inicial': 12,
                'Precio Costo': 8000,
                'Precio Venta': 15000,
                'Alerta Stock Mínimo': 5
            },
            {
                'Código Referencia': 'ACC003',
                'Nombre': 'Pulsera plata rodinada',
                'Categoría': 'Pulseras',
                'Stock Inicial': 8,
                'Precio Costo': 12000,
                'Precio Venta': 20000,
                'Alerta Stock Mínimo': 3
            }
        ];

        const ws = XLSX.utils.json_to_sheet(plantilla);
        
        // Ajustar ancho de columnas
        ws['!cols'] = [
            { wch: 18 }, // Código Referencia
            { wch: 30 }, // Nombre
            { wch: 15 }, // Categoría
            { wch: 12 }, // Stock Inicial
            { wch: 13 }, // Precio Costo
            { wch: 13 }, // Precio Venta
            { wch: 18 }  // Alerta Stock Mínimo
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Productos');
        XLSX.writeFile(wb, 'Plantilla_Productos.xlsx');
    };

    // Procesar archivo Excel
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setError(null);
        setFile(selectedFile);
        setShowPreview(false);
        setPreviewData([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Validar que tenga datos
                if (jsonData.length === 0) {
                    setError('El archivo está vacío');
                    return;
                }

                // Transformar datos al formato correcto
                const productosTransformados = jsonData.map((row, index) => {
                    // Detectar nombres de columnas (con o sin tildes)
                    const codigo = row['Código Referencia'] || row['Codigo Referencia'] || row['codigo_referencia'] || row['Referencia'] || `AUTO-${index + 1}`;
                    const nombre = row['Nombre'] || row['nombre'] || '';
                    const categoria = row['Categoría'] || row['Categoria'] || row['categoria'] || null;
                    const stock = parseInt(row['Stock Inicial'] || row['Stock'] || row['stock_actual'] || 0);
                    const costo = parseFloat(row['Precio Costo'] || row['Costo'] || row['precio_costo'] || 0);
                    const venta = parseFloat(row['Precio Venta'] || row['Venta'] || row['precio_venta'] || 0);
                    const alerta = parseInt(row['Alerta Stock Mínimo'] || row['Alerta'] || row['alerta_stock_min'] || 5);

                    return {
                        codigo_referencia: codigo.toString().trim(),
                        nombre: nombre.toString().trim(),
                        categoria: categoria ? categoria.toString().trim() : null,
                        stock_actual: isNaN(stock) ? 0 : stock,
                        precio_costo: isNaN(costo) ? 0 : costo,
                        precio_venta: isNaN(venta) ? 0 : venta,
                        alerta_stock_min: isNaN(alerta) ? 5 : alerta,
                        valido: nombre.trim() !== '' && venta > 0
                    };
                });

                setPreviewData(productosTransformados);
                setShowPreview(true);
            } catch (err) {
                console.error('Error al procesar archivo:', err);
                setError('Error al leer el archivo. Asegúrate de que sea un archivo Excel válido.');
            }
        };

        reader.readAsArrayBuffer(selectedFile);
    };

    // Importar productos a Supabase
    const handleImport = async () => {
        if (previewData.length === 0) {
            setError('No hay datos para importar');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Filtrar solo productos válidos
            const productosValidos = previewData.filter(p => p.valido);

            if (productosValidos.length === 0) {
                setError('No hay productos válidos para importar. Verifica que tengan nombre y precio de venta.');
                setLoading(false);
                return;
            }

            // Preparar datos para inserción
            const productosParaInsertar = productosValidos.map(p => ({
                empresa_id: empresaId,
                codigo_referencia: p.codigo_referencia,
                nombre: p.nombre,
                categoria: p.categoria,
                stock_actual: p.stock_actual,
                precio_costo: p.precio_costo,
                precio_venta: p.precio_venta,
                alerta_stock_min: p.alerta_stock_min,
                activo: true
            }));

            // Insertar en lotes de 100 para evitar timeout
            const BATCH_SIZE = 100;
            let insertados = 0;
            let errores = 0;

            for (let i = 0; i < productosParaInsertar.length; i += BATCH_SIZE) {
                const batch = productosParaInsertar.slice(i, i + BATCH_SIZE);
                const { data, error: insertError } = await supabase
                    .from('productos')
                    .insert(batch)
                    .select();

                if (insertError) {
                    console.error('Error en lote:', insertError);
                    console.error('Detalles del error:', {
                        message: insertError.message,
                        details: insertError.details,
                        hint: insertError.hint,
                        code: insertError.code
                    });
                    
                    // Mostrar error específico al usuario
                    if (insertError.message.includes('categoria')) {
                        setError('❌ Error: La columna "categoria" no existe en la base de datos. Por favor, ejecuta primero el archivo SQL: docs/AGREGAR_CATEGORIA_PRODUCTOS.sql en Supabase.');
                    } else {
                        setError(`Error al insertar productos: ${insertError.message}`);
                    }
                    
                    errores += batch.length;
                } else {
                    insertados += data.length;
                }
            }

            setImportResult({
                total: previewData.length,
                insertados,
                errores,
                invalidos: previewData.length - productosValidos.length
            });

            if (insertados > 0) {
                onImportComplete();
            }

        } catch (err) {
            console.error('Error al importar:', err);
            setError(`Error al importar productos: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="import-modal-overlay">
            <div className="import-modal">
                <div className="import-modal-header">
                    <h2>📥 Importar Productos desde Excel</h2>
                    <button onClick={onClose} className="import-modal-close" disabled={loading}>✕</button>
                </div>

                <div className="import-modal-body">
                    {/* Paso 1: Descargar plantilla */}
                    <div className="import-step">
                        <h3>📋 Paso 1: Descargar Plantilla</h3>
                        <p>Descarga la plantilla de Excel con el formato correcto.</p>
                        <button onClick={descargarPlantilla} className="btn-download-template">
                            ⬇️ Descargar Plantilla Excel
                        </button>
                    </div>

                    <div className="import-divider"></div>

                    {/* Paso 2: Subir archivo */}
                    <div className="import-step">
                        <h3>📤 Paso 2: Cargar tu Archivo</h3>
                        <p>Sube el archivo Excel con tus productos.</p>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            disabled={loading}
                            className="import-file-input"
                        />
                        {file && <p className="import-file-name">📄 {file.name}</p>}
                    </div>

                    {error && (
                        <div className="import-error">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Preview de datos */}
                    {showPreview && previewData.length > 0 && (
                        <div className="import-preview">
                            <h3>👀 Vista Previa ({previewData.length} productos)</h3>
                            <div className="import-preview-table-wrapper">
                                <table className="import-preview-table">
                                    <thead>
                                        <tr>
                                            <th>Ref.</th>
                                            <th>Nombre</th>
                                            <th>Categoría</th>
                                            <th>Stock</th>
                                            <th>Costo</th>
                                            <th>Venta</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 10).map((p, idx) => (
                                            <tr key={idx} className={!p.valido ? 'invalid-row' : ''}>
                                                <td>{p.codigo_referencia}</td>
                                                <td>{p.nombre || <em>Sin nombre</em>}</td>
                                                <td>{p.categoria || <em>-</em>}</td>
                                                <td>{p.stock_actual}</td>
                                                <td>${p.precio_costo.toLocaleString()}</td>
                                                <td>${p.precio_venta.toLocaleString()}</td>
                                                <td>
                                                    {p.valido ? (
                                                        <span className="valid-badge">✓ OK</span>
                                                    ) : (
                                                        <span className="invalid-badge">✗ Inválido</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.length > 10 && (
                                    <p className="import-preview-note">
                                        Mostrando los primeros 10 de {previewData.length} productos
                                    </p>
                                )}
                            </div>
                            
                            <div className="import-summary">
                                <p>✅ Válidos: <strong>{previewData.filter(p => p.valido).length}</strong></p>
                                <p>❌ Inválidos: <strong>{previewData.filter(p => !p.valido).length}</strong></p>
                            </div>
                        </div>
                    )}

                    {/* Resultado de importación */}
                    {importResult && (
                        <div className="import-result">
                            <h3>✅ Importación Completa</h3>
                            <div className="import-result-stats">
                                <p>📊 Total procesados: <strong>{importResult.total}</strong></p>
                                <p>✅ Insertados: <strong>{importResult.insertados}</strong></p>
                                {importResult.invalidos > 0 && (
                                    <p>⚠️ Inválidos (omitidos): <strong>{importResult.invalidos}</strong></p>
                                )}
                                {importResult.errores > 0 && (
                                    <p>❌ Errores: <strong>{importResult.errores}</strong></p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="import-modal-footer">
                    <button onClick={onClose} disabled={loading} className="btn btn-secondary">
                        {importResult ? 'Cerrar' : 'Cancelar'}
                    </button>
                    {showPreview && !importResult && (
                        <button 
                            onClick={handleImport} 
                            disabled={loading || previewData.filter(p => p.valido).length === 0}
                            className="btn btn-primary"
                        >
                            {loading ? '⏳ Importando...' : `✅ Importar ${previewData.filter(p => p.valido).length} Productos`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportarProductosModal;
