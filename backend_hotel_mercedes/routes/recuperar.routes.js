// Archivo: backend_hotel_mercedes/routes/recuperar.routes.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// -----------------------------------------------------------------
// ENDPOINTS PARA RECUPERAR CONTRASEÑA
// -----------------------------------------------------------------

// Ruta: POST /api/recuperar/buscar-pregunta
router.post('/buscar-pregunta', async (req, res) => {
    try {
        const { correo } = req.body;
        
        const [usuarios] = await db.query(
            'SELECT pregunta_seguridad FROM Usuarios WHERE correo = ?',
            [correo]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ mensaje: 'Correo no encontrado.' });
        }

        const mapPreguntas = {
            'mascota': '¿Cuál es el nombre de tu primera mascota?',
            'madre': '¿Cuál es el apellido de soltera de tu madre?',
            'ciudad': '¿En qué ciudad naciste?'
        };

        const preguntaKey = usuarios[0].pregunta_seguridad;
        const preguntaTexto = mapPreguntas[preguntaKey] || 'Se encontró un error en su pregunta.';

        res.json({ pregunta: preguntaTexto });

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
    }
});

// Ruta: POST /api/recuperar/verificar-respuesta
router.post('/verificar-respuesta', async (req, res) => {
    try {
        const { correo, respuesta } = req.body;

        const [usuarios] = await db.query(
            'SELECT * FROM Usuarios WHERE correo = ?',
            [correo]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ mensaje: 'Correo no encontrado.' });
        }

        const usuario = usuarios[0];
        const respuestaCorrecta = await bcrypt.compare(respuesta, usuario.respuesta_seguridad);

        if (!respuestaCorrecta) {
            return res.status(400).json({ mensaje: 'Respuesta incorrecta.' });
        }

        const resetToken = jwt.sign(
            { id: usuario.id, tipo: 'reset' },
            JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.json({ 
            mensaje: '¡Respuesta correcta!',
            resetToken: resetToken 
        });

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
    }
});

// Ruta: POST /api/recuperar/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { resetToken, nuevoPassword } = req.body;

        if (nuevoPassword.length < 6) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        let payload;
        try {
            payload = jwt.verify(resetToken, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ mensaje: 'Token inválido o expirado. Vuelve a empezar.' });
        }

        if (payload.tipo !== 'reset') {
            return res.status(401).json({ mensaje: 'Token no autorizado para esta acción.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(nuevoPassword, salt);

        await db.query(
            'UPDATE Usuarios SET password = ? WHERE id = ?',
            [passwordHash, payload.id]
        );

        res.json({ mensaje: '¡Contraseña actualizada exitosamente!' });

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
    }
});

// Exportamos el router
module.exports = router;