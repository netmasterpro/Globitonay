const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos de la interfaz
const scoreTxt = document.getElementById('score');
const overlay = document.getElementById('screen-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const startBtn = document.getElementById('start-btn');

// Estado del juego
let gameActive = false;
let score = 0;
let obstacles = [];
let spawnTimer = 0;

// Configuración de olas y dificultad progresiva
let waveMode = 'random'; // 'random', 'line', 'diagonal', 'spiral'
let waveTimer = 0;
let currentBaseSpeed = 1.8; 
let currentSpawnRate = 50; // Menos es más rápido

// El Escudo (Ahora más pequeño para que sea un reto mayor proteger el globo)
const shield = {
    x: 200,
    y: 380,
    radius: 16, // Reducido de 25 a 16
    color: '#ffffff',
    targetX: 200,
    targetY: 380,
    speedFactor: 0.25 
};

// El Globo (Ahora más grande y vulnerable)
const balloon = {
    x: 200,
    y: 500,
    radius: 25, // Aumentado de 18 a 25
    color: '#ff4757',
    stringLength: 35
};

// --- Mensajes y Recompensas por Metas ---
const milestones = {
    100: { msg: "¡Te amo, amor, tú puedes! 🥰✨", triggered: false },
    500: { msg: "¡Eh, ganaste 10 quetzales! 💰🎉", triggered: false },
    1000: { msg: "¡Increíble! Ganaste 20 quetzales 💵🔥", triggered: false },
    5000: { msg: "¡DIOS MÍO! ¡Ganaste una membresía para el Free! 💎🏆", triggered: false }
};

// --- Controles ---
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    shield.targetX = e.clientX - rect.left;
    shield.targetY = e.clientY - rect.top;
});

canvas.addEventListener('touchmove', (e) => {
    if(e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        shield.targetX = e.touches[0].clientX - rect.left;
        shield.targetY = e.touches[0].clientY - rect.top;
    }
    e.preventDefault();
}, { passive: false });


function resetGame() {
    score = 0;
    obstacles = [];
    spawnTimer = 0;
    waveTimer = 0;
    waveMode = 'random';
    currentBaseSpeed = 1.8;
    currentSpawnRate = 50;
    scoreTxt.innerText = score;
    
    // Resetear banderas de metas para que se puedan ganar otra vez
    Object.keys(milestones).forEach(key => milestones[key].triggered = false);
    
    shield.x = 200;
    shield.y = 380;
    shield.targetX = 200;
    shield.targetY = 380;
    
    balloon.x = 200;
    balloon.y = 500;
}

// Generador de obstáculos con formas aleatorias
function createObstacleObject(x, y, type, size, vx, vy) {
    const colors = ['#34d399', '#38bdf8', '#fbbf24', '#a78bfa', '#f43f5e'];
    return {
        x: x,
        y: y,
        width: size,
        height: size,
        radius: size / 2, // Para el tipo círculo
        vx: vx,
        vy: vy,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: type // 'cube', 'circle', 'triangle', 'rectangle'
    };
}

function spawnObstaclePattern() {
    // Aumentar dificultad progresiva basada en el puntaje
    currentBaseSpeed = 1.8 + (score * 0.015); 
    currentSpawnRate = Math.max(15, 50 - Math.floor(score * 0.1));

    // Cambiar dinámicamente de patrón de ataque cada cierto tiempo
    waveTimer++;
    if (waveTimer > 300) { 
        const modes = ['random', 'line', 'diagonal', 'spiral'];
        waveMode = modes[Math.floor(Math.random() * modes.length)];
        waveTimer = 0;
    }

    const size = Math.random() * 20 + 15;
    const types = ['cube', 'circle', 'triangle', 'rectangle'];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    // 1. PATRÓN EN DIAGONAL
    if (waveMode === 'diagonal') {
        const xPos = (spawnTimer % 3) * (canvas.width / 3) + 30;
        obstacles.push(createObstacleObject(xPos, -size, chosenType, size, 0.8, currentBaseSpeed));
    } 
    // 2. PATRÓN EN LÍNEA RECTA (Barrera horizontal coordinada)
    else if (waveMode === 'line' && spawnTimer % 120 === 0) {
        let holeIndex = Math.floor(Math.random() * 4); // Deja un espacio libre para pasar
        for (let i = 0; i < 5; i++) {
            if (i !== holeIndex) {
                obstacles.push(createObstacleObject(i * 80 + 10, -30, 'cube', 35, 0, currentBaseSpeed * 0.9));
            }
        }
    } 
    // 3. PATRÓN EN ESPIRAL / ZIGZAG SINE
    else if (waveMode === 'spiral') {
        const xPos = canvas.width / 2 + Math.sin(Date.now() / 200) * 120;
        obstacles.push(createObstacleObject(xPos, -size, 'circle', size, 0, currentBaseSpeed * 1.2));
    } 
    // 4. MODO COMPLETAMENTE ALEATORIO (Como el inicio)
    else if (waveMode === 'random') {
        const xPos = Math.random() * (canvas.width - size);
        const randomV = (chosenType === 'rectangle') ? 'rectangle' : chosenType;
        
        // Ajustar tamaños especiales si es un rectángulo/tabla larga
        if (randomV === 'rectangle') {
            obstacles.push({
                x: xPos, y: -20, width: 70, height: 15, radius: 20,
                vx: (Math.random() - 0.5) * 1, vy: currentBaseSpeed,
                color: '#e2e8f0', type: 'rectangle'
            });
        } else {
            obstacles.push(createObstacleObject(xPos, -size, randomV, size, (Math.random() - 0.5) * 1.5, currentBaseSpeed));
        }
    }
}

// Verificar colisiones complejas entre círculos y diferentes figuras
function checkCollision(circle, obj) {
    if (obj.type === 'circle') {
        // Círculo contra Círculo
        const dx = circle.x - obj.x;
        const dy = circle.y - obj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return { collided: dist < (circle.radius + obj.radius) };
    } else {
        // Círculo contra Rectángulo, Cuadrado o Triángulo (Aproximación por caja)
        const closestX = Math.max(obj.x, Math.min(circle.x, obj.x + obj.width));
        const closestY = Math.max(obj.y, Math.min(circle.y, obj.y + obj.height));

        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        return {
            collided: distanceSquared < (circle.radius * circle.radius),
            closestX: closestX,
            closestY: closestY
        };
    }
}

function update() {
    if (!gameActive) return;

    // Suavizado del escudo
    shield.x += (shield.targetX - shield.x) * shield.speedFactor;
    shield.y += (shield.targetY - shield.y) * shield.speedFactor;

    shield.x = Math.max(shield.radius, Math.min(canvas.width - shield.radius, shield.x));
    shield.y = Math.max(shield.radius, Math.min(canvas.height - shield.radius, shield.y));

    // Generar olas dinámicas
    spawnTimer++;
    if (spawnTimer >= currentSpawnRate) {
        spawnObstaclePattern();
        if (waveMode !== 'line') spawnTimer = 0; // Control manual para el modo línea
    }

    // Sumar puntos progresivamente por sobrevivir
    if (Date.now() % 15 === 0) {
        score++;
        scoreTxt.innerText = score;
        
        // Verificar si se alcanzó una meta especial para lanzar una alerta visual temporal
        if (milestones[score] && !milestones[score].triggered) {
            milestones[score].triggered = true;
            // Mostramos un mensaje especial flotante cambiando el texto de la puntuación un momento
            scoreTxt.innerHTML = `<span style="color: #fbbf24; font-size: 20px; display:block;">${milestones[score].msg}</span>`;
            setTimeout(() => { scoreTxt.innerText = score; }, 3500);
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        
        obs.x += obs.vx;
        obs.y += obs.vy;

        // Rebotes físicos con el ESCUDO PROTECTOR
        let shieldCollision = checkCollision(shield, obs);
        if (shieldCollision.collided) {
            let targetX = obs.x + (obs.width ? obs.width / 2 : 0);
            let targetY = obs.y + (obj => obj.height ? obj.height / 2 : 0);
            let angle = Math.atan2(targetY - shield.y, targetX - shield.x);
            
            // Los empuja con fuerza explosiva hacia arriba y lados
            obs.vx = Math.cos(angle) * 8.5;
            obs.vy = Math.sin(angle) * 8.5 - 2; 
        }

        // Colisión fatal contra nuestro tierno GLOBO
        let balloonCollision = checkCollision(balloon, obs);
        if (balloonCollision.collided) {
            gameOver();
        }

        // Eliminar del mapa si ya cayeron por completo
        if (obs.y > canvas.height + 60) {
            obstacles.splice(i, 1);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Hilo fino del Globo
    ctx.beginPath();
    ctx.moveTo(balloon.x, balloon.y + balloon.radius);
    ctx.lineTo(balloon.x, balloon.y + balloon.radius + balloon.stringLength);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Dibujar el Globo Romántico Grande
    ctx.beginPath();
    ctx.arc(balloon.x, balloon.y, balloon.radius, 0, Math.PI * 2);
    ctx.fillStyle = balloon.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = balloon.color;
    ctx.fill();
    ctx.shadowBlur = 0; 

    // Dibujar el Escudo Pequeño (Blanco)
    ctx.beginPath();
    ctx.arc(shield.x, shield.y, shield.radius, 0, Math.PI * 2);
    ctx.fillStyle = shield.color;
    ctx.fill();

    // Dibujar los Obstáculos según su tipo geométrico
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color;
        ctx.beginPath();

        if (obs.type === 'circle') {
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (obs.type === 'triangle') {
            // Un Chuzo/Triángulo apuntando hacia abajo
            ctx.moveTo(obs.x, obs.y);
            ctx.lineTo(obs.x + obs.width, obs.y);
            ctx.lineTo(obs.x + (obs.width / 2), obs.y + obs.height);
            ctx.closePath();
            ctx.fill();
        } 
        else if (obs.type === 'cube' || obs.type === 'rectangle') {
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        }
    });
}

function gameOver() {
    gameActive = false;
    overlayTitle.innerText = "💔 ¡Explotó nuestro amor! 💔";
    
    // Buscar cuál fue el premio máximo alcanzado antes de morir para recordárselo
    let rewardText = "No te rindas mi ojitos de uva, ¡inténtalo de nuevo!";
    if (score >= 5000) rewardText = "¡Lograste mantener a salvo el amor y la membresía del Free! 🔥";
    else if (score >= 1000) rewardText = "¡Te quedaste con el récord de los 20 quetzales! 💵🚀";
    else if (score >= 500) rewardText = "¡Al menos aseguraste los 10 quetzales! 🎉";
    else if (score >= 100) rewardText = "¡Te quedaste con un gran 'Te amo'! 🥰";

    overlayDesc.innerHTML = `Puntuación obtenida: <strong>${score}</strong><br><br>${rewardText}`;
    startBtn.innerText = "Volver a Intentar ❤️";
    overlay.classList.remove('hidden');
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    resetGame();
    gameActive = true;
});

gameLoop();
