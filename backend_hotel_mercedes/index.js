// Archivo: index.js

// 1. Importar las dependencias
const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt'); // <-- Para encriptar contraseñas
const jwt = require('jsonwebtoken'); // <-- Para crear tokens de sesión

// Middleware para verificar el token (nuestro "guardia")
function verificarToken(req, res, next) {
    // Obtenemos el token del encabezado 'Authorization'
    // Formato esperado: "Bearer TOKEN_LARGO_AQUI"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Nos quedamos solo con el token

    if (token == null) {
        // No hay token, acceso denegado
        return res.sendStatus(401); // No autorizado
    }

    jwt.verify(token, JWT_SECRET, (err, usuario) => {
        if (err) {
            // El token es inválido o expiró
            return res.sendStatus(403); // Prohibido
        }
        
        // El token es válido, guardamos los datos del usuario en el 'req'
        // para que la siguiente función (la ruta) pueda usarlo
        req.usuario = usuario;
        next(); // ¡Pase, por favor!
    });
}

// NUEVO: Middleware para verificar si el usuario es administrador
function verificarAdmin(req, res, next) {
    if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ mensaje: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
}

// 2. Configuración inicial
const app = express();
const PORT = 3001;
const JWT_SECRET = 'tu_secreto_muy_seguro_aqui'; // <-- Cambia esto por una frase secreta

// 3. Middlewares
app.use(cors());
app.use(express.json());

// 4. Ruta de prueba (la que ya tenías)
app.get('/', (req, res) => {
    res.send('¡Hola! El servidor del Hotel Mercedes está funcionando.');
});

// 5. Ruta de prueba de BD (la que ya tenías)
app.get('/api/prueba-db', async (req, res) => {
    try {
        const [resultados] = await db.query('SELECT * FROM Habitaciones');
        res.json({
            mensaje: '¡Conexión a la BD exitosa!',
            habitaciones: resultados
        });
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al conectar con la base de datos',
            error: error.message
        });
    }
});


// -----------------------------------------------------------------
// ENDPOINT DE REGISTRO DE USUARIO
// -----------------------------------------------------------------
app.post('/api/register', async (req, res) => {
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
        res.status(500).json({ 
            mensaje: 'Error en el servidor al registrar usuario',
            error: error.message 
        });
    }
});


// -----------------------------------------------------------------
// MODIFICADO: ENDPOINT DE LOGIN DE USUARIO (mi_cuenta.html)
// -----------------------------------------------------------------
app.post('/api/login', async (req, res) => {
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
            { 
                id: usuario.id, 
                rol: usuario.rol 
            },
            JWT_SECRET,
            { expiresIn: '1h' } 
        );

        // MODIFICADO: Enviamos el token, nombre Y el ROL
        res.json({
            mensaje: '¡Bienvenido, ' + usuario.nombre + '!',
            token: token,
            nombre: usuario.nombre,
            rol: usuario.rol // <-- NUEVO: EL ROL ES VITAL PARA EL FRONTEND
        });

    } catch (error) {
        res.status(500).json({
            mensaje: 'Error en el servidor al iniciar sesión',
            error: error.message
        });
    }
});

