// Archivo: db.js

const mysql = require('mysql2');

// Configura los detalles de tu base de datos
const dbConfig = {
    host: 'localhost',       // O la IP de tu servidor de base de datos
    user: 'root',            // Tu usuario de MySQL
    password: 'root',            // <-- PON TU CONTRASEÑA DE MYSQL AQUÍ
    database: 'hotel_mercedes_db' // El nombre de la base de datos que creamos
};

// Crea el "pool" de conexiones
const pool = mysql.createPool(dbConfig);

// Exportamos una función 'promise' para poder usar 'async/await'
module.exports = pool.promise();