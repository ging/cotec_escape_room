function backToMenu(uri, contextPath) {
    window.location.href = uri + '/challenges' || contextPath + '/';
}

// Modal de pista
function initHintModal(hintTimerInterval, resetHintTimer, updateHintBallsState) {
    document.querySelectorAll('.hint-ball').forEach(function(btn) {
        btn.addEventListener('click', function() {
            // Verificar si la bola ya fue usada
            if (btn.classList.contains('hint-ball-used')) {
                var texto = btn.getAttribute('data-pista');
                document.getElementById('modalPistaTexto').textContent = texto;
                document.getElementById('modalPista').style.display = 'flex';
                return;
            }
            
            // No permitir pulsar si el temporizador de pistas está activo
            if (hintTimerInterval.current !== null) {
                return; // No hacer nada, simplemente no responder al click
            }
            
            // Mostrar pista nueva y marcar como usada
            var texto = btn.getAttribute('data-pista');
            document.getElementById('modalPistaTexto').textContent = texto;
            document.getElementById('modalPista').style.display = 'flex';
            btn.classList.add('hint-ball-used');
            
            // Reiniciar temporizador de pistas
            const anyUnused = Array.from(document.querySelectorAll('.hint-ball')).some(b => !b.classList.contains('hint-ball-used'));
            if (anyUnused) {
                resetHintTimer();
            } else {
                if (hintTimerInterval.current) {
                    clearInterval(hintTimerInterval.current);
                    hintTimerInterval.current = null;
                }
                const timerElement = document.getElementById('pista-timer-number');
                const timerTextElement = document.getElementById('pista-timer-text');
                timerElement.textContent = '';
                timerTextElement.textContent = 'No quedan pistas';
            }
        });
    });
    // Cerrar modal al hacer click fuera
    document.getElementById('modalPista').addEventListener('click', function(e) {
        if (e.target === this) this.style.display = 'none';
    });
}

// Change the CSS of the iframe
function updateCSSIframe(newCSS) {
    const iframeEscape = document.getElementById('iframeEscape');
    console.log("CHANGING CSS");
    // Mandar un mensaje con instrucciones de estilo al iframe
    iframeEscape.contentWindow.postMessage({
    type: "changeCSS",
    message: newCSS
    }, "*");
}

