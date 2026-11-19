const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto'); // NUEVO: viene incluido en Node, no se instala nada
const app = express();

app.set('trust proxy', 1); // NUEVO: Render usa un proxy HTTPS; sirve para detectar HTTPS y la IP real
app.use(express.json());
app.use(express.static('public')); // Asegúrate de que los archivos estén dentro de la carpeta 'public'

// 1. BASE DE DATOS PERSISTENTE
// CAMBIO MÍNIMO: la ruta puede venir de la variable DB_PATH (si no existe, usa './kronox.db' como siempre)
const db = new sqlite3.Database(process.env.DB_PATH || './kronox.db', (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite persistente.');
    }
});

// 2. CREAR TABLAS SI NO EXISTEN
db.serialize(() => {
    // Tabla de inscripciones (se mantiene intacta para que los planes/inscripciones no se borren nunca)
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

    // NUEVO: columnas para mostrar la tarjeta en el panel admin.
    // Solo datos seguros: titular, marca, últimos 4 dígitos y vencimiento (NUNCA el número completo ni el CVV).
    // Si la columna ya existe, SQLite avisa y se ignora el aviso; los registros anteriores no se tocan.
    ['tarjeta_titular', 'tarjeta_marca', 'tarjeta_ultimos4', 'tarjeta_vence'].forEach(col => {
        db.run(`ALTER TABLE inscripciones ADD COLUMN ${col} TEXT`, () => {});
    });

    // NUEVA: Tabla para el control persistente de la afluencia del gimnasio
    db.run(`CREATE TABLE IF NOT EXISTS afluencia_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        porcentaje INTEGER,
        estado TEXT,
        modo_manual INTEGER DEFAULT 0
    )`, () => {
        // Inicializar con un registro por defecto si está vacía
        db.get(`SELECT COUNT(*) as count FROM afluencia_config`, (err, row) => {
            if (row && row.count === 0) {
                db.run(`INSERT INTO afluencia_config (porcentaje, estado, modo_manual) VALUES (45, 'Fluencia Moderada', 0)`);
            }
        });
    });
});