// -----------------------------------------------------------------
// ENDPOINT PARA CREAR RESERVAS
// -----------------------------------------------------------------
app.post('/api/reservas', verificarToken, async (req, res) => {
    try {
        // Obtenemos el ID del usuario desde el token (que puso el middleware)
        const usuario_id = req.usuario.id;

        // Obtenemos los datos del formulario (enviados por script.js)
        const { habitacion, fecha, noches, huespedes, ninos, precioTotal } = req.body;
        
        // --- Importante: Convertir datos ---
        const mapHabitacionID = {
            'standard': 1,
            'suite': 2,
            'premium': 3
        };
        const habitacion_id = mapHabitacionID[habitacion];

        // 1. VALIDACIÓN DE PRESENCIA: 
        // Verificamos que todos los campos requeridos estén presentes (incluso si ninos es 0)
        // Usamos una verificación de null/undefined/cadena vacía, pero permitimos 0.
        if (!usuario_id || !habitacion_id || !fecha || noches == null || huespedes == null || ninos == null || precioTotal == null) {
            return res.status(400).json({ mensaje: 'Faltan datos para la reserva.' });
        }
        
        // 2. VALIDACIÓN LÓGICA: 
        // Verificamos que los campos que no pueden ser 0, sean positivos.
        if (noches <= 0 || huespedes <= 0 || precioTotal <= 0) {
            return res.status(400).json({ mensaje: 'El número de noches, huéspedes adultos y el precio total deben ser mayores a cero.' });
        }
        
        // 3. Guardamos la reserva en la BD
        const [resultado] = await db.query(
            'INSERT INTO Reservas (usuario_id, habitacion_id, fecha_reserva, num_noches, huespedes, ninos, precio_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [usuario_id, habitacion_id, fecha, noches, huespedes, ninos, precioTotal]
        );

        // 4. Respondemos con éxito
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
app.get('/api/mis-reservas', verificarToken, async (req, res) => {
    try {
        const usuario_id = req.usuario.id;
        const rol = req.usuario.rol;

        let querySQL;
        let queryParams = [];

        if (rol === 'administrador') {
            // Admin ve TODAS las reservas y el nombre/correo del usuario
            querySQL = `
                SELECT 
                    r.id,
                    r.fecha_reserva, 
                    r.num_noches, 
                    r.huespedes, 
                    r.ninos, 
                    r.precio_total, 
                    h.tipo AS habitacion_tipo,
                    u.nombre AS usuario_nombre,
                    u.correo AS usuario_correo
                FROM Reservas AS r
                JOIN Habitaciones AS h ON r.habitacion_id = h.id
                JOIN Usuarios AS u ON r.usuario_id = u.id
                ORDER BY r.fecha_reserva DESC`;
            // No hay parámetros
        } else {
            // Cliente ve solo sus reservas
            querySQL = `
                SELECT 
                    r.id,
                    r.fecha_reserva, 
                    r.num_noches, 
                    r.huespedes, 
                    r.ninos, 
                    r.precio_total, 
                    h.tipo AS habitacion_tipo 
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

// -----------------------------------------------------------------
// NUEVO: ENDPOINTS DE ADMINISTRACIÓN DE USUARIOS
// -----------------------------------------------------------------

// Endpoint 1: Obtener todos los usuarios (Solo Admin)
app.get('/api/users', verificarToken, verificarAdmin, async (req, res) => {
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

// Endpoint 2: Actualizar usuario (Solo Admin)
app.put('/api/users/:id', verificarToken, verificarAdmin, async (req, res) => {
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
// Endpoint 3: Eliminar usuario (Solo Admin)
app.delete('/api/users/:id', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // OPCIONAL: Podrías añadir lógica para asegurar que el admin no se elimine a sí mismo
        // if (req.usuario.id === parseInt(userId)) {
        //     return res.status(400).json({ mensaje: 'No puedes eliminar tu propia cuenta.' });
        // }
        
        // Primero, eliminar las reservas del usuario para evitar errores de llave foránea
        // Esta es la forma más sencilla: eliminar la relación.
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

// -----------------------------------------------------------------
// ENDPOINTS PARA RECUPERAR CONTRASEÑA
// -----------------------------------------------------------------

app.post('/api/recuperar/buscar-pregunta', async (req, res) => {
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

app.post('/api/recuperar/verificar-respuesta', async (req, res) => {
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

app.post('/api/recuperar/reset-password', async (req, res) => {
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

// 6. Iniciar el servidor (Esto se queda igual)
app.listen(PORT, () => {
    console.log(`Servidor corriendo exitosamente en http://localhost:${PORT}`);
});