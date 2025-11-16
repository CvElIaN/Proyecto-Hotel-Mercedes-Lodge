require('dotenv').config();
// Archivo: index.js

// 1. Importar las dependencias
const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/auth.routes');
const { verificarToken, verificarAdmin } = require('./middleware/auth.middleware.js');
const reservasRoutes = require('./routes/reservas.routes.js');
const usersRoutes = require('./routes/users.routes.js');
const recuperarRoutes = require('./routes/recuperar.routes.js');
// 2. Configuración inicial
const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET;
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
// RUTAS DE API MODULARIZADAS
app.use('/api', authRoutes);
app.use('/api', reservasRoutes);
app.use('/api', usersRoutes);
app.use('/api/recuperar', recuperarRoutes);
// 6. Iniciar el servidor (Esto se queda igual)
app.listen(PORT, () => {
    console.log(`Servidor corriendo exitosamente en http://localhost:${PORT}`);
});