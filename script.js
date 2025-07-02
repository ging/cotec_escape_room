function initEscapeRoom(config) {
    const {
        correctPassword = "None",
        totalEnergy = 100,
        inputWordsPenalty = 0.1,
        outputWordsPenalty = 0.05,
        failurePenalty = 10,
        timeLimit = 300, // 5 minutos por defecto
        allowContinueAfterGameOver = false
    } = config || {};

    let totalInputWords = 0;
    let totalOutputWords = 0;
    let failedAttempts = 0;
    let energy = totalEnergy;
    let timeRemaining = timeLimit;
    let timerInterval = null;
    let isGameOver = false;

    const batteryLevel = document.getElementById('batteryLevel');
    const energyValue = document.getElementById('energyValue');
    const timerElement = document.getElementById('timer');
    const lockContainer = document.querySelector('.lock-container');
    const passwordInput = document.getElementById('password');
    const submitButton = document.querySelector('button[type="submit"]');
    
    // Función para actualizar el cronómetro
    function updateTimer() {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Cambiar colores según el tiempo restante
        if (timeRemaining <= 30) {
            timerElement.className = 'timer danger';
        } else if (timeRemaining <= 60) {
            timerElement.className = 'timer warning';
        } else {
            timerElement.className = 'timer';
        }
        
        // Verificar si se acabó el tiempo después de mostrar 00:00
        if (timeRemaining <= 0) {
            timeRemaining = 0;
            gameOver();
            return;
        }
    }
    
    // Función para iniciar el temporizador
    function startTimer() {
        updateTimer();
        timerInterval = setInterval(() => {
            timeRemaining--;
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
    
    // Función para cuando se acaba el tiempo o la energía
    function gameOver() {
        stopTimer();
        isGameOver = true;
        

        // Bloquear el candado
        lockContainer.classList.add('error');
        lockContainer.classList.remove('opened');

        if (!allowContinueAfterGameOver) {            
            // Deshabilitar el formulario
            passwordInput.disabled = true;
            submitButton.disabled = true;
        }
        
        // Determinar el motivo del game over
        let gameOverMessage = "";
        let gameOverTitle = "";
        
        if (energy <= 0) {
            gameOverTitle = "🔋 Energía Agotada";
            gameOverMessage = "¡Se acabó la energía! El candado se ha bloqueado permanentemente.";
            submitButton.textContent = "Energía agotada";
        } else {
            gameOverTitle = "⏰ Tiempo Agotado";
            gameOverMessage = "¡Se acabó el tiempo! El candado se ha bloqueado permanentemente.";
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
        energy = totalEnergy - (totalInputWords * inputWordsPenalty) - (totalOutputWords * outputWordsPenalty) - (failedAttempts * failurePenalty);
        
        // Verificar si se acabó la energía
        if (energy <= 0 && !isGameOver) {
            gameOver();
        }
        
        // Para barra horizontal, usar width en lugar de height
        batteryLevel.style.width = energy + "%";
        
        // Actualizar rayos según el nivel de energía
        const energyRays = document.getElementById('energyRays');
        if (energy > 66) {
            energyRays.textContent = "⚡⚡⚡";
        } else if (energy > 33) {
            energyRays.textContent = "⚡⚡";
        } else if (energy > 0) {
            energyRays.textContent = "⚡";
        } else {
            energyRays.textContent = "";
        }
        
        // Cambiar color basado en el nivel de energía
        if (energy <= 30) {
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
        
        energyValue.textContent = Math.floor(energy) + "%";
    }
    
    
    // Función para manejar eventos del chatbot
    function handleChatbotEvent(type, data) {
        
        // Manejar diferentes tipos de eventos
        switch(type) {
            case 'iframe_loaded':
                console.log('Chatbot iframe cargado:', data);
                break;
                                
            case 'message_sent':
                console.log('Mensaje enviado:', data);
                const inputWords = data.message.split(/\s+/).length;
                totalInputWords += inputWords;
                break;
                
            case 'response_received':
                console.log('Respuesta recibida:', data);
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
                console.log('Evento no manejado:', type, data);
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
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Verificar si el juego ya terminó
        if (isGameOver && !allowContinueAfterGameOver) {
            return;
        }
        
        if (passwordInput.value.trim() === correctPassword) {
            // Detener el temporizador
            stopTimer();
            
            // Cambiar el estado del candado a abierto
            const lockTitle = document.getElementById('lockTitle');
            
            // Cambiar el icono y texto
            lockTitle.textContent = "🔓 Sala Abierta";
            lockTitle.innerHTML = "🔓 Sala Abierta";
            
            // Cambiar el botón
            submitButton.textContent = "Sala Abierta";
            submitButton.disabled = true;
            
            // Añadir clase para estilos
            lockContainer.classList.add('opened');
            lockContainer.classList.remove('error');
            
            // Mensaje de éxito
            messageDiv.textContent = "¡Sala abierta! Has resuelto el enigma 🎉";
            messageDiv.className = "success";
            
            // Deshabilitar el input
            passwordInput.disabled = true;
            
            // Cambiar el cronómetro a verde
            timerElement.className = 'timer';
            timerElement.style.color = '#4caf50';
        } else {
            // Efecto de error temporal
            lockContainer.classList.add('error');
            
            // Mensaje de error
            messageDiv.textContent = `Contraseña incorrecta. Acabas de perder ${failurePenalty} puntos de energía. ¡Sigue intentándolo! `;
            messageDiv.className = "error";
            
            // Incrementar intentos fallidos
            failedAttempts++;   
            updateBatteryStyle();
            
            // Remover la clase de error después de 5 segundos
            setTimeout(() => {
                if (!isGameOver) {
                    lockContainer.classList.remove('error');
                }
            }, 5000);
        }
    });
    
    // Iniciar el temporizador cuando se carga la página
    startTimer();
}
