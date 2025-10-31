// Archivo: index.js

// 1. Importar las dependencias
const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt'); // <-- Para encriptar contraseñas
const jwt = require('jsonwebtoken'); // <-- Para crear tokens de sesión

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
// ¡NUEVO! PASO 4.1: ENDPOINT DE REGISTRO DE USUARIO
// -----------------------------------------------------------------
app.post('/api/register', async (req, res) => {
    try {
        // Obtenemos los datos del frontend
        const { nombre, correo, password } = req.body;

        // Validamos que vengan los datos
        if (!nombre || !correo || !password) {
            return res.status(400).json({ mensaje: 'Todos los campos son requeridos.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        // 1. Encriptamos la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 2. Guardamos el nuevo usuario en la BD
        // Omitimos el 'rol' para que tome el default 'cliente'
        const [resultado] = await db.query(
            'INSERT INTO Usuarios (nombre, correo, password) VALUES (?, ?, ?)',
            [nombre, correo, passwordHash]
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
// ¡NUEVO! PASO 4.2: ENDPOINT DE LOGIN DE USUARIO (mi_cuenta.html)
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
            token: token
        });

    } catch (error) {
        res.status(500).json({
            mensaje: 'Error en el servidor al iniciar sesión',
            error: error.message
        });
    }
});


// 6. Iniciar el servidor (Esto se queda igual)
app.listen(PORT, () => {
    console.log(`Servidor corriendo exitosamente en http://localhost:${PORT}`);
});