function initEscapeRoom(config) {
    const {
        room = "escape_1",
        totalEnergy = 100,
        inputWordsPenalty = 0.1,
        outputWordsPenalty = 0.05,
        failurePenalty = 10,
        timeLimit = 300, // 5 minutos por defecto
        allowContinueAfterGameOver = false,
        contextPath = "/sostenibilidadgenerativa",
        webPrincipalUrl = "",
        newCSS = "",
    } = config || {};

    // console.log("config", config);

    let totalInputWords = 0;
    let totalOutputWords = 0;
    let failedAttempts = 0;
    let remaining_energy = totalEnergy;
    let remaining_time = timeLimit;
    let timerInterval = null;
    let isGameOver = false;
    let assistant_id;
    let run_id;
    let thread_id;
    let iframeLoaded = false;
    
    // Temporizador de pistas (3 minutos = hintDuration segundos)
    const hintDuration = 180; // 3 minutos
    let hintTimer = hintDuration;
    let hintTimerInterval = { current: null };

    const batteryLevel = document.getElementById('batteryLevel');
    const energyValue = document.getElementById('energyValue');
    const timerElement = document.getElementById('timer');
    const iframeVideo = document.getElementById('babyShark');
    const lockContainer = document.querySelector('.lock-container');
    const passwordInput = document.getElementById('password');
    const submitButton = document.querySelector('button[type="submit"]');

    // Obtener escapp_email de localStorage o pedirlo si no existe

    let escapp_email = localStorage.getItem('escapp_email');
    if (!escapp_email) {
        while (!escapp_email || !/^\S+@\S+\.\S+$/.test(escapp_email)) {
            escapp_email = prompt('Por favor, introduce tu email para continuar:');
            if (escapp_email === null) break;
        }
        if (escapp_email) localStorage.setItem('escapp_email', escapp_email);
    }
    if (!escapp_email) {
        messageDiv.textContent = "Debes introducir un email válido para continuar.";
        messageDiv.className = "error";
        return;
    }

    async function fetchAlreadyCompleted() {
        try {
            const response = await fetch(contextPath + '/api/validateAlreadyCompleted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room, escapp_email })
            });
            const data = await response.json();
            if (data.completed === true) {
                document.getElementById('already-completed').innerHTML = `<p class="large" id="already-completed-message">🎉🎉🎉 Sala completada su código es: <span class="large">${data.finalCode || ""}</span>🎉🎉🎉</p>`;
            }
        } catch (err) {
            console.error('Error consultando si la sala está completada:', err);
        }
    }

    fetchAlreadyCompleted();

    // Función para actualizar el cronómetro
    function updateTimer() {
        let minutes;
        if (remaining_time > 0) {
         minutes = Math.floor(remaining_time / 60);
        }
        else {
        minutes = Math.ceil(remaining_time/60);
        }
        const seconds = remaining_time % 60;
        let textMinutes = minutes.toString();
        let textSeconds = seconds.toString();
        textMinutes = textMinutes.replace('-', '');
        textSeconds = textSeconds.replace('-', '');
        textMinutes = textMinutes.padStart(2, '0');
        textSeconds = textSeconds.padStart(2, '0');
        if (remaining_time < 0) {
            textMinutes = '- ' + textMinutes; //to avoid double negative
        }

        timerElement.textContent = `${textMinutes}:${textSeconds}`;

        // Cambiar colores según el tiempo restante
        if (remaining_time <= 30) {
            timerElement.className = 'timer danger';
        } else if (remaining_time <= 60) {
            timerElement.className = 'timer warning';
        } else {
            timerElement.className = 'timer';
        }
        
        // Verificar si se acabó el tiempo después de mostrar 00:00
        if (remaining_time <= 0 && !isGameOver) {
            //remaining_time = 0; -> TBD Descomentar
            // console.log('Tiempo agotado');
            // console.log('remaining_time', remaining_time);
            gameOver();
            return;
        }
    }
    
    // Función para iniciar el temporizador
    function startTimer() {
        updateTimer();
        timerInterval = setInterval(() => {
            remaining_time--;
            updateTimer();
        }, 1000);
    }
    
    // Función para detener el temporizador
    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }
    
    // Función para iniciar el temporizador de pistas
    function startHintTimer() {
        hintTimerInterval.current = setInterval(() => {
            hintTimer--;
            updateHintTimerDisplay();
            if (hintTimer <= 0) {
                clearInterval(hintTimerInterval.current);
                hintTimerInterval.current = null;
                hintTimer = hintDuration; // Reiniciar a 3 minutos
                // Habilitar bolas no usadas visualmente
                updateHintBallsState();
                updateHintTimerDisplay();
            }
        }, 1000);
        
        // Deshabilitar bolas no usadas visualmente después de asignar el interval
        updateHintBallsState();
        updateHintTimerDisplay();
    }
    
    // Función para detener el temporizador de pistas
    function stopHintTimer() {
        if (hintTimerInterval.current) {
            clearInterval(hintTimerInterval.current);
            hintTimerInterval.current = null;
        }
    }
    
    // Función para reiniciar el temporizador de pistas
    function resetHintTimer() {
        stopHintTimer();
        hintTimer = hintDuration; // 3 minutos
        startHintTimer();
    }
    
    // Función para actualizar la visualización del temporizador de pistas
    function updateHintTimerDisplay() {
        const timerElement = document.getElementById('pista-timer-number');
        const timerTextElement = document.getElementById('pista-timer-text');
        
        if (timerElement && timerTextElement) {
            if (hintTimerInterval.current !== null) {
                timerElement.textContent = hintTimer + ' segundos';
                timerTextElement.textContent = 'Siguiente pista en ';
            } else {
                timerElement.textContent = '';
                timerTextElement.textContent = 'Nueva pista disponible ';
            }
        }
    }
    
    // Función para actualizar el estado visual de las bolas de pista
    function updateHintBallsState() {
        document.querySelectorAll('.hint-ball').forEach(function(btn) {
            if (!btn.classList.contains('hint-ball-used')) {
                if (hintTimerInterval.current !== null) {
                    btn.classList.add('hint-ball-disabled');
                    btn.style.pointerEvents = 'none';
                } else {
                    btn.classList.remove('hint-ball-disabled');
                    btn.style.pointerEvents = 'auto';
                }
            }
        });
        updateHintTimerDisplay();
    }
    
    // Función para cuando se acaba el tiempo o la energía
    async function gameOver() {

        await fetch('api/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room, code: "GameOver", escapp_email, assistant_id, thread_id, run_id,remaining_time, remaining_energy })
        });

        //stopTimer(); -> TBD Descomentar
        isGameOver = true;
        
        // Detener temporizador de pistas
        stopHintTimer();
        
        // Ocultar temporizador de pistas
        const timerTextElement = document.getElementById('pista-timer-text');
        if (timerTextElement) {
            timerTextElement.style.display = 'none';
        }

        // Bloquear el ordenador
        lockContainer.classList.add('error');
        lockContainer.classList.remove('opened');

        if (!allowContinueAfterGameOver) {            
            // Deshabilitar el formulario
            passwordInput.disabled = true;
            submitButton.disabled = true;
            submitButton.style.cursor = "not-allowed";
            document.getElementById('backMenu').style.display = "block";
            iframeEscape.style.pointerEvents = "none";
            iframeVideo.style.display = "block";
            iframeVideo.src = "https://www.youtube.com/embed/XqZsoesa55w?start=31&autoplay=1&controls=0";
        }
        
        // Determinar el motivo del game over
        let gameOverMessage = "";
        let gameOverTitle = "";
        
        if (remaining_energy <= 0) {
            gameOverTitle = "🔋 Energía Agotada";
            gameOverMessage = "¡Se acabó la energía! Hemos perdido la conexión con el asistente.";
            submitButton.textContent = "Energía agotada";
        } else {
            gameOverTitle = "⏰ Tiempo Agotado";
            gameOverMessage = "¡Se acabó el tiempo! Hemos perdido la conexión con el asistente.";
            submitButton.textContent = "Tiempo agotado";
        }
        
        // Cambiar el título
        const lockTitle = document.getElementById('lockTitle');
        lockTitle.textContent = gameOverTitle;
        
        // Mostrar mensaje
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = gameOverMessage;
        messageDiv.className = "error";
        
        // Efecto visual final
        timerElement.className = 'timer danger';
    }
    
    function updateBatteryStyle() {
        remaining_energy = totalEnergy - (totalInputWords * inputWordsPenalty) - (totalOutputWords * outputWordsPenalty) - (failedAttempts * failurePenalty);
        
        // Verificar si se acabó la energía
        if (remaining_energy <= 0 && !isGameOver) {
            // console.log('Energía agotada');
            // console.log('remaining_energy', remaining_energy);
            gameOver();
        }
        
        // Para barra horizontal, usar width en lugar de height
        batteryLevel.style.width = remaining_energy + "%";
        
        // Actualizar rayos según el nivel de energía
        const energyRays = document.getElementById('energyRays');
        if (remaining_energy > 66) {
            energyRays.textContent = "⚡⚡⚡";
        } else if (remaining_energy > 33) {
            energyRays.textContent = "⚡⚡";
        } else if (remaining_energy > 0) {
            energyRays.textContent = "⚡";
        } else {
            energyRays.textContent = "";
        }
        
        // Cambiar color basado en el nivel de energía
        if (remaining_energy <= 30) {
            batteryLevel.style.background = "linear-gradient(90deg, #ff5252, #d32f2f)";
            batteryLevel.classList.add('low');
            energyValue.classList.add('low');
            energyRays.classList.add('low');
        } else {
            batteryLevel.style.background = "linear-gradient(90deg, #4caf50, #45a049)";
            batteryLevel.classList.remove('low');
            energyValue.classList.remove('low');
            energyRays.classList.remove('low');
        }
        
        energyValue.textContent = Math.floor(remaining_energy) + "%";
    }

    async function reloadIframe() {
        if (iframeLoaded) return; // Evitar recargas múltiples
        setTimeout(() => {
            if (iframeLoaded){
                console.log("El iframe ya se cargó, no es necesario recargarlo.");
                return;
            }
            const iframeEscape = document.getElementById('iframeEscape');
            iframeEscape.src = iframeEscape.src; // Recargar el iframe
            console.log("¡¡Recargando iframe del chatbot porque no cargó...!!");
            reloadIframe();
        }, 5000);
    }
    
    
    // Función para manejar eventos del chatbot
    async function handleChatbotEvent(type, data) {
        // Manejar diferentes tipos de eventos
        switch(type) {
            case 'iframe_loaded':
                console.log('Chatbot iframe cargado:', data);
                assistant_id = data.assistantId;
                updateCSSIframe(config.newCSS);
                document.getElementById('iframeEscape').style.display = 'block';
                iframeLoaded = true;

                break;
            case 'chat_created':
                // console.log('Chat creado', data);
                thread_id = data.threadId;
                await fetch('api/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ room, code: "Start", escapp_email, assistant_id, thread_id, run_id, remaining_time, remaining_energy })
                });
                break;
                                
            case 'message_sent':
                // console.log('Mensaje enviado:', data);
                const inputWords = data.message.split(/\s+/).length;
                totalInputWords += inputWords;
                break;
                
            case 'response_received':
                run_id = data.runId;
                // console.log('Respuesta recibida:', data);
                if (data.response) {
                    const responseWords = data.response.split(/\s+/).length;
                    totalOutputWords += responseWords;
                }
                break;
                
            case 'error':
                updateStatus('Error en el chatbot: ' + data.error, 'error');
                console.error('Error del chatbot:', data);
                break;
                
            default:
                // console.log('Evento no manejado:', type, data);
        }
        updateBatteryStyle();
    }
    
    // Escuchar mensajes del iframe padre
    window.addEventListener('message', function(event) {
        // Verificar que el mensaje viene de nuestro chatbot
        if (event.data && event.data.source === 'chatbot-iframe') {
            const { type, data } = event.data;
            handleChatbotEvent(type, data);
        }
    });
    
    updateBatteryStyle();
    
    const form = document.getElementById('lockForm');
    const messageDiv = document.getElementById('message');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Verificar si el juego ya terminó
        if (isGameOver && !allowContinueAfterGameOver) {
            return;
        }
        const code = passwordInput.value.trim();

        if (!room) {
            messageDiv.textContent = "No se pudo identificar la sala.";
            messageDiv.className = "error";
            return;
        }



        // Llamada a la API
        try {
            const response = await fetch('api/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room, code, escapp_email, assistant_id, thread_id, run_id, remaining_time, remaining_energy })
            });
            const data = await response.json();
            if (data.completed === true) {
                // Detener el temporizador
                stopTimer();
                
                // Detener y ocultar temporizador de pistas
                stopHintTimer();
                const timerTextElement = document.getElementById('pista-timer-text');
                if (timerTextElement) {
                    timerTextElement.style.display = 'none';
                }
                
                // Cambiar el estado del ordenador a abierto
                const lockTitle = document.getElementById('lockTitle');
                lockTitle.textContent = "🔓 Ordenador Debloqueado";
                lockTitle.innerHTML = "🔓 Ordenador Debloqueado";
                submitButton.textContent = "Volver al menú";
                submitButton.onclick = () => {
                    backToMenu(webPrincipalUrl, contextPath);
                };
                lockContainer.classList.add('opened');
                lockContainer.classList.remove('error');
                messageDiv.innerHTML = `¡Ordenador desbloqueado! Has resuelto el enigma 🎉. El código de este ordenador es: <span class="large">${data.finalCode || ""}</span>`;
                messageDiv.className = "success";
                passwordInput.disabled = true;
                timerElement.className = 'timer';
                iframeEscape.style.pointerEvents = "none";
                document.getElementById('backMenu').style.display = "block";
            } else {
                lockContainer.classList.add('error');
                messageDiv.textContent = `Contraseña incorrecta. Acabas de perder ${failurePenalty} puntos de energía. ¡Sigue intentándolo! `;
                messageDiv.className = "error";
                failedAttempts++;
                updateBatteryStyle();
                setTimeout(() => {
                    if (!isGameOver) {
                        lockContainer.classList.remove('error');
                    }
                }, 3000);
            }
        } catch (err) {
            messageDiv.textContent = "Error de conexión con el servidor.";
            messageDiv.className = "error";
        }
    });
    
    // Iniciar el temporizador de pistas
    startHintTimer();
    
    // Inicializar modal de pistas
    initHintModal(hintTimerInterval, resetHintTimer, updateHintBallsState);
    
    // Inicializar display del temporizador de pistas
    updateHintTimerDisplay();
    
    // Iniciar el temporizador cuando se carga la página
    startTimer();

    // Intentar recargar el iframe si no se carga
    reloadIframe();


}