// 3. RUTA PARA RECIBIR INSCRIPCIONES (Desde planes.html) con hora local de México
app.post('/api/inscripciones', (req, res) => {
    const { nombre, telefono, plan, monto, metodo_pago } = req.body;
    
    // Obtenemos la fecha y hora exacta en la zona horaria de México
    const fechaMex = new Date().toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });

    // NUEVO: datos de tarjeta SEGUROS (solo si pagó con tarjeta). Se validan aquí también,
    // por si alguien manda datos de más: lo que no cumpla el formato se guarda vacío.
    const esTarjeta = metodo_pago === 'Tarjeta de Crédito / Débito';
    const titular = esTarjeta ? String(req.body.tarjeta_titular || '').trim().slice(0, 60) : null;
    const marca = esTarjeta ? (['Visa', 'Mastercard'].includes(req.body.tarjeta_marca) ? req.body.tarjeta_marca : 'Tarjeta') : null;
    const ultimos4 = esTarjeta && /^\d{4}$/.test(String(req.body.tarjeta_ultimos4)) ? String(req.body.tarjeta_ultimos4) : null;
    const vence = esTarjeta && /^\d{2}\/\d{2}$/.test(String(req.body.tarjeta_vence)) ? String(req.body.tarjeta_vence) : null;

    db.run(
        `INSERT INTO inscripciones (nombre, telefono, plan, monto, metodo_pago, estado, fecha, tarjeta_titular, tarjeta_marca, tarjeta_ultimos4, tarjeta_vence) VALUES (?, ?, ?, ?, ?, 'Pendiente', ?, ?, ?, ?, ?)`,
        [nombre, telefono, plan, monto, metodo_pago, fechaMex, titular, marca, ultimos4, vence],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// 4. API PARA QUE admin.html OBTENGA LAS INSCRIPCIONES EN JSON
app.get('/api/inscripciones', (req, res) => {
    db.all(`SELECT * FROM inscripciones ORDER BY fecha DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 5. API PARA QUE admin.html CAMBIE EL ESTATUS (Vigente / Pendiente)
app.post('/api/inscripciones/:id/liberar', (req, res) => {
    const id = req.params.id;
    db.get(`SELECT estado FROM inscripciones WHERE id = ?`, [id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Inscripción no encontrada" });
        
        const nuevoEstado = row.estado === 'Vigente' ? 'Pendiente' : 'Vigente';
        db.run(`UPDATE inscripciones SET estado = ? WHERE id = ?`, [nuevoEstado, id], (err) => {
            if (err) return res.status(500).json({ error: "Error al actualizar estatus" });
            res.json({ success: true, nuevoEstado });
        });
    });
});

// 5.1. API PARA ELIMINAR UN REGISTRO
app.delete('/api/inscripciones/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM inscripciones WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(500).json({ error: "Error al eliminar el registro" });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Inscripción no encontrada" });
        }
        res.json({ success: true });
    });
});

// ================= APIS PARA LA AFLUENCIA EN TIEMPO REAL =================

// Obtener estado actual de afluencia
app.get('/api/afluencia', (req, res) => {
    db.get(`SELECT * FROM afluencia_config ORDER BY id DESC LIMIT 1`, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { porcentaje: 45, estado: "Fluencia Moderada", modo_manual: 0 });
    });
});

// Actualizar estado de afluencia desde el panel de admin
app.post('/api/afluencia', (req, res) => {
    const { porcentaje, estado } = req.body;
    db.run(`UPDATE afluencia_config SET porcentaje = ?, estado = ?, modo_manual = 1 WHERE id = 1`, [porcentaje, estado], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, mensaje: "Afluencia actualizada correctamente" });
    });
});

// =========================================================================

// =========================================================================
// ===== NUEVO: CUENTAS DE SOCIOS, SESIÓN Y MARCAS (PR) ====================
// =========================================================================

// ---- Ayudantes para usar la base de datos con async/await ----
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
    });
});

const ahoraMex = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' });
const sinCache = (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
const falloServidor = (res, e) => {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor. Intenta de nuevo.' });
};

// ---- Tablas nuevas (no tocan las que ya tienes) ----
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT NOT NULL UNIQUE COLLATE NOCASE,
        salt TEXT NOT NULL,
        hash TEXT NOT NULL,
        creado TEXT
    )`, () => { prepararAdmin(); });

    db.run(`CREATE TABLE IF NOT EXISTS sesiones (
        token_hash TEXT PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        expira INTEGER NOT NULL
    )`, () => { db.run('DELETE FROM sesiones WHERE expira < ?', [Date.now()]); });

    // Ejercicios que cada socio eligió para "Mi rutina"
    db.run(`CREATE TABLE IF NOT EXISTS rutina_usuario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        ejercicio TEXT NOT NULL,
        UNIQUE (usuario_id, ejercicio)
    )`);

    // Historial de marcas: una fila por cada vez que el socio registra un ejercicio
    db.run(`CREATE TABLE IF NOT EXISTS marcas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        ejercicio TEXT NOT NULL,
        peso REAL NOT NULL,
        reps INTEGER NOT NULL,
        fecha TEXT
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_marcas_usuario_ejercicio ON marcas (usuario_id, ejercicio)`);
});

// ---- Contraseñas (scrypt viene incluido en Node) ----
function hashPassword(password, saltHex) {
    const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, key) => {
            if (err) reject(err);
            else resolve({ salt: salt.toString('hex'), hash: key.toString('hex') });
        });
    });
}

