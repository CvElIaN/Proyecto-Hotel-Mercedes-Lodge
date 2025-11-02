// Definimos la URL de nuestro backend
const API_URL = 'http://localhost:3001/api';

/*
=========================================
 CÓDIGO PARA EL FORMULARIO DE RESERVA
=========================================
*/
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
    // (Esta es la línea que movimos antes, se queda)
    document.getElementById("fecha").min = new Date().toISOString().split("T")[0];
    
    document.getElementById("habitacion").addEventListener("change", calcularPrecio);
    document.getElementById("noches").addEventListener("change", calcularPrecio);
    
    // ▼▼ MODIFICAMOS EL SUBMIT ▼▼
    document.getElementById("formReserva").addEventListener("submit", async function(event) {
        event.preventDefault(); 
        
        const mensajeElemento = document.getElementById("mensaje");

        // 1. Verificar si el usuario está logueado
        const token = localStorage.getItem('token');
        if (!token) {
            mensajeElemento.textContent = "Error: Debes iniciar sesión para poder reservar.";
            mensajeElemento.style.color = "#990000";
            return;
        }

        // 2. Recolectar todos los datos del formulario
        const habitacion = document.getElementById("habitacion").value;
        const fecha = document.getElementById("fecha").value;
        const noches = parseInt(document.getElementById("noches").value);
        const huespedes = parseInt(document.getElementById("huespedes").value);
        const ninos = parseInt(document.getElementById("ninos").value);
        
        // 3. Limpiar el precio (de "S/300" a 300)
        const precioOutput = document.getElementById("precio").value;
        const precioTotal = Number(precioOutput.replace('S/', ''));
        
        try {
            // 4. Enviar los datos al backend
            const response = await fetch(`${API_URL}/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // ¡IMPORTANTE! Enviamos el token para que el "guardia" nos deje pasar
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    habitacion: habitacion,
                    fecha: fecha,
                    noches: noches,
                    huespedes: huespedes,
                    ninos: ninos,
                    precioTotal: precioTotal // Este nombre debe coincidir con el backend
                })
            });

            const data = await response.json();

            if (response.ok) {
                // ¡Éxito!
                mensajeElemento.textContent = data.mensaje; // "¡Reserva registrada...!"
                mensajeElemento.style.color = "#007700";
                document.getElementById("formReserva").reset();
                document.getElementById("precio").value = "";
            } else {
                // Error (ej. token expirado o datos incorrectos)
                if (response.status === 401 || response.status === 403) {
                   mensajeElemento.textContent = "Error: Tu sesión ha expirado. Por favor, inicia sesión de nuevo.";
                } else {
                   mensajeElemento.textContent = data.mensaje; // "Faltan datos..."
                }
                mensajeElemento.style.color = "#990000";
            }

        } catch (error) {
            mensajeElemento.textContent = "Error de conexión con el servidor.";
            mensajeElemento.style.color = "#990000";
            console.error('Error al reservar:', error);
        }
    });
}

const formLogin = document.getElementById("formLogin");

if (formLogin) {
    formLogin.addEventListener("submit", async function(event) {
        event.preventDefault(); 

        const correo = document.getElementById("correoLogin").value;
        const pass = document.getElementById("passLogin").value;
        const mensajeLogin = document.getElementById("mensajeLogin");

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: correo, password: pass })
            });

            const data = await response.json();

            if (response.ok) {
                // Éxito
                mensajeLogin.textContent = data.mensaje;
                mensajeLogin.style.color = "#007700";
                formLogin.reset();
                
                // ¡IMPORTANTE! Guardamos el token Y el nombre
                localStorage.setItem('token', data.token);
                localStorage.setItem('userName', data.nombre); // <-- NUEVO
                localStorage.setItem('userRole', data.rol); // <-- ROL AÑADIDO

                // Mostramos el panel de usuario
                mostrarInfoUsuario(data.token, data.nombre);

            } else {
                // Error (ej. "Correo o contraseña incorrectos")
                mensajeLogin.textContent = data.mensaje;
                mensajeLogin.style.color = "#990000";
            }

        } catch (error) {
            mensajeLogin.textContent = "Error de conexión. Inténtelo más tarde.";
            mensajeLogin.style.color = "#990000";
            console.error('Error en el login:', error);
        }
    });

    // --- NUEVO: Verificamos si ya hay sesión al cargar la página ---
    document.addEventListener('DOMContentLoaded', () => {
        const token = localStorage.getItem('token');
        const nombre = localStorage.getItem('userName');
        const rol = localStorage.getItem('userRole');

        // Si estamos en mi_cuenta.html Y tenemos token, mostramos el panel
        if (token && nombre && document.getElementById('zonaLogin')) {
            mostrarInfoUsuario(token, nombre, rol);
        }
    });

    // --- NUEVO: Lógica para cerrar sesión ---
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if(btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
            // Borramos los datos
            localStorage.removeItem('token');
            localStorage.removeItem('userName');
            localStorage.removeItem('userRole');

            // Mostramos el login y ocultamos el panel
            document.getElementById('zonaLogin').classList.remove('hidden');
            document.getElementById('infoUsuario').classList.add('hidden');
            
            // Limpiamos los datos
            document.getElementById('saludoUsuario').textContent = '';
            document.getElementById('listaReservas').innerHTML = '';
            document.getElementById('mensajeLogin').textContent = '';
        });
    }
}

const formRegistro = document.getElementById("formRegistro");

if (formRegistro) {
    formRegistro.addEventListener("submit", async function(event) {
        event.preventDefault();

        const nombre = document.getElementById("nombreRegistro").value;
        const correo = document.getElementById("correoRegistro").value;
        const pass = document.getElementById("passRegistro").value;
        const confirmPass = document.getElementById("confirmPassRegistro").value;
        
        // ¡NUEVO! Obtener los valores de las preguntas
        const pregunta = document.getElementById("preguntaRegistro").value;
        const respuesta = document.getElementById("respuestaRegistro").value;
        
        const mensajeRegistro = document.getElementById("mensajeRegistro");

        if (pass !== confirmPass) {
            mensajeRegistro.textContent = "Las contraseñas no coinciden.";
            mensajeRegistro.style.color = "#990000";
            return; // Detiene el envío del formulario
        }

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
                    password: pass,
                    pregunta: pregunta,   // ¡NUEVO!
                    respuesta: respuesta  // ¡NUEVO!
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

                setTimeout(() => {
                   window.location.href = 'mi_cuenta.html';
                }, 2000);

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
// =======================================================
// NUEVAS FUNCIONES PARA EL PANEL DE "MI CUENTA"
// =======================================================

function mostrarInfoUsuario(token, nombre, rol) {
    // 1. Ocultar el formulario de login
    document.getElementById('zonaLogin').classList.add('hidden');
    
    // 2. Mostrar el panel de info de usuario
    const infoUsuarioDiv = document.getElementById('infoUsuario');
    infoUsuarioDiv.classList.remove('hidden');

    // 3. Poner el saludo
    document.getElementById('saludoUsuario').textContent = `¡Hola, ${nombre}!`;

    // 4. Cargar las reservas
    cargarReservas(token);
}

async function cargarReservas(token) {
    const listaReservasDiv = document.getElementById('listaReservas');
    listaReservasDiv.innerHTML = '<p>Cargando tus reservas...</p>'; // Mensaje temporal

    try {
        const response = await fetch(`${API_URL}/mis-reservas`, {
            method: 'GET',
            headers: {
                // Enviamos el token para que el "guardia" nos deje pasar
                'Authorization': `Bearer ${token}` 
            }
        });

        if (!response.ok) {
            // El token expiró o algo salió mal
            listaReservasDiv.innerHTML = '<p>Error al cargar tus reservas. Intenta iniciar sesión de nuevo.</p>';
            return;
        }

        const reservas = await response.json();

        if (reservas.length === 0) {
            listaReservasDiv.innerHTML = '<p>Aún no tienes ninguna reserva registrada.</p>';
            return;
        }

        // Si hay reservas, las mostramos
        listaReservasDiv.innerHTML = ''; // Limpiamos el "Cargando..."

        reservas.forEach(reserva => {
            // Formateamos la fecha (viene como YYYY-MM-DD)
            const fecha = new Date(reserva.fecha_reserva).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
            });

            // Creamos la "tarjeta" de reserva
            const reservaItem = document.createElement('div');
            reservaItem.className = 'reserva-item';
            reservaItem.innerHTML = `
                <h4>Habitación ${reserva.habitacion_tipo}</h4>
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Noches:</strong> ${reserva.num_noches}</p>
                <p><strong>Huéspedes:</strong> ${reserva.huespedes} Adultos, ${reserva.ninos} Niños</p>
                <p class="precio"><strong>Total pagado:</strong> S/${reserva.precio_total}</p>
            `;
            listaReservasDiv.appendChild(reservaItem);
        });

    } catch (error) {
        listaReservasDiv.innerHTML = '<p>Error de conexión al cargar tus reservas.</p>';
        console.error('Error cargando reservas:', error);
    }
}

// =======================================================
// CÓDIGO PARA RECUPERAR CONTRASEÑA (De la fase anterior)
// =======================================================

const formRecuperar = document.getElementById('formRecuperar');

if (formRecuperar) {
    // Variables para guardar el estado del formulario
    let pasoActual = 1; // 1: correo, 2: respuesta, 3: password
    let correoRecuperar = '';
    let tokenRecuperar = '';

    const mensajeRecuperar = document.getElementById('mensajeRecuperar');
    const btnRecuperar = document.getElementById('btnRecuperar');

    // Referencias a los pasos
    const paso1 = document.getElementById('paso1_correo');
    const paso2 = document.getElementById('paso2_pregunta');
    const paso3 = document.getElementById('paso3_password');
    
    // Referencias a los inputs
    const inputCorreo = document.getElementById('correoRecuperar');
    const inputRespuesta = document.getElementById('respuestaRecuperar');
    const labelPregunta = document.getElementById('labelPregunta');
    const inputPass = document.getElementById('passRecuperar');
    const inputConfirmPass = document.getElementById('confirmPassRecuperar');


    formRecuperar.addEventListener('submit', async function(event) {
        event.preventDefault(); 
        mensajeRecuperar.textContent = ''; // Limpiamos mensajes
        // Eliminamos el console.log de diagnóstico aquí

        // Desactivamos el botón para evitar clics múltiples
        btnRecuperar.disabled = true;
        btnRecuperar.textContent = 'Cargando...';

        try {
            if (pasoActual === 1) {
                // --- PASO 1: BUSCAR PREGUNTA ---
                correoRecuperar = inputCorreo.value;
                const response = await fetch(`${API_URL}/recuperar/buscar-pregunta`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: correoRecuperar })
                });

                const data = await response.json();

                if (response.ok) {
                    // Éxito: Mostramos la pregunta
                    labelPregunta.textContent = data.pregunta;
                    paso1.classList.add('hidden');
                    paso2.classList.remove('hidden');
                    pasoActual = 2;
                    btnRecuperar.textContent = 'Verificar Respuesta';
                } else {
                    // Error: (ej. Correo no encontrado)
                    throw new Error(data.mensaje);
                }

            } else if (pasoActual === 2) {
                // --- PASO 2: VERIFICAR RESPUESTA ---
                const respuesta = inputRespuesta.value;
                const response = await fetch(`${API_URL}/recuperar/verificar-respuesta`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: correoRecuperar, respuesta: respuesta })
                });
                
                const data = await response.json();

                if (response.ok) {
                    // Éxito: Tenemos token, pasamos a pedir contraseña
                    tokenRecuperar = data.resetToken;
                    paso2.classList.add('hidden');
                    paso3.classList.remove('hidden');
                    pasoActual = 3;
                    btnRecuperar.textContent = 'Actualizar Contraseña';
                } else {
                    // Error: (ej. Respuesta incorrecta)
                    throw new Error(data.mensaje);
                }

            } else if (pasoActual === 3) {
                // --- PASO 3: RESETEAR CONTRASEÑA ---
                const nuevoPassword = inputPass.value;
                const confirmPassword = inputConfirmPass.value;

                if (nuevoPassword !== confirmPassword) {
                    throw new Error('Las contraseñas no coinciden.');
                }

                const response = await fetch(`${API_URL}/recuperar/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resetToken: tokenRecuperar, nuevoPassword: nuevoPassword })
                });

                const data = await response.json();
                
                if (response.ok) {
                    // ¡TODO SALIÓ BIEN!
                    mensajeRecuperar.textContent = data.mensaje;
                    mensajeRecuperar.style.color = '#007700';
                    formRecuperar.reset();
                    btnRecuperar.textContent = '¡Éxito!';
                    
                    // Redireccionamos
                    setTimeout(() => {
                        window.location.href = 'mi_cuenta.html';
                    }, 2000); 

                    // Importante: No seguimos ejecutando código del finally
                    return; 

                } else {
                    // Error: (ej. Token expirado)
                    throw new Error(data.mensaje);
                }
            }
        } catch (error) {
            // Manejador de errores general
            mensajeRecuperar.textContent = error.message;
            mensajeRecuperar.style.color = '#990000';
            
            // Si el error es por token expirado, reiniciamos el formulario
            if (error.message.includes('expirado')) {
                setTimeout(() => location.reload(), 2000);
            }
        }

        // Reactivamos el botón si falló
        btnRecuperar.disabled = false;
        if (pasoActual === 1) {
            btnRecuperar.textContent = 'Siguiente';
        } else if (pasoActual === 2) {
            btnRecuperar.textContent = 'Verificar Respuesta';
        } else if (pasoActual === 3) {
            btnRecuperar.textContent = 'Actualizar Contraseña';
        }
    });
}