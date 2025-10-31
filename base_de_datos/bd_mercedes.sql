create database hotel_mercedes_db;
use hotel_mercedes_db;
CREATE TABLE IF NOT EXISTS Usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Guardaremos la contraseña encriptada
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente' -- 'cliente' o 'administrador'
);
CREATE TABLE IF NOT EXISTS Habitaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL UNIQUE,
    precio_noche DECIMAL(10, 2) NOT NULL
);
INSERT IGNORE INTO Habitaciones (tipo, precio_noche) VALUES
('standard', 150.00),
('suite', 250.00),
('premium', 350.00);
CREATE TABLE IF NOT EXISTS Reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    habitacion_id INT NOT NULL,
    fecha_reserva DATE NOT NULL,
    num_noches INT NOT NULL,
    huespedes INT NOT NULL,
    ninos INT NOT NULL,
    precio_total DECIMAL(10, 2) NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Creamos las relaciones (llaves foráneas)
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id),
    FOREIGN KEY (habitacion_id) REFERENCES Habitaciones(id)
);