async function verificarPassword(password, saltHex, hashHex) {
    const { hash } = await hashPassword(password, saltHex);
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(hashHex, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---- El usuario "admin" se define con la variable de entorno ADMIN_PASSWORD (en Render) ----
async function prepararAdmin() {
    const clave = process.env.ADMIN_PASSWORD;
    if (!clave) {
        console.warn('ADMIN_PASSWORD no está definida: el usuario "admin" NO podrá iniciar sesión.');
        return;
    }
    try {
        const { salt, hash } = await hashPassword(clave);
        const existe = await dbGet('SELECT id FROM usuarios WHERE usuario = ?', ['admin']);
        if (existe) {
            await dbRun('UPDATE usuarios SET salt = ?, hash = ? WHERE id = ?', [salt, hash, existe.id]);
        } else {
            await dbRun('INSERT INTO usuarios (usuario, salt, hash, creado) VALUES (?, ?, ?, ?)', ['admin', salt, hash, ahoraMex()]);
        }
    } catch (e) {
        console.error('No se pudo preparar el usuario admin:', e);
    }
}

// ---- Sesiones con cookie (se envía sola a TODAS tus páginas) ----
const SESION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function leerCookie(req, nombre) {
    const raw = req.headers.cookie || '';
    for (const parte of raw.split(';')) {
        const i = parte.indexOf('=');
        if (i === -1) continue;
        if (parte.slice(0, i).trim() === nombre) {
            try { return decodeURIComponent(parte.slice(i + 1).trim()); } catch (e) { return null; }
        }
    }
    return null;
}

async function crearSesion(req, res, usuarioId) {
    const token = crypto.randomBytes(32).toString('hex');
    await dbRun('INSERT INTO sesiones (token_hash, usuario_id, expira) VALUES (?, ?, ?)',
        [hashToken(token), usuarioId, Date.now() + SESION_MS]);
    res.cookie('kronox_sid', token, {
        httpOnly: true,       // JavaScript de la página no puede leerla
        sameSite: 'lax',
        secure: req.secure,   // true en Render (HTTPS)
        maxAge: SESION_MS,
        path: '/'
    });
}

async function requiereSesion(req, res, next) {
    try {
        const token = leerCookie(req, 'kronox_sid');
        if (!token) return res.status(401).json({ error: 'Sesión no iniciada' });
        const fila = await dbGet(
            `SELECT u.id, u.usuario FROM sesiones s
             JOIN usuarios u ON u.id = s.usuario_id
             WHERE s.token_hash = ? AND s.expira > ?`,
            [hashToken(token), Date.now()]
        );
        if (!fila) return res.status(401).json({ error: 'Sesión no iniciada' });
        req.usuario = fila;
        next();
    } catch (e) {
        falloServidor(res, e);
    }
}

// ---- Límite de intentos fallidos (en memoria): 8 por cada 15 minutos ----
const intentosFallidos = new Map();
const VENTANA_MS = 15 * 60 * 1000;
const MAX_FALLOS = 8;
const claveIntento = (req, usuario) => `${req.ip}|${usuario.toLowerCase()}`;

function loginBloqueado(req, usuario) {
    const k = claveIntento(req, usuario);
    const reg = intentosFallidos.get(k);
    if (!reg) return false;
    if (Date.now() - reg.desde > VENTANA_MS) { intentosFallidos.delete(k); return false; }
    return reg.n >= MAX_FALLOS;
}
function registrarFallo(req, usuario) {
    const k = claveIntento(req, usuario);
    const reg = intentosFallidos.get(k);
    if (!reg || Date.now() - reg.desde > VENTANA_MS) intentosFallidos.set(k, { n: 1, desde: Date.now() });
    else reg.n += 1;
}

// ---- LOGIN: solo entra quien ya tiene cuenta y escribe su contraseña correcta ----
const MSG_LOGIN_MAL = 'Usuario o contraseña incorrectos. Si aún no tienes cuenta, toca «Crear cuenta».';

app.post('/api/login', async (req, res) => {
    try {
        const usuario = String(req.body.usuario || '').trim();
        const password = String(req.body.password || '');

        if (!usuario || !password) return res.status(400).json({ error: 'Escribe tu usuario y tu contraseña.' });
        if (usuario.length > 60 || password.length > 100) return res.status(401).json({ error: MSG_LOGIN_MAL });
        if (loginBloqueado(req, usuario)) {
            return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' });
        }

        const fila = await dbGet('SELECT id, usuario, salt, hash FROM usuarios WHERE usuario = ?', [usuario]);
        const ok = fila ? await verificarPassword(password, fila.salt, fila.hash) : false;

        if (!ok) {
            registrarFallo(req, usuario);
            return res.status(401).json({ error: MSG_LOGIN_MAL });
        }

        intentosFallidos.delete(claveIntento(req, usuario));
        await crearSesion(req, res, fila.id);
        res.json({ success: true, usuario: fila.usuario });
    } catch (e) {
        falloServidor(res, e);
    }
});

// ---- REGISTRO: crea una cuenta nueva (el usuario no debe existir todavía) ----
const registrosPorIp = new Map();
function registroBloqueado(req) {
    const ahora = Date.now();
    const reg = registrosPorIp.get(req.ip);
    if (!reg || ahora - reg.desde > 60 * 60 * 1000) {
        registrosPorIp.set(req.ip, { n: 1, desde: ahora });
        return false;
    }
    reg.n += 1;
    return reg.n > 10; // máximo 10 intentos de registro por hora desde la misma IP
}

app.post('/api/registro', async (req, res) => {
    try {
        const usuario = String(req.body.usuario || '').trim();
        const password = String(req.body.password || '');

        if (usuario.length < 3 || usuario.length > 60) {
            return res.status(400).json({ error: 'El usuario debe tener entre 3 y 60 caracteres.' });
        }
        if (usuario.toLowerCase() === 'admin') {
            return res.status(400).json({ error: 'Ese usuario no está disponible. Elige otro.' });
        }
        if (password.length < 6 || password.length > 100) {
            return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 100 caracteres.' });
        }
        if (registroBloqueado(req)) {
            return res.status(429).json({ error: 'Demasiados intentos de registro. Inténtalo más tarde.' });
        }

        const existe = await dbGet('SELECT id FROM usuarios WHERE usuario = ?', [usuario]);
        if (existe) {
            return res.status(409).json({ error: 'Ese usuario ya está en uso. Elige otro o inicia sesión.' });
        }

        const { salt, hash } = await hashPassword(password);
        let r;
        try {
            r = await dbRun('INSERT INTO usuarios (usuario, salt, hash, creado) VALUES (?, ?, ?, ?)',
                [usuario, salt, hash, ahoraMex()]);
        } catch (e) {
            if (e && e.code === 'SQLITE_CONSTRAINT') {
                return res.status(409).json({ error: 'Ese usuario ya está en uso. Elige otro o inicia sesión.' });
            }
            throw e;
        }

        await crearSesion(req, res, r.lastID);
        res.json({ success: true, usuario });
    } catch (e) {
        falloServidor(res, e);
    }
});

app.post('/api/logout', async (req, res) => {
    try {
        const token = leerCookie(req, 'kronox_sid');
        if (token) await dbRun('DELETE FROM sesiones WHERE token_hash = ?', [hashToken(token)]);
        res.clearCookie('kronox_sid', { path: '/' });
        res.json({ success: true });
    } catch (e) {
        falloServidor(res, e);
    }
});

// Quién tiene sesión activa (las páginas lo usan para mantenerse sincronizadas)
app.get('/api/yo', sinCache, requiereSesion, (req, res) => {
    res.json({ usuario: req.usuario.usuario, esAdmin: req.usuario.usuario.toLowerCase() === 'admin' });
});

// ---- MI RUTINA Y MARCAS ----
const EJERCICIO_OK = /^[a-z0-9_]{1,60}$/;

// Devuelve: ejercicios elegidos, mejor marca (PR) y última marca de cada uno
app.get('/api/mi-rutina', sinCache, requiereSesion, async (req, res) => {
    try {
        const id = req.usuario.id;
        const filasRutina = await dbAll('SELECT ejercicio FROM rutina_usuario WHERE usuario_id = ? ORDER BY id', [id]);

        const filasPR = await dbAll(
            `SELECT m.ejercicio, m.peso, m.reps, m.fecha FROM marcas m
             WHERE m.usuario_id = ? AND NOT EXISTS (
                 SELECT 1 FROM marcas x
                 WHERE x.usuario_id = m.usuario_id AND x.ejercicio = m.ejercicio
                   AND (x.peso > m.peso
                        OR (x.peso = m.peso AND x.reps > m.reps)
                        OR (x.peso = m.peso AND x.reps = m.reps AND x.id > m.id))
             )`, [id]);

        const filasUltima = await dbAll(
            `SELECT m.ejercicio, m.peso, m.reps, m.fecha FROM marcas m
             WHERE m.usuario_id = ? AND NOT EXISTS (
                 SELECT 1 FROM marcas x
                 WHERE x.usuario_id = m.usuario_id AND x.ejercicio = m.ejercicio AND x.id > m.id
             )`, [id]);

        const prs = {};
        filasPR.forEach(f => { prs[f.ejercicio] = { peso: f.peso, reps: f.reps, fecha: f.fecha }; });
        const ultimas = {};
        filasUltima.forEach(f => { ultimas[f.ejercicio] = { peso: f.peso, reps: f.reps, fecha: f.fecha }; });

        res.json({ ejercicios: filasRutina.map(f => f.ejercicio), prs, ultimas });
    } catch (e) {
        falloServidor(res, e);
    }
});

// Guarda la lista de ejercicios elegidos (el historial de marcas NO se borra al quitar uno)
app.put('/api/mi-rutina', requiereSesion, async (req, res) => {
    try {
        const lista = req.body.ejercicios;
        if (!Array.isArray(lista) || lista.length > 200) {
            return res.status(400).json({ error: 'Lista de ejercicios no válida.' });
        }
        const unicos = [...new Set(lista.map(String))];
        if (!unicos.every(e => EJERCICIO_OK.test(e))) {
            return res.status(400).json({ error: 'Hay un ejercicio no válido en la lista.' });
        }

        const id = req.usuario.id;
        if (unicos.length === 0) {
            await dbRun('DELETE FROM rutina_usuario WHERE usuario_id = ?', [id]);
        } else {
            const marcas = unicos.map(() => '?').join(',');
            await dbRun(`DELETE FROM rutina_usuario WHERE usuario_id = ? AND ejercicio NOT IN (${marcas})`, [id, ...unicos]);
            for (const ej of unicos) {
                await dbRun('INSERT OR IGNORE INTO rutina_usuario (usuario_id, ejercicio) VALUES (?, ?)', [id, ej]);
            }
        }
        res.json({ success: true });
    } catch (e) {
        falloServidor(res, e);
    }
});

// Registra una marca y avisa si fue récord personal
app.post('/api/marcas', requiereSesion, async (req, res) => {
    try {
        const ejercicio = String(req.body.ejercicio || '');
        const peso = Math.round(Number(req.body.peso) * 100) / 100;
        const reps = Number(req.body.reps);

        if (!EJERCICIO_OK.test(ejercicio)) return res.status(400).json({ error: 'Ejercicio no válido.' });
        if (!Number.isFinite(peso) || peso <= 0 || peso > 1000) return res.status(400).json({ error: 'Peso no válido.' });
        if (!Number.isInteger(reps) || reps < 1 || reps > 100) return res.status(400).json({ error: 'Repeticiones no válidas.' });

        const id = req.usuario.id;
        const mejor = await dbGet(
            'SELECT peso, reps FROM marcas WHERE usuario_id = ? AND ejercicio = ? ORDER BY peso DESC, reps DESC LIMIT 1',
            [id, ejercicio]);

        const r = await dbRun('INSERT INTO marcas (usuario_id, ejercicio, peso, reps, fecha) VALUES (?, ?, ?, ?, ?)',
            [id, ejercicio, peso, reps, ahoraMex()]);
        await dbRun('INSERT OR IGNORE INTO rutina_usuario (usuario_id, ejercicio) VALUES (?, ?)', [id, ejercicio]);

        const supera = !!mejor && (peso > mejor.peso || (peso === mejor.peso && reps > mejor.reps));
        res.json({
            success: true,
            id: r.lastID,
            primera: !mejor,   // primer registro de ese ejercicio
            esPR: supera,      // superó su mejor marca anterior
            prAnterior: mejor || null
        });
    } catch (e) {
        falloServidor(res, e);
    }
});

// Historial de un ejercicio (para la gráfica y la lista)
app.get('/api/marcas/:ejercicio', sinCache, requiereSesion, async (req, res) => {
    try {
        if (!EJERCICIO_OK.test(req.params.ejercicio)) return res.status(400).json({ error: 'Ejercicio no válido.' });
        const filas = await dbAll(
            'SELECT id, peso, reps, fecha FROM marcas WHERE usuario_id = ? AND ejercicio = ? ORDER BY id DESC LIMIT 100',
            [req.usuario.id, req.params.ejercicio]);
        res.json(filas);
    } catch (e) {
        falloServidor(res, e);
    }
});

// Borrar una marca propia (por si se equivocó al capturar)
app.delete('/api/marcas/:id', requiereSesion, async (req, res) => {
    try {
        const r = await dbRun('DELETE FROM marcas WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
        if (r.changes === 0) return res.status(404).json({ error: 'Marca no encontrada.' });
        res.json({ success: true });
    } catch (e) {
        falloServidor(res, e);
    }
});

// ===== FIN DEL BLOQUE NUEVO ==============================================

// 6. RUTAS AMIGABLES PARA LAS PÁGINAS WEB
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/planes', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'planes.html'));
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/informacion', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'informacion.html'));
});

app.get('/catalogo', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'catalogo.html'));
});

app.get('/ubicacion', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ubicacion.html'));
});

// NUEVA RUTA PARA RUTINAS EXCLUSIVAS
app.get('/rutinas', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'rutinas.html'));
});

// Puerto para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
