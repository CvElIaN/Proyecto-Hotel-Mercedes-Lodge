// Definimos la URL de nuestro backend
const API_URL = 'http://localhost:3001/api';

/*
=========================================
 CÓDIGO PARA EL FORMULARIO DE RESERVA
 (Por ahora, lo dejamos como estaba,
  luego lo conectaremos)
=========================================
*/
document.getElementById("fecha").min = new Date().toISOString().split("T")[0];

function calcularPrecio() {
    const precioHabitaciones = {
        standard: 150,
        suite: 250,
        premium: 350
    };
    const habitacion = document.getElementById("habitacion").value;
    const noches = parseInt(document.getElementById("noches").value);
    
    if (!habitacion || !noches) {
         document.getElementById("precio").value = "";
        return;
    }
    
    const precioFinal = precioHabitaciones[habitacion] * noches;
    document.getElementById("precio").value = "S/" + precioFinal;
}

if (document.getElementById("formReserva")) {
    document.getElementById("habitacion").addEventListener("change", calcularPrecio);
    document.getElementById("noches").addEventListener("change", calcularPrecio);
    
    document.getElementById("formReserva").addEventListener("submit", function(event) {
        event.preventDefault(); 
        
        // Lógica de reserva (temporal)
        const nombre = document.getElementById("nombre").value;
        const mensajeElemento = document.getElementById("mensaje");
        mensajeElemento.textContent = "¡Gracias, " + nombre + "! Tu reserva ha sido registrada.";
        mensajeElemento.style.color = "#007700";
        document.getElementById("formReserva").reset();
        document.getElementById("precio").value = "";
    });
}


/*
=========================================
 ¡NUEVO! CÓDIGO PARA EL FORMULARIO DE LOGIN
 (mi_cuenta.html)
=========================================
*/
const formLogin = document.getElementById("formLogin");

if (formLogin) {
    formLogin.addEventListener("submit", async function(event) {
        event.preventDefault(); 

        const correo = document.getElementById("correoLogin").value;
        const pass = document.getElementById("passLogin").value;
        const mensajeLogin = document.getElementById("mensajeLogin");

        try {
            // 1. Llamamos al endpoint /api/login de nuestro backend
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    correo: correo,
                    password: pass
                })
            });

            // 2. Obtenemos la respuesta del backend
            const data = await response.json();

            // 3. Mostramos el mensaje (de éxito o error)
            if (response.ok) {
                // Éxito
                mensajeLogin.textContent = data.mensaje; // "¡Bienvenido, ...!"
                mensajeLogin.style.color = "#007700";
                formLogin.reset();
                
                // ¡IMPORTANTE! Guardamos el token en el navegador
                // Esto nos servirá para saber que el usuario está logueado
                localStorage.setItem('token', data.token);

                // Opcional: Redirigir al usuario a la página de reservas
                // window.location.href = 'reserva_hotel.html';

            } else {
                // Error (ej. "Correo o contraseña incorrectos")
                mensajeLogin.textContent = data.mensaje;
                mensajeLogin.style.color = "#990000";
            }

        } catch (error) {
            // Error de conexión (ej. si el backend está caído)
            mensajeLogin.textContent = "Error de conexión. Inténtelo más tarde.";
            mensajeLogin.style.color = "#990000";
            console.error('Error en el login:', error);
        }
    });
}


/*
=========================================
 ¡NUEVO! CÓDIGO PARA EL FORMULARIO DE REGISTRO
 (registro.html)
=========================================
*/
const formRegistro = document.getElementById("formRegistro");

if (formRegistro) {
    formRegistro.addEventListener("submit", async function(event) {
        event.preventDefault();

        const nombre = document.getElementById("nombreRegistro").value;
        const correo = document.getElementById("correoRegistro").value;
        const pass = document.getElementById("passRegistro").value;
        const mensajeRegistro = document.getElementById("mensajeRegistro");

        try {
            // 1. Llamamos al endpoint /api/register de nuestro backend
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre: nombre,
                    correo: correo,
                    password: pass
                })
            });
            
            // 2. Obtenemos la respuesta
            const data = await response.json();

            // 3. Mostramos el mensaje (de éxito o error)
            if (response.ok) {
                // Éxito
                mensajeRegistro.textContent = data.mensaje; // "¡Usuario registrado...!"
                mensajeRegistro.style.color = "#007700";
                formRegistro.reset();

                // Opcional: Redirigir al login después de 2 segundos
                // setTimeout(() => {
                //    window.location.href = 'mi_cuenta.html';
                // }, 2000);

            } else {
                // Error (ej. "El correo ya existe")
                mensajeRegistro.textContent = data.mensaje;
                mensajeRegistro.style.color = "#990000";
            }

        } catch (error) {
            // Error de conexión
            mensajeRegistro.textContent = "Error de conexión. Inténtelo más tarde.";
            mensajeRegistro.style.color = "#990000";
            console.error('Error en el registro:', error);
        }
    });
}