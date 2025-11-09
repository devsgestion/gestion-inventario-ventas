import fs from 'fs';

const filePath = 'c:\\Users\\DESARROLLO-PC\\Desktop\\Gestion-inventario-ventas\\gestion-inventario-ventas\\src\\components\\inventario\\ProductosLista.jsx';

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazos
content = content.replace(/âœï¸/g, '✏️');
content = content.replace(/ðŸ·ï¸/g, '🏷️');
content = content.replace(/ðŸ›'/g, '🛒');
content = content.replace(/âš™ï¸/g, '⚙️');
content = content.replace(/CategorÃ­a/g, 'Categoría');
content = content.replace(/FUNCIÃ"N/g, 'FUNCIÓN');
content = content.replace(/ðŸ›'/g, '🛑');

// Guardar archivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Caracteres corregidos');
