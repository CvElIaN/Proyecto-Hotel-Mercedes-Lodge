// Archivo: backend_hotel_mercedes/routes/auth.routes.js

const express = require('express');
const router = express.Router();
const db = require('../db'); // Importamos la BD (fíjate en el ../ para subir un nivel)
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Obtenemos el JWT_SECRET de las variables de entorno
const JWT_SECRET = process.env.JWT_SECRET;

// -----------------------------------------------------------------
// ENDPOINT DE REGISTRO DE USUARIO
// -----------------------------------------------------------------
// Nota: la ruta '/api/register' se convierte en solo '/register'
router.post('/register', async (req, res) => {
    try {
        const { nombre, correo, password, pregunta, respuesta } = req.body;

        if (!nombre || !correo || !password || !pregunta || !respuesta) {
            return res.status(400).json({ mensaje: 'Todos los campos son requeridos.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const respuestaHash = await bcrypt.hash(respuesta, salt);

        const [resultado] = await db.query(
            'INSERT INTO Usuarios (nombre, correo, password, pregunta_seguridad, respuesta_seguridad) VALUES (?, ?, ?, ?, ?)',
            [nombre, correo, passwordHash, pregunta, respuestaHash]
        );

        res.status(201).json({ 
            mensaje: '¡Usuario registrado exitosamente!',
            usuarioId: resultado.insertId 
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado.' });
        }
        console.error('¡ERROR AL REGISTRAR!', error);
        res.status(500).json({ 
            mensaje: 'Error en el servidor al registrar usuario',
            error: error.message 
        });
    }
});


// -----------------------------------------------------------------
// ENDPOINT DE LOGIN DE USUARIO
// -----------------------------------------------------------------
// Nota: la ruta '/api/login' se convierte en solo '/login'
router.post('/login', async (req, res) => {
    try {
        const { correo, password } = req.body;

        const [usuarios] = await db.query(
            'SELECT * FROM Usuarios WHERE correo = ?',
            [correo]
        );

        if (usuarios.length === 0) {
            return res.status(400).json({ mensaje: 'Correo o contraseña incorrectos.' });
        }

        const usuario = usuarios[0];
        const passCorrecto = await bcrypt.compare(password, usuario.password);

        if (!passCorrecto) {
            return res.status(400).json({ mensaje: 'Correo o contraseña incorrectos.' });
        }

        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol },
            JWT_SECRET,
            { expiresIn: '1h' } 
        );

        res.json({
            mensaje: '¡Bienvenido, ' + usuario.nombre + '!',
            token: token,
            nombre: usuario.nombre,
            rol: usuario.rol
        });

    } catch (error) {
        res.status(500).json({
            mensaje: 'Error en el servidor al iniciar sesión',
            error: error.message
        });
    }
});

// Exportamos el router para que index.js pueda usarlo
module.exports = router;