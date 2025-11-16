// Archivo: backend_hotel_mercedes/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware para verificar el token (nuestro "guardia")
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        return res.sendStatus(401); // No autorizado
    }

    jwt.verify(token, JWT_SECRET, (err, usuario) => {
        if (err) {
            return res.sendStatus(403); // Prohibido
        }
        req.usuario = usuario;
        next(); 
    });
}

// Middleware para verificar si el usuario es administrador
function verificarAdmin(req, res, next) {
    if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ mensaje: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
}

// Exportamos ambas funciones
module.exports = {
    verificarToken,
    verificarAdmin
};