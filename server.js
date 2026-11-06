// Middleware simple de autenticación de Administrador
const basicAuth = (req, res, next) => {
    const authheader = req.headers.authorization;
    if (!authheader) {
        res.setHeader('WWW-Authenticate', 'Basic');
        return res.status(401).send('Acceso no autorizado');
    }

    const auth = Buffer.from(authheader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    // Cambia aquí tu usuario y contraseña de administrador
    if (user === 'admin' && pass === 'kronox2026') {
        next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic');
        res.status(401).send('Credenciales incorrectas');
    }
};

// 📊 RUTA DE ADMINISTRADOR PROTEGIDA
app.get('/admin', basicAuth, (db => (req, res) => {
    // Nota: Asegúrate de usar la variable 'db' que ya tienes conectada a SQLite
    db.all(`SELECT * FROM inscripciones ORDER BY fecha DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).send("Error al consultar la base de datos");
        }
        
        let html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Panel de Administración | Kronox Gym</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        </head>
        <body class="bg-[#050a14] text-white font-sans min-h-screen p-6">
            <div class="max-w-6xl mx-auto">
                <div class="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <span class="text-[#00d2ff] text-xs font-black uppercase tracking-widest bg-[#00d2ff]/10 px-3 py-1 rounded-full border border-[#00d2ff]/30">Control Interno</span>
                        <h1 class="text-3xl font-black uppercase italic text-white mt-2">Panel de Administración</h1>
                    </div>
                    <a href="/planes" class="bg-transparent border-2 border-[#00d2ff] text-[#00d2ff] px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-[#00d2ff] hover:text-[#050a14] transition-all">
                        <i class="fas fa-arrow-left mr-2"></i> Ir a Planes
                    </a>
                </div>
                
                <div class="bg-[#091122] border border-[#16284a] rounded-2xl overflow-hidden shadow-2xl">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-[#080e1a] border-b border-[#16284a] text-xs uppercase text-gray-400">
                                    <th class="p-4 font-bold">ID</th>
                                    <th class="p-4 font-bold">Cliente</th>
                                    <th class="p-4 font-bold">Teléfono</th>
                                    <th class="p-4 font-bold">Plan</th>
                                    <th class="p-4 font-bold">Monto</th>
                                    <th class="p-4 font-bold">Método de Pago</th>
                                    <th class="p-4 font-bold">Fecha</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-[#16284a] text-sm">
        `;

        if (rows.length === 0) {
            html += `<tr><td colspan="7" class="p-8 text-center text-gray-400">No hay inscripciones registradas todavía.</td></tr>`;
        } else {
            rows.forEach(row => {
                html += `
                    <tr class="hover:bg-white/5 transition-colors">
                        <td class="p-4 font-bold text-[#00d2ff]">#${row.id}</td>
                        <td class="p-4 font-semibold text-white">${row.nombre}</td>
                        <td class="p-4 text-gray-300">${row.telefono}</td>
                        <td class="p-4"><span class="bg-[#00d2ff]/10 border border-[#00d2ff]/30 text-[#00d2ff] px-2.5 py-1 rounded-md text-xs font-bold">${row.plan}</span></td>
                        <td class="p-4 font-black text-green-400">$${row.monto}</td>
                        <td class="p-4 text-gray-300">${row.metodo_pago}</td>
                        <td class="p-4 text-gray-400 text-xs">${row.fecha}</td>
                    </tr>
                `;
            });
        }

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
        res.send(html);
    });
})(db));
