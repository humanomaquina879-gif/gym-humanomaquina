const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.json());
app.use(express.static('public')); // O tu carpeta pública donde estén los demás HTML

// 1. BASE DE DATOS PERSISTENTE (Se guarda en un archivo físico './kronox.db' para que no se borre)
const db = new sqlite3.Database('./kronox.db', (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite persistente.');
    }
});

// 2. CREAR TABLA CON LA COLUMNA DE ESTADO SI NO EXISTE
db.run(`CREATE TABLE IF NOT EXISTS inscripciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    telefono TEXT,
    plan TEXT,
    monto TEXT,
    metodo_pago TEXT,
    estado TEXT DEFAULT 'Pendiente',
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 3. RUTA PARA RECIBIR INSCRIPCIONES (Desde planes.html)
app.post('/api/inscripciones', (req, res) => {
    const { nombre, telefono, plan, monto, metodo_pago } = req.body;
    db.run(
        `INSERT INTO inscripciones (nombre, telefono, plan, monto, metodo_pago, estado) VALUES (?, ?, ?, ?, ?, 'Pendiente')`,
        [nombre, telefono, plan, monto, metodo_pago],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// 4. AUTENTICACIÓN BÁSICA PARA ADMIN
const basicAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Acceso Restringido Kronox Gym"');
        return res.status(401).send('Acceso no autorizado.');
    }

    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    if (user === 'admin' && pass === 'kronox2026') {
        return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Acceso Restringido Kronox Gym"');
    return res.status(401).send('Credenciales incorrectas.');
};

// 5. RUTA PARA CAMBIAR EL ESTATUS (LIBERAR / PENDIENTE)
app.post('/api/inscripciones/:id/liberar', basicAuth, (req, res) => {
    const id = req.params.id;
    db.get(`SELECT estado FROM inscripciones WHERE id = ?`, [id], (err, row) => {
        if (err || !row) return res.status(404).send("Inscripción no encontrada");
        
        const nuevoEstado = row.estado === 'Liberado' ? 'Pendiente' : 'Liberado';
        db.run(`UPDATE inscripciones SET estado = ? WHERE id = ?`, [nuevoEstado, id], (err) => {
            if (err) return res.status(500).send("Error al actualizar estatus");
            res.redirect('/admin');
        });
    });
});

// 6. RUTA ADMIN PROTEGIDA CON LA TABLA Y EL BOTÓN DE LIBERAR PLAN
app.get('/admin', basicAuth, (req, res) => {
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
            <div class="max-w-7xl mx-auto">
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
                                    <th class="p-4 font-bold">Estatus</th>
                                    <th class="p-4 font-bold">Fecha</th>
                                    <th class="p-4 font-bold text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-[#16284a] text-sm">
        `;

        if (rows.length === 0) {
            html += `<tr><td colspan="9" class="p-8 text-center text-gray-400">No hay inscripciones registradas todavía.</td></tr>`;
        } else {
            rows.forEach(row => {
                const esLiberado = row.estado === 'Liberado';
                html += `
                    <tr class="hover:bg-white/5 transition-colors">
                        <td class="p-4 font-bold text-[#00d2ff]">#${row.id}</td>
                        <td class="p-4 font-semibold text-white">${row.nombre}</td>
                        <td class="p-4 text-gray-300">${row.telefono}</td>
                        <td class="p-4"><span class="bg-[#00d2ff]/10 border border-[#00d2ff]/30 text-[#00d2ff] px-2.5 py-1 rounded-md text-xs font-bold">${row.plan}</span></td>
                        <td class="p-4 font-black text-green-400">$${row.monto}</td>
                        <td class="p-4 text-gray-300">${row.metodo_pago}</td>
                        <td class="p-4">
                            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${esLiberado ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'}">
                                ${row.estado || 'Pendiente'}
                            </span>
                        </td>
                        <td class="p-4 text-gray-400 text-xs">${row.fecha}</td>
                        <td class="p-4 text-center">
                            <form action="/api/inscripciones/${row.id}/liberar" method="POST" style="display:inline;">
                                <button type="submit" title="Cambiar estatus del plan" class="px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${esLiberado ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500 hover:text-gray-950' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-gray-950'}">
                                    ${esLiberado ? 'Marcar Pendiente' : 'Liberar Plan'}
                                </button>
                            </form>
                        </td>
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
});
