const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public')); // Asegúrate de que admin.html esté dentro de la carpeta 'public'

// 1. BASE DE DATOS PERSISTENTE
const db = new sqlite3.Database('./kronox.db', (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite persistente.');
    }
});

// 2. CREAR TABLA SI NO EXISTE
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

// 4. API PARA QUE admin.html OBTENGA LAS INSCRIPCIONES EN JSON
app.get('/api/inscripciones', (req, res) => {
    db.all(`SELECT * FROM inscripciones ORDER BY fecha DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 5. API PARA QUE admin.html CAMBIE EL ESTATUS (Liberar / Pendiente)
app.post('/api/inscripciones/:id/liberar', (req, res) => {
    const id = req.params.id;
    db.get(`SELECT estado FROM inscripciones WHERE id = ?`, [id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Inscripción no encontrada" });
        
        const nuevoEstado = row.estado === 'Liberado' ? 'Pendiente' : 'Liberado';
        db.run(`UPDATE inscripciones SET estado = ? WHERE id = ?`, [nuevoEstado, id], (err) => {
            if (err) return res.status(500).json({ error: "Error al actualizar estatus" });
            res.json({ success: true, nuevoEstado });
        });
    });
});

// 6. RUTA AMIGABLE PARA EL ADMIN (Sirve tu archivo admin.html intacto)
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

// Puerto para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
