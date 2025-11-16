// Archivo: backend_hotel_mercedes/routes/reservas.routes.js

const express = require('express');
const router = express.Router();
const db = require('../db'); // Importamos la BD
const { verificarToken } = require('../middleware/auth.middleware.js'); // Importamos nuestro middleware

// -----------------------------------------------------------------
// ENDPOINT PARA CREAR RESERVAS
// -----------------------------------------------------------------
// Ruta: POST /api/reservas
router.post('/reservas', verificarToken, async (req, res) => {
    try {
        const usuario_id = req.usuario.id;
        const { habitacion, fecha, noches, huespedes, ninos, precioTotal } = req.body;
        
        const mapHabitacionID = {
            'standard': 1,
            'suite': 2,
            'premium': 3
        };
        const habitacion_id = mapHabitacionID[habitacion];

        if (!usuario_id || !habitacion_id || !fecha || noches == null || huespedes == null || ninos == null || precioTotal == null) {
            return res.status(400).json({ mensaje: 'Faltan datos para la reserva.' });
        }
        
        if (noches <= 0 || huespedes <= 0 || precioTotal <= 0) {
            return res.status(400).json({ mensaje: 'El número de noches, huéspedes adultos y el precio total deben ser mayores a cero.' });
        }
        
        const [resultado] = await db.query(
            'INSERT INTO Reservas (usuario_id, habitacion_id, fecha_reserva, num_noches, huespedes, ninos, precio_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [usuario_id, habitacion_id, fecha, noches, huespedes, ninos, precioTotal]
        );

        res.status(201).json({ 
            mensaje: '¡Reserva registrada exitosamente!',
            reservaId: resultado.insertId 
        });

    } catch (error) {
        res.status(500).json({ 
            mensaje: 'Error en el servidor al crear la reserva',
            error: error.message 
        });
    }
});

// -----------------------------------------------------------------
// ENDPOINT PARA OBTENER LAS RESERVAS (Cliente O Admin)
// -----------------------------------------------------------------
// Ruta: GET /api/mis-reservas
router.get('/mis-reservas', verificarToken, async (req, res) => {
    try {
        const usuario_id = req.usuario.id;
        const rol = req.usuario.rol;

        let querySQL;
        let queryParams = [];

        if (rol === 'administrador') {
            querySQL = `
                SELECT 
                    r.id, r.fecha_reserva, r.num_noches, r.huespedes, r.ninos, 
                    r.precio_total, h.tipo AS habitacion_tipo, u.nombre AS usuario_nombre,
                    u.correo AS usuario_correo
                FROM Reservas AS r
                JOIN Habitaciones AS h ON r.habitacion_id = h.id
                JOIN Usuarios AS u ON r.usuario_id = u.id
                ORDER BY r.fecha_reserva DESC`;
        } else {
            querySQL = `
                SELECT 
                    r.id, r.fecha_reserva, r.num_noches, r.huespedes, r.ninos, 
                    r.precio_total, h.tipo AS habitacion_tipo 
                FROM Reservas AS r
                JOIN Habitaciones AS h ON r.habitacion_id = h.id
                WHERE r.usuario_id = ?
                ORDER BY r.fecha_reserva DESC`;
            queryParams = [usuario_id];
        }

        const [reservas] = await db.query(querySQL, queryParams);
        res.json(reservas);

    } catch (error) {
        res.status(500).json({
            mensaje: 'Error en el servidor al obtener las reservas',
            error: error.message
        });
    }
});


// Exportamos el router
module.exports = router;