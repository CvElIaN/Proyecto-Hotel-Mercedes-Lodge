// Definimos la URL de nuestro backend
const API_URL = 'http://localhost:3001/api';
/**
 * Función "envoltorio" (wrapper) para todas las llamadas a nuestra API.
 * Se encarga de:
 * 1. Añadir el prefijo API_URL al endpoint.
 * 2. Añadir el token de autenticación (si es necesario).
 * 3. Convertir el 'body' a JSON y añadir el 'Content-Type' automáticamente.
 * 4. Lanzar un error si el token es requerido pero no se encuentra.
 */
async function apiFetch(endpoint, options = {}, requiresAuth = true) {
    // 1. Configurar los encabezados
    const headers = options.headers || {};

    if (requiresAuth) {
        const token = localStorage.getItem('token');
        if (!token) {
            // Lanzamos un error que el 'try/catch' de la función que llama
            // (ej. formReserva) podrá atrapar.
            throw new Error('No se encontró token de autenticación. Por favor, inicie sesión.');
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    // 2. Si el body es un objeto, lo convertimos a JSON
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        options.body = JSON.stringify(options.body);
        headers['Content-Type'] = 'application/json';
    }

    // 3. Unir todo y llamar a fetch
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options, // Esto incluye method, body (ya stringified), etc.
        headers: headers
    });

    return response;
}
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

function poblarSelectsReserva() {
    // Se puede cambiar cuando se quiera
    const maxNoches = 5;
    const maxAdultos = 2;
    const maxNinos = 3;
    // ---------------------------------------------

    const selectNoches = document.getElementById('noches');
    const selectHuespedes = document.getElementById('huespedes');
    const selectNinos = document.getElementById('ninos');

    // Poblar noches (de 1 a maxNoches)
    for (let i = 1; i <= maxNoches; i++) {
        // new Option("Texto que ve el usuario", "valor que se envía")
        const option = new Option(`${i} ${i === 1 ? 'noche' : 'noches'}`, i);
        selectNoches.add(option);
    }

    // Poblar huéspedes (de 1 a maxAdultos)
    for (let i = 1; i <= maxAdultos; i++) {
        const option = new Option(`${i} ${i === 1 ? 'adulto' : 'adultos'}`, i);
        selectHuespedes.add(option);
    }

    // Poblar niños (de 0 a maxNinos)
    for (let i = 0; i <= maxNinos; i++) {
        const option = new Option(`${i} ${i === 0 ? 'niño' : 'niños'}`, i);
        selectNinos.add(option);
    }
}

if (document.getElementById("formReserva")) {
    document.getElementById("fecha").min = new Date().toISOString().split("T")[0];
    poblarSelectsReserva();
    document.getElementById("habitacion").addEventListener("change", calcularPrecio);
    document.getElementById("noches").addEventListener("change", calcularPrecio);
    
    document.getElementById("formReserva").addEventListener("submit", async function(event) {
        event.preventDefault(); 
        
        const mensajeElemento = document.getElementById("mensaje");
        
        const habitacion = document.getElementById("habitacion").value;
        const fecha = document.getElementById("fecha").value;
        const noches = parseInt(document.getElementById("noches").value);
        const huespedes = parseInt(document.getElementById("huespedes").value);
        const ninos = parseInt(document.getElementById("ninos").value);
        
        const precioOutput = document.getElementById("precio").value;
        const precioTotal = Number(precioOutput.replace('S/', ''));

        const btnReserva = document.getElementById("formReserva").querySelector('button[type="submit"]');
        btnReserva.disabled = true;
        btnReserva.textContent = 'Confirmando...';

        try {
            const response = await apiFetch('/reservas', {
                method: 'POST',
                body: {
                    habitacion: habitacion,
                    fecha: fecha,
                    noches: noches,
                    huespedes: huespedes,
                    ninos: ninos,
                    precioTotal: precioTotal
                }
            });

            const data = await response.json();

            if (response.ok) {
                // ¡Éxito!
                mensajeElemento.textContent = data.mensaje; // "¡Reserva registrada...!"
                mensajeElemento.style.color = "#007700";
                document.getElementById("formReserva").reset();
                document.getElementById("precio").value = "";

                // AÑADIDO: Redirigir a mi_cuenta.html después de 1.5 segundos
                setTimeout(() => {
                    window.location.href = 'mi_cuenta.html';
                }, 1500); // 1500 milisegundos = 1.5 segundos

            } else {
                if (response.status === 401 || response.status === 403) {
                   mensajeElemento.textContent = "Error: Tu sesión ha expirado. Por favor, inicia sesión de nuevo.";
                } else {
                   mensajeElemento.textContent = data.mensaje;
                }
                mensajeElemento.style.color = "#990000";
                btnReserva.disabled = false;
                btnReserva.textContent = 'Confirmar Reserva';
            }

        } catch (error) {
            mensajeElemento.textContent = error.message;
            mensajeElemento.style.color = "#990000";
            console.error('Error al reservar:', error);
            btnReserva.disabled = false;
            btnReserva.textContent = 'Confirmar Reserva';
        }
    });
}

