// Archivo: backend_hotel_mercedes/routes/users.routes.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const { verificarToken, verificarAdmin } = require('../middleware/auth.middleware.js');

// -----------------------------------------------------------------
// ENDPOINTS DE ADMINISTRACIÓN DE USUARIOS
// -----------------------------------------------------------------

// Ruta: GET /api/users
// (Solo Admin)
router.get('/users', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const [usuarios] = await db.query(
            'SELECT id, nombre, correo, rol FROM Usuarios ORDER BY id ASC'
        );
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ 
            mensaje: 'Error en el servidor al obtener usuarios',
            error: error.message 
        });
    }
});

// Ruta: PUT /api/users/:id
// (Solo Admin)
router.put('/users/:id', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { nombre, correo, rol } = req.body; 

        if (!nombre || !correo || !rol) {
            return res.status(400).json({ mensaje: 'Todos los campos son requeridos.' });
        }
        
        await db.query(
            'UPDATE Usuarios SET nombre = ?, correo = ?, rol = ? WHERE id = ?',
            [nombre, correo, rol, userId]
        );

        res.json({ mensaje: 'Usuario actualizado exitosamente.' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado en otra cuenta.' });
        }
        res.status(500).json({ 
            mensaje: 'Error en el servidor al actualizar usuario',
            error: error.message 
        });
    }
});

// Ruta: DELETE /api/users/:id
// (Solo Admin)
router.delete('/users/:id', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Primero, eliminar las reservas del usuario
        await db.query('DELETE FROM Reservas WHERE usuario_id = ?', [userId]);

        // Luego, eliminar el usuario
        const [resultado] = await db.query(
            'DELETE FROM Usuarios WHERE id = ?',
            [userId]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        res.json({ mensaje: 'Usuario eliminado exitosamente.' });

    } catch (error) {
        res.status(500).json({ 
            mensaje: 'Error en el servidor al eliminar usuario',
            error: error.message 
        });
    }
});


// Exportamos el router
module.exports = router;