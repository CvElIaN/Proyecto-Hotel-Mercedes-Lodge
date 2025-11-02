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
// ENDPOINT DE REGISTRO DE USUARIO (ACTUALIZADO)
// -----------------------------------------------------------------
app.post('/api/register', async (req, res) => {
    try {
        // Obtenemos los datos del frontend (¡con los campos nuevos!)
        const { nombre, correo, password, pregunta, respuesta } = req.body;

        // Validamos que vengan los datos
        if (!nombre || !correo || !password || !pregunta || !respuesta) {
            return res.status(400).json({ mensaje: 'Todos los campos son requeridos.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        // 1. Encriptamos AMBAS cosas: contraseña y respuesta
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const respuestaHash = await bcrypt.hash(respuesta, salt); // ¡NUEVO!

        // 2. Guardamos el nuevo usuario en la BD
        const [resultado] = await db.query(
            'INSERT INTO Usuarios (nombre, correo, password, pregunta_seguridad, respuesta_seguridad) VALUES (?, ?, ?, ?, ?)',
            [nombre, correo, passwordHash, pregunta, respuestaHash] // ¡ACTUALIZADO!
        );

        // 3. Respondemos con éxito
        res.status(201).json({ 
            mensaje: '¡Usuario registrado exitosamente!',
            usuarioId: resultado.insertId 
        });

    } catch (error) {
        // Manejo de error (ej. si el correo ya existe)
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
// ENDPOINT DE LOGIN DE USUARIO (mi_cuenta.html)
// -----------------------------------------------------------------
app.post('/api/login', async (req, res) => {
    try {
        // Obtenemos los datos de mi_cuenta.html
        const { correo, password } = req.body;

        // 1. Verificamos que el correo exista
        const [usuarios] = await db.query(
            'SELECT * FROM Usuarios WHERE correo = ?',
            [correo]
        );

        if (usuarios.length === 0) {
            return res.status(400).json({ mensaje: 'Correo o contraseña incorrectos.' });
        }

        const usuario = usuarios[0];

        // 2. Comparamos la contraseña que nos da el usuario
        //    con la contraseña encriptada que tenemos en la BD
        const passCorrecto = await bcrypt.compare(password, usuario.password);

        if (!passCorrecto) {
            return res.status(400).json({ mensaje: 'Correo o contraseña incorrectos.' });
        }

        // 3. Si todo está bien, creamos un Token (JWT)
        // El token guarda el ID del usuario y su ROL
        const token = jwt.sign(
            { 
                id: usuario.id, 
                rol: usuario.rol 
            },
            JWT_SECRET,
            { expiresIn: '1h' } // El token expira en 1 hora
        );

        // 4. Enviamos el token al frontend
        res.json({
            mensaje: '¡Bienvenido, ' + usuario.nombre + '!',
            token: token,
            nombre: usuario.nombre,
            rol: usuario.rol // Lo incluimos para el futuro panel de admin
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

        // Validamos que los datos no estén vacíos
        if (!usuario_id || !habitacion_id || !fecha || !noches || !huespedes || !ninos || !precioTotal) {
            return res.status(400).json({ mensaje: 'Faltan datos para la reserva.' });
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
// ENDPOINT PARA OBTENER LAS RESERVAS DE UN USUARIO
// -----------------------------------------------------------------
app.get('/api/mis-reservas', verificarToken, async (req, res) => {
    try {
        // El ID del usuario viene del token
        const usuario_id = req.usuario.id;

        // Hacemos un JOIN para obtener el nombre de la habitación
        const [reservas] = await db.query(
            `SELECT 
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
            ORDER BY r.fecha_reserva DESC`,
            [usuario_id]
        );

        res.json(reservas); // Enviamos el array de reservas

    } catch (error) {
        res.status(500).json({
            mensaje: 'Error en el servidor al obtener las reservas',
            error: error.message
        });
    }
});

// -----------------------------------------------------------------
// NUEVO ENDPOINTS PARA RECUPERAR CONTRASEÑA
// -----------------------------------------------------------------

// Endpoint 1: Buscar la pregunta del usuario
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

        // Mapeamos el código a la pregunta real
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

// Endpoint 2: Verificar la respuesta y generar token de reseteo
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

        // Comparamos la respuesta del usuario con la encriptada
        const respuestaCorrecta = await bcrypt.compare(respuesta, usuario.respuesta_seguridad);

        if (!respuestaCorrecta) {
            return res.status(400).json({ mensaje: 'Respuesta incorrecta.' });
        }

        // ¡Respuesta correcta! Creamos un token especial de reseteo
        const resetToken = jwt.sign(
            { id: usuario.id, tipo: 'reset' }, // 'tipo' es importante
            JWT_SECRET,
            { expiresIn: '10m' } // 10 minutos
        );

        res.json({ 
            mensaje: '¡Respuesta correcta!',
            resetToken: resetToken 
        });

    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
    }
});

// Endpoint 3: Resetear la contraseña final
app.post('/api/recuperar/reset-password', async (req, res) => {
    try {
        const { resetToken, nuevoPassword } = req.body;

        if (nuevoPassword.length < 6) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        // 1. Verificamos el token de reseteo
        let payload;
        try {
            payload = jwt.verify(resetToken, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ mensaje: 'Token inválido o expirado. Vuelve a empezar.' });
        }

        // 2. Nos aseguramos que sea un token de 'reset'
        if (payload.tipo !== 'reset') {
            return res.status(401).json({ mensaje: 'Token no autorizado para esta acción.' });
        }

        // 3. Todo en orden, encriptamos la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(nuevoPassword, salt);

        // 4. Actualizamos en la BD
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