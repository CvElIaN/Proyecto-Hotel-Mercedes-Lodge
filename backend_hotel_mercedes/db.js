// Archivo: db.js

const mysql = require('mysql2');

// Configura los detalles de tu base de datos
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// Crea el "pool" de conexiones
const pool = mysql.createPool(dbConfig);

// Exportamos una función 'promise' para poder usar 'async/await'
module.exports = pool.promise();