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
let currentLevel = 1;

// El Escudo (Círculo protector con físicas)
const shield = {
    x: 200,
    y: 380,
    ox: 200,
    oy: 380,
    vx: 0,
    vy: 0,
    radius: 15,
    color: '#ffffff',
    targetX: 200,
    targetY: 380,
    speedFactor: 0.35, // Un poco más responsivo para mover estructuras pesadas
    mass: 18
};

// El Globo (Vulnerable abajo)
const balloon = {
    x: 200,
    y: 510,
    radius: 23,
    color: '#ff4757',
    stringLength: 35
};

// --- Mensajes y Recompensas por Metas ---
const milestones = {
    100: { msg: "¡Te amo, amor, tú puedes! 🥰✨", triggered: false },
    500: { msg: "¡Eh, ganaste 10 quetzales! 💰🎉", triggered: false },
    1000: { msg: "¡Increíble! Ganaste 20 quetzales 💵🔥", triggered: false },
    5000: { msg: "¡DIOS MÍO! ¡Membresía para el Free asegurada! 💎🏆", triggered: false }
};

// --- Controles de mouse y touch ---
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
    currentLevel = 1;
    scoreTxt.innerHTML = `Nivel 1 | Puntos: ${score}`;
    
    Object.keys(milestones).forEach(key => milestones[key].triggered = false);
    
    shield.x = 200; shield.y = 380;
    shield.targetX = 200; shield.targetY = 380;
    shield.vx = 0; shield.vy = 0;
    
    balloon.x = 200; balloon.y = 510;
}

// Generador de objetos con masa proporcional al tamaño (Físicas realistas)
function createObstacle(x, y, radius, vx, vy, color, type = 'circle') {
    const mass = (radius * radius) * 0.06; // Los grandes se sienten pesadísimos
    return {
        x: x, y: y,
        radius: radius,
        vx: vx, vy: vy,
        color: color,
        mass: mass,
        type: type
    };
}

// --- Diseñador Táctico de Niveles ---
function updateLevelsAndSpawning() {
    spawnTimer++;

    // Progresión de niveles por puntaje
    if (score < 300) {
        currentLevel = 1;
    } else if (score >= 300 && score < 700) {
        currentLevel = 2;
    } else if (score >= 700 && score < 1500) {
        currentLevel = 3;
    } else {
        currentLevel = 4;
    }

    let levelSpeed = 1.4 + (currentLevel * 0.3);

    // NIVEL 1: Caída libre tradicional
    if (currentLevel === 1 && spawnTimer % 30 === 0) {
        let r = Math.random() * 14 + 10;
        let x = Math.random() * (canvas.width - r * 2) + r;
        obstacles.push(createObstacle(x, -r, r, 0, levelSpeed, '#34d399'));
    }
    
    // NIVEL 2: El Conjunto/Bloque de Bloques (Empujar para abrir camino)
    else if (currentLevel === 2) {
        // Genera una estructura masiva compacta tipo cuadrícula cada 180 fotogramas
        if (spawnTimer % 180 === 0) {
            let rows = 4;
            let cols = 8;
            let startY = -140;
            let size = 15; // Tamaño del bloque
            
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    // Dejamos pequeños bloques compactos juntos sin espacios
                    let blockX = c * 34 + 40;
                    let blockY = startY + (r * 30);
                    
                    // Un color rojizo/sólido para denotar peligro de bloque
                    obstacles.push(createObstacle(blockX, blockY, size, 0, levelSpeed * 0.8, '#f43f5e', 'cube'));
                }
            }
        }
    }
    
    // NIVEL 3: La Culebrita/Serpiente de costado en línea recta continua
    else if (currentLevel === 3) {
        // Crea un flujo continuo simulando una serpiente que avanza desde un lateral
        if (spawnTimer % 12 === 0) {
            let r = 13;
            // Usamos una función seno basada en el tiempo para que salgan en una línea ondulada perfecta
            let oX = canvas.width / 2 + Math.sin(Date.now() * 0.004) * 130;
            obstacles.push(createObstacle(oX, -r, r, 0, levelSpeed * 1.1, '#a78bfa'));
        }
    }
    
    // NIVEL 4: Laberinto avanzado y formaciones en Cruz (X)
    else if (currentLevel === 4) {
        if (spawnTimer % 140 === 0) {
            let pattern = Math.random() > 0.5 ? 'X' : 'barrera-movil';
            
            if (pattern === 'X') {
                for (let i = 0; i < 7; i++) {
                    obstacles.push(createObstacle(i * 45 + 25, -i * 25, 12, 0, levelSpeed, '#fbbf24'));
                    obstacles.push(createObstacle(canvas.width - (i * 45 + 25), -i * 25, 12, 0, levelSpeed, '#fbbf24'));
                }
            } else {
                // Grandes tablas horizontales cruzadas que entran con velocidad inclinada
                obstacles.push(createObstacle(50, -30, 25, 1.5, levelSpeed, '#38bdf8'));
                obstacles.push(createObstacle(canvas.width - 50, -90, 25, -1.5, levelSpeed, '#38bdf8'));
            }
        }
    }
}

