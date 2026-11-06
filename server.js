const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para leer datos JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Configurar y conectar la Base de Datos SQLite
const dbFile = path.join(__dirname, 'gym_database.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
    }
});

// Crear tabla de inscripciones si no existe
db.run(`CREATE TABLE IF NOT EXISTS inscripciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    plan TEXT NOT NULL,
    monto REAL NOT NULL,
    metodo_pago TEXT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Ruta para recibir los datos del formulario de planes
app.post('/api/inscripciones', (req, res) => {
    const { nombre, telefono, plan, monto, metodo_pago } = req.body;

    const query = `INSERT INTO inscripciones (nombre, telefono, plan, monto, metodo_pago) VALUES (?, ?, ?, ?, ?)`;

    db.run(query, [nombre, telefono, plan, monto, metodo_pago], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Error al registrar en la base de datos' });
        }
        res.json({ 
            mensaje: 'Inscripción guardada con éxito', 
            id: this.lastID 
        });
    });
});

// Rutas amigables para las páginas HTML (ej. /planes, /catalogo, /index)
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'public', `${page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
        }
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