const formLogin = document.getElementById("formLogin");

if (formLogin) {
    formLogin.addEventListener("submit", async function(event) {
        // ... (código de captura de variables) ...
        
        const btnLogin = formLogin.querySelector('button[type="submit"]');
        btnLogin.disabled = true;
        btnLogin.textContent = 'Ingresando...';
        mensajeLogin.textContent = ''; 

        try {
            // ... (código de apiFetch) ...
            
            const data = await response.json();

            if (response.ok) {
                // ... (código de éxito, está bien)
                mostrarInfoUsuario(data.token, data.nombre, data.rol); 

            } else {
                mensajeLogin.textContent = data.mensaje;
                mensajeLogin.style.color = "var(--color-error)";
                
                // --- ¡CORRECCIÓN 1 AQUÍ! ---
                btnLogin.disabled = false;
                btnLogin.textContent = 'Ingresar';
            }

        } catch (error) {
            mensajeLogin.textContent = "Error de conexión. Inténtelo más tarde.";
            mensajeLogin.style.color = "var(--color-error)";
            console.error('Error en el login:', error);

            // --- ¡CORRECCIÓN 2 AQUÍ! ---
            btnLogin.disabled = false;
            btnLogin.textContent = 'Ingresar';
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        const token = localStorage.getItem('token');
        const nombre = localStorage.getItem('userName');
        const rol = localStorage.getItem('userRole'); 

        // 1. Lógica para la página mi_cuenta.html
        if (token && nombre && document.getElementById('zonaLogin')) {
            mostrarInfoUsuario(token, nombre, rol); 
        }

        // --- ¡CORRECCIÓN 4 AQUÍ! ---
        
        // 2. Lógica para la página gestion_usuarios.html
        // Comprueba si existe el div #listaUsuarios Y NO existe #zonaLogin
        if (document.getElementById('listaUsuarios') && !document.getElementById('zonaLogin')) {
            // Aplicar clase ancha solo en esta página
            document.querySelector('main').classList.add('admin-mode-wide-main');
            cargarPanelAdmin(token);
        }

        // 3. Lógica para la página gestion_reservas.html
        if (document.getElementById('tituloReservasAdmin')) {
             // Aplicar clase ancha solo en esta página
             document.querySelector('main').classList.add('admin-mode-wide-main');
            cargarReservas(token);
        }
    });

    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if(btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
            // Borramos los datos
            localStorage.removeItem('token');
            localStorage.removeItem('userName');
            localStorage.removeItem('userRole'); 

            // VITAL: Obtener el elemento <main>
            const mainElement = document.querySelector('main'); 
            
            // VITAL: Quitar la clase ancha si existe
            mainElement.classList.remove('admin-mode-wide-main'); // <-- SOLUCIÓN

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
        
        const pregunta = document.getElementById("preguntaRegistro").value;
        const respuesta = document.getElementById("respuestaRegistro").value;
        
        const mensajeRegistro = document.getElementById("mensajeRegistro");


        if (pass !== confirmPass) {
            mensajeRegistro.textContent = "Las contraseñas no coinciden.";
            mensajeRegistro.style.color = "#990000";
            return;
        }

        if (pass.length < 6) {
            mensajeRegistro.textContent = "La contraseña debe tener al menos 6 caracteres.";
            mensajeRegistro.style.color = "#990000";
            return; // Detenemos la función aquí
        }
        const btnRegistro = formRegistro.querySelector('button[type="submit"]');
        btnRegistro.disabled = true;
        btnRegistro.textContent = 'Registrando...';
        try {
            const response = await apiFetch('/register', {
                method: 'POST',
                body: {
                    nombre: nombre,
                    correo: correo,
                    password: pass,
                    pregunta: pregunta,
                    respuesta: respuesta
                }
            }, false);
            
            const data = await response.json();

            if (response.ok) {
                mensajeRegistro.textContent = data.mensaje;
                mensajeRegistro.style.color = "#007700";
                formRegistro.reset();

                setTimeout(() => {
                   window.location.href = 'mi_cuenta.html';
                }, 2000);

            } else {
                mensajeRegistro.textContent = data.mensaje;
                mensajeRegistro.style.color = "#990000";
                btnRegistro.disabled = false;
                btnRegistro.textContent = 'Registrarme';
            }

        } catch (error) {
            mensajeRegistro.textContent = "Error de conexión. Inténtelo más tarde.";
            mensajeRegistro.style.color = "#990000";
            console.error('Error en el registro:', error);
            btnRegistro.disabled = false;
            btnRegistro.textContent = 'Registrarme';
        }
    });
}
// =======================================================
// FUNCIONES DE PANEL DE USUARIO Y ADMINISTRACIÓN
// =======================================================

// MODIFICADO: Ahora recibe el rol
function mostrarInfoUsuario(token, nombre, rol) { 
    document.getElementById('zonaLogin').classList.add('hidden');
    
    const infoUsuarioDiv = document.getElementById('infoUsuario');
    infoUsuarioDiv.classList.remove('hidden');

    document.getElementById('saludoUsuario').textContent = `¡Hola, ${nombre}!`;
    
    // VITAL: Referencia al elemento <main>
    const mainElement = document.querySelector('main'); 

    // Lógica de ROLES
    if (rol === 'administrador') {
        // Muestra el menú de tarjetas de admin
        document.getElementById('seccionAdmin').classList.remove('hidden');
        
        // Oculta la sección "Mis Reservas" (que es para clientes)
        document.getElementById('tituloReservas').classList.add('hidden');
        document.getElementById('listaReservas').classList.add('hidden');
        
        // YA NO llamamos a cargarPanelAdmin(token) aquí
        // YA NO aplicamos la clase ancha en esta página
    } else {
        document.getElementById('tituloReservas').textContent = 'Mis Reservas';
        document.getElementById('seccionAdmin').classList.add('hidden'); 
        
        mainElement.classList.remove('admin-mode-wide-main'); // Asegurar que es el ancho normal (500px)
        
        cargarReservas(token);
    }
}

// MODIFICADO: La función de reservas ahora maneja la lógica de visualización de admin
async function cargarReservas(token) {
    const listaReservasDiv = document.getElementById('listaReservas');
    listaReservasDiv.innerHTML = '<p>Cargando reservas...</p>';

    try {
        const response = await apiFetch('/mis-reservas');

        if (!response.ok) {
            listaReservasDiv.innerHTML = '<p>Error al cargar reservas. Intenta iniciar sesión de nuevo.</p>';
            return;
        }

        const reservas = await response.json();

        if (reservas.length === 0) {
            listaReservasDiv.innerHTML = '<p>Aún no tienes ninguna reserva registrada.</p>';
            return;
        }

        listaReservasDiv.innerHTML = ''; 

        // Detectar si la primera reserva tiene el nombre del usuario (solo si es admin)
        const esAdmin = reservas.length > 0 && reservas[0].usuario_nombre;
        
        reservas.forEach(reserva => {
            const fecha = new Date(reserva.fecha_reserva).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
            });

            const reservaItem = document.createElement('div');
            reservaItem.className = 'reserva-item';
            
            let contenido = `
                <h4>Habitación ${reserva.habitacion_tipo}</h4>`;

            if (esAdmin) {
                 contenido += `
                    <p><strong>Usuario:</strong> ${reserva.usuario_nombre}</p>
                    <p><strong>Correo:</strong> ${reserva.usuario_correo}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 8px 0;">`;
            }
            
            contenido += `
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Noches:</strong> ${reserva.num_noches}</p>
                <p><strong>Huéspedes:</strong> ${reserva.huespedes} Adultos, ${reserva.ninos} Niños</p>
                <p class="precio"><strong>Total pagado:</strong> S/${reserva.precio_total}</p>
            `;
            
            reservaItem.innerHTML = contenido;
            listaReservasDiv.appendChild(reservaItem);
        });

    } catch (error) {
        listaReservasDiv.innerHTML = '<p>Error de conexión al cargar tus reservas.</p>';
        console.error('Error cargando reservas:', error);
    }
}

async function cargarPanelAdmin(token) {
    const listaUsuariosDiv = document.getElementById('listaUsuarios');
    listaUsuariosDiv.innerHTML = '<p>Cargando usuarios...</p>';

    try {
        const response = await apiFetch('/users');

        if (!response.ok) {
            listaUsuariosDiv.innerHTML = '<p>Error al cargar el listado de usuarios.</p>';
            return;
        }

        const usuarios = await response.json();
        listaUsuariosDiv.innerHTML = ''; // Limpiamos el "Cargando..."

        // Creamos la tabla de usuarios
        const tabla = document.createElement('table');
        tabla.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody id="tablaUsuariosBody"></tbody>
        `;
        listaUsuariosDiv.appendChild(tabla);
        
        const body = document.getElementById('tablaUsuariosBody');

        usuarios.forEach(usuario => {
            const row = body.insertRow();
            row.id = `usuario-row-${usuario.id}`;
            row.innerHTML = `
                <td>${usuario.id}</td>
                <td><input type="text" value="${usuario.nombre}" id="nombre-${usuario.id}" style="width:100px;"></td>
                <td><input type="email" value="${usuario.correo}" id="correo-${usuario.id}" style="width:180px;"></td>
                <td>
                    <select id="rol-${usuario.id}" style="width:100px;">
                        <option value="cliente" ${usuario.rol === 'cliente' ? 'selected' : ''}>Cliente</option>
                        <option value="administrador" ${usuario.rol === 'administrador' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                
                <td style="display: flex; align-items: center; height: 100%;"> 
                    <div style="display: flex; gap: 5px; flex-grow: 1; justify-content: center;">
                        <button class="btn-actualizar" data-id="${usuario.id}" 
                            style="padding: 5px 8px; font-size: 11px; flex-grow: 1;">Actualizar</button>
                        
                        <button class="btn-eliminar" data-id="${usuario.id}" 
                            style="padding: 5px 8px; font-size: 11px; background: #aa4a44; flex-grow: 1;">Eliminar</button>
                    </div>
                </td>
                `;
        });
        
        // Asignar eventos a los botones de actualizar
        tabla.querySelectorAll('.btn-actualizar').forEach(button => {
            button.addEventListener('click', (e) => actualizarUsuario(e.target.dataset.id, token));
        });
        
        // NUEVO: Asignar eventos a los botones de eliminar
        tabla.querySelectorAll('.btn-eliminar').forEach(button => {
            button.addEventListener('click', (e) => eliminarUsuario(e.target.dataset.id, token));
        });
        
        // Asignar eventos a los botones de actualizar
        tabla.querySelectorAll('.btn-actualizar').forEach(button => {
            button.addEventListener('click', (e) => actualizarUsuario(e.target.dataset.id, token));
        });


    } catch (error) {
        listaUsuariosDiv.innerHTML = '<p>Error de conexión al cargar el panel de administración.</p>';
        console.error('Error cargando panel admin:', error);
    }
}

// NUEVO: Función de actualización de usuario
async function actualizarUsuario(id, token) {
    const nombre = document.getElementById(`nombre-${id}`).value;
    const correo = document.getElementById(`correo-${id}`).value;
    const rol = document.getElementById(`rol-${id}`).value;
    const button = document.querySelector(`.btn-actualizar[data-id="${id}"]`);

    const originalText = button.textContent;
    button.textContent = 'Guardando...';
    button.disabled = true;

    try {
        const response = await apiFetch(`/users/${id}`, {
            method: 'PUT',
            body: { nombre, correo, rol }
        });

        const data = await response.json();

        if (response.ok) {
            button.textContent = '¡OK!';
            button.style.backgroundColor = '#007700'; // Verde
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '';
                button.disabled = false;
            }, 1500);
        } else {
             button.textContent = 'Error';
             button.style.backgroundColor = '#aa4a44'; // Rojo
             alert('Error al actualizar: ' + data.mensaje);
        }

    } catch (error) {
        alert('Error de conexión al actualizar usuario.');
    } finally {
        if (button.textContent === 'Guardando...') {
             button.textContent = originalText;
             button.disabled = false;
        }
    }
}

// NUEVO: Función de eliminación de usuario
async function eliminarUsuario(id, token) {
    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario con ID ${id}? Se eliminarán TODAS sus reservas.`)) {
        return; // Detiene la función si el admin cancela
    }
    
    const row = document.getElementById(`usuario-row-${id}`);
    const button = document.querySelector(`.btn-eliminar[data-id="${id}"]`);

    button.textContent = 'Eliminando...';
    button.disabled = true;

    try {
        const response = await apiFetch(`/users/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            // Éxito: Eliminar la fila de la tabla del DOM
            row.remove();
            alert('Usuario eliminado con éxito.');
        } else {
             alert('Error al eliminar: ' + (data.mensaje || 'Error desconocido.'));
             button.textContent = 'Eliminar';
             button.disabled = false;
        }

    } catch (error) {
        alert('Error de conexión al eliminar usuario.');
        button.textContent = 'Eliminar';
        button.disabled = false;
    }
}

// =======================================================
// CÓDIGO PARA RECUPERAR CONTRASEÑA
// =======================================================

const formRecuperar = document.getElementById('formRecuperar');

if (formRecuperar) {
    let pasoActual = 1; 
    let correoRecuperar = '';
    let tokenRecuperar = '';

    const mensajeRecuperar = document.getElementById('mensajeRecuperar');
    const btnRecuperar = document.getElementById('btnRecuperar');

    const paso1 = document.getElementById('paso1_correo');
    const paso2 = document.getElementById('paso2_pregunta');
    const paso3 = document.getElementById('paso3_password');
    
    const inputCorreo = document.getElementById('correoRecuperar');
    const inputRespuesta = document.getElementById('respuestaRecuperar');
    const labelPregunta = document.getElementById('labelPregunta');
    const inputPass = document.getElementById('passRecuperar');
    const inputConfirmPass = document.getElementById('confirmPassRecuperar');


    formRecuperar.addEventListener('submit', async function(event) {
        event.preventDefault(); 
        mensajeRecuperar.textContent = ''; 

        btnRecuperar.disabled = true;
        btnRecuperar.textContent = 'Cargando...';

        try {
            if (pasoActual === 1) {
                correoRecuperar = inputCorreo.value;
                const response = await apiFetch('/recuperar/buscar-pregunta', { 
                    method: 'POST', body: { correo: correoRecuperar } }, false);

                const data = await response.json();

                if (response.ok) {
                    labelPregunta.textContent = data.pregunta;
                    paso1.classList.add('hidden');
                    paso2.classList.remove('hidden');
                    pasoActual = 2;
                    btnRecuperar.textContent = 'Verificar Respuesta';
                } else {
                    throw new Error(data.mensaje);
                }

            } else if (pasoActual === 2) {
                const respuesta = inputRespuesta.value;
                const response = await apiFetch('/recuperar/verificar-respuesta', { 
                    method: 'POST', body: { correo: correoRecuperar, respuesta: respuesta }},
                    false);
                
                const data = await response.json();

                if (response.ok) {
                    tokenRecuperar = data.resetToken;
                    paso2.classList.add('hidden');
                    paso3.classList.remove('hidden');
                    pasoActual = 3;
                    btnRecuperar.textContent = 'Actualizar Contraseña';
                } else {
                    throw new Error(data.mensaje);
                }

            } else if (pasoActual === 3) {
                const nuevoPassword = inputPass.value;
                const confirmPassword = inputConfirmPass.value;

                if (nuevoPassword !== confirmPassword) {
                    throw new Error('Las contraseñas no coinciden.');
                }

                const response = await apiFetch('/recuperar/reset-password', { 
                    method: 'POST', body: { resetToken: tokenRecuperar, nuevoPassword: nuevoPassword } 
                }, false);

                const data = await response.json();
                
                if (response.ok) {
                    mensajeRecuperar.textContent = data.mensaje;
                    mensajeRecuperar.style.color = '#007700';
                    formRecuperar.reset();
                    btnRecuperar.textContent = '¡Éxito!';
                    
                    setTimeout(() => {
                        window.location.href = 'mi_cuenta.html';
                    }, 2000);

                    return;

                } else {
                    throw new Error(data.mensaje);
                }
            }
        } catch (error) {
            mensajeRecuperar.textContent = error.message;
            mensajeRecuperar.style.color = '#990000';
            
            if (error.message.includes('expirado')) {
                setTimeout(() => location.reload(), 2000);
            }
        }

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