// --- Físicas Elásticas de Impacto por Masa ---
function resolvePhysicsCollision(c1, c2) {
    let dx = c2.x - c1.x;
    let dy = c2.y - c1.y;
    let distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < (c1.radius + c2.radius)) {
        // Empuje de separación para que no se traspasen
        let overlap = (c1.radius + c2.radius) - distance;
        let nx = dx / distance;
        let ny = dy / distance;
        
        c2.x += nx * overlap;
        c2.y += ny * overlap;

        // Ecuaciones de choque elástico real
        let kx = c1.vx - c2.vx;
        let ky = c1.vy - c2.vy;
        let p = 2 * (nx * kx + ny * ky) / (c1.mass + c2.mass);

        // Se actualizan los vectores de velocidad del obstáculo impactado
        c2.vx += p * c1.mass * nx * 1.5;
        c2.vy += p * c1.mass * ny * 1.5;
    }
}

function update() {
    if (!gameActive) return;

    // Calcular velocidad física del escudo en este fotograma
    shield.vx = (shield.x - shield.ox);
    shield.vy = (shield.y - shield.oy);
    
    shield.ox = shield.x;
    shield.oy = shield.y;

    // Acercar el escudo suavemente a la posición del cursor/dedo
    shield.x += (shield.targetX - shield.x) * shield.speedFactor;
    shield.y += (shield.targetY - shield.y) * shield.speedFactor;

    shield.x = Math.max(shield.radius, Math.min(canvas.width - shield.radius, shield.x));
    shield.y = Math.max(shield.radius, Math.min(canvas.height - shield.radius, shield.y));

    // Ejecutar lógica de spawn según nivel
    updateLevelsAndSpawning();

    // Contador de puntos estable por tiempo sostenido
    if (Date.now() % 12 === 0) {
        score++;
        
        if (milestones[score] && !milestones[score].triggered) {
            milestones[score].triggered = true;
            scoreTxt.innerHTML = `<span style="color: #fbbf24; font-size: 17px; font-weight:bold;">${milestones[score].msg}</span>`;
            setTimeout(() => {}, 3500);
        } else {
            scoreTxt.innerHTML = `Nivel ${currentLevel} | Puntos: <span style="color:#38bdf8">${score}</span>`;
        }
    }

    // Actualizar todos los bloques y esferas
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        
        obs.x += obs.vx;
        obs.y += obs.vy;

        // Amortiguación del deslizamiento lateral
        obs.vx *= 0.97;

        // Resolver choque con el círculo del jugador
        resolvePhysicsCollision(shield, obs);

        // Verificar choque mortal contra el globo
        let bDx = obs.x - balloon.x;
        let bDy = obs.y - balloon.y;
        let bDist = Math.sqrt(bDx * bDx + bDy * bDy);
        
        if (bDist < (balloon.radius + obs.radius)) {
            gameOver();
            return;
        }

        // Eliminar del array si ya pasó el límite inferior
        if (obs.y > canvas.height + 60) {
            obstacles.splice(i, 1);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Hilo
    ctx.beginPath();
    ctx.moveTo(balloon.x, balloon.y + balloon.radius);
    ctx.lineTo(balloon.x, balloon.y + balloon.radius + balloon.stringLength);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Globo
    ctx.beginPath();
    ctx.arc(balloon.x, balloon.y, balloon.radius, 0, Math.PI * 2);
    ctx.fillStyle = balloon.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = balloon.color;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Escudo
    ctx.beginPath();
    ctx.arc(shield.x, shield.y, shield.radius, 0, Math.PI * 2);
    ctx.fillStyle = shield.color;
    ctx.fill();

    // Dibujar las geometrías de los obstáculos
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color;
        ctx.beginPath();
        
        if (obs.type === 'cube') {
            ctx.fillRect(obs.x - obs.radius, obs.y - obs.radius, obs.radius * 2, obs.radius * 2);
        } else {
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function gameOver() {
    gameActive = false;
    overlayTitle.innerText = "💔 ¡Explotó nuestro amor! 💔";
    
    let rewardText = "No te rindas mi ojitos de uva, ¡inténtalo de nuevo!";
    if (score >= 5000) rewardText = "¡Lograste mantener a salvo el amor y la membresía del Free! 🔥💎";
    else if (score >= 1000) rewardText = "¡Te quedaste con el récord de los 20 quetzales! 💵🚀";
    else if (score >= 500) rewardText = "¡Al menos aseguraste los 10 quetzales! 🎉";
    else if (score >= 100) rewardText = "¡Te quedaste con un hermoso 'Te amo'! 🥰";

    overlayDesc.innerHTML = `Llegaste al <strong>Nivel ${currentLevel}</strong> con <strong>${score} puntos</strong>.<br><br>${rewardText}`;
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
