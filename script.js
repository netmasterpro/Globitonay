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

// El Escudo (Velocidades vx y vy reales para transferir energía en el choque)
const shield = {
    x: 200,
    y: 380,
    ox: 200, // Posición previa para calcular velocidad del movimiento
    oy: 380,
    vx: 0,
    vy: 0,
    radius: 15,
    color: '#ffffff',
    targetX: 200,
    targetY: 380,
    speedFactor: 0.3,
    mass: 12 // Más pesado para poder empujar bloques grandes
};

// El Globo (Más grande y vulnerable)
const balloon = {
    x: 200,
    y: 510,
    radius: 24,
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
    currentLevel = 1;
    scoreTxt.innerHTML = `Nivel 1 | Puntos: ${score}`;
    
    Object.keys(milestones).forEach(key => milestones[key].triggered = false);
    
    shield.x = 200; shield.y = 380;
    shield.targetX = 200; shield.targetY = 380;
    shield.vx = 0; shield.vy = 0;
    
    balloon.x = 200; balloon.y = 510;
}

// Función auxiliar para crear objetos con propiedades físicas de círculo (facilita rebotes realistas)
function createObstacle(x, y, radius, vx, vy, color, type = 'circle') {
    return {
        x: x, y: y,
        radius: radius,
        vx: vx, vy: vy,
        color: color,
        mass: radius * 0.4, // La masa depende de su tamaño
        type: type // Usamos círculos o cajas mapeadas como esferas para físicas perfectas
    };
}

// --- Administrador de Niveles y Figuras ---
function updateLevelsAndSpawning() {
    spawnTimer++;

    // Control de progresión de niveles según puntaje
    if (score < 250) {
        currentLevel = 1;
    } else if (score >= 250 && score < 600) {
        currentLevel = 2;
    } else if (score >= 600 && score < 1200) {
        currentLevel = 3;
    } else {
        currentLevel = 4;
    }

    let levelSpeed = 1.5 + (currentLevel * 0.4);

    // NIVEL 1: Lluvia Tradicional Aleatoria (Solo caen)
    if (currentLevel === 1 && spawnTimer % 35 === 0) {
        let r = Math.random() * 12 + 10;
        let x = Math.random() * (canvas.width - r * 2) + r;
        obstacles.push(createObstacle(x, -r, r, 0, levelSpeed, '#34d399'));
    }
    
    // NIVEL 2: Ataques Laterales (Salen disparados desde los lados de la pantalla)
    else if (currentLevel === 2 && spawnTimer % 25 === 0) {
        let r = Math.random() * 10 + 10;
        let side = Math.random() > 0.5 ? 'left' : 'right';
        let x = side === 'left' ? -r : canvas.width + r;
        let y = Math.random() * 200 + 50; // Caen en la mitad superior
        let vx = side === 'left' ? (Math.random() * 2 + 1.5) : -(Math.random() * 2 + 1.5);
        obstacles.push(createObstacle(x, y, r, vx, levelSpeed, '#38bdf8'));
    }
    
    // NIVEL 3: Formación en X, Serpientes y Ondas complejas
    else if (currentLevel === 3) {
        // Cada 120 fotogramas lanza una ráfaga en forma de Cruz/X o Serpiente ondulante
        if (spawnTimer % 150 === 0) {
            let patternType = Math.random() > 0.5 ? 'X' : 'serpiente';
            
            if (patternType === 'X') {
                // Genera una diagonal cruzada que baja unida
                for(let i = 0; i < 6; i++) {
                    obstacles.push(createObstacle(i * 45 + 30, -i * 30, 14, 0, levelSpeed * 1.1, '#fbbf24'));
                    obstacles.push(createObstacle(canvas.width - (i * 45 + 30), -i * 30, 14, 0, levelSpeed * 1.1, '#fbbf24'));
                }
            } else {
                // Una fila india unida simulando una serpiente curveada
                for(let i = 0; i < 8; i++) {
                    let offsetX = Math.sin(i * 0.8) * 40;
                    obstacles.push(createObstacle(canvas.width/2 + offsetX, -i * 28 - 20, 15, 0, levelSpeed, '#a78bfa'));
                }
            }
        }
    }
    
    // NIVEL 4: El Bloque Sólido (Estructura masiva de cubos/esferas juntos bloqueando el camino)
    else if (currentLevel === 4 && obstacles.filter(o => o.isStaticBlock).length === 0 && spawnTimer % 200 === 0) {
        // Spawnea una cuadrícula densa en la parte superior que hay que empujar para abrir paso
        let rows = 4;
        let cols = 7;
        let startY = -150;
        let radius = 16;
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Dejamos un 15% de probabilidad de hueco para que no sea imposible
                if (Math.random() > 0.15) {
                    let block = createObstacle(c * 50 + 45, startY + (r * 35), radius, 0, levelSpeed * 0.7, '#f43f5e', 'cube');
                    block.isStaticBlock = true; // Etiqueta interna de nivel 4
                    obstacles.push(block);
                }
            }
        }
    }
}

// --- Físicas Reales de Colisión Elástica (Impulso y Masa) ---
function resolvePhysicsCollision(c1, c2) {
    let dx = c2.x - c1.x;
    let dy = c2.y - c1.y;
    let distance = Math.sqrt(dx * dx + dy * dy);

    // Si están intersecados, se calcula el rebote físico real
    if (distance < (c1.radius + c2.radius)) {
        
        // Corrección de posición instantánea para evitar que se queden pegados u encimados
        let overlap = (c1.radius + c2.radius) - distance;
        let nx = dx / distance;
        let ny = dy / distance;
        
        // Mover el obstáculo hacia afuera basándose en el solapamiento
        c2.x += nx * overlap;
        c2.y += ny * overlap;

        // Físicas vectoriales de transferencia de movimiento (Impulso elástico)
        let kx = c1.vx - c2.vx;
        let ky = c1.vy - c2.vy;
        let p = 2 * (nx * kx + ny * ky) / (c1.mass + c2.mass);

        // Modificar vectores de velocidad del obstáculo según la fuerza del choque del escudo
        c2.vx += p * c1.mass * nx * 1.4; // Multiplicador de rebote para mayor jugabilidad
        c2.vy += p * c1.mass * ny * 1.4;
    }
}

function update() {
    if (!gameActive) return;

    // Calcular velocidad real del escudo basándose en su cambio de posición por frame
    shield.vx = (shield.x - shield.ox);
    shield.vy = (shield.y - shield.oy);
    
    // Guardar historial de coordenadas previas
    shield.ox = shield.x;
    shield.oy = shield.y;

    // Movimiento fluido del ratón
    shield.x += (shield.targetX - shield.x) * shield.speedFactor;
    shield.y += (shield.targetY - shield.y) * shield.speedFactor;

    shield.x = Math.max(shield.radius, Math.min(canvas.width - shield.radius, shield.x));
    shield.y = Math.max(shield.radius, Math.min(canvas.height - shield.radius, shield.y));

    // Despachar obstáculos y lógica de fases
    updateLevelsAndSpawning();

    // Sumar puntos progresivos
    if (Date.now() % 12 === 0) {
        score++;
        
        // Manejo de textos dinámicos en la interfaz
        if (milestones[score] && !milestones[score].triggered) {
            milestones[score].triggered = true;
            scoreTxt.innerHTML = `<span style="color: #fbbf24; font-size: 18px; font-weight:bold;">${milestones[score].msg}</span>`;
            setTimeout(() => {}, 3500);
        } else {
            scoreTxt.innerHTML = `Nivel ${currentLevel} | Puntos: <span style="color:#38bdf8">${score}</span>`;
        }
    }

    // Procesar todos los obstáculos activos
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        
        // Aplicar sus movimientos físicos vectoriales
        obs.x += obs.vx;
        obs.y += obs.vy;

        // Fricción ambiental muy sutil para que dejen de moverse horizontalmente infinito tras un golpe
        obs.vx *= 0.98;

        // RESOLVER COLISIÓN REAL CON EL ESCUDO
        resolvePhysicsCollision(shield, obs);

        // COLISIÓN CON EL GLOBO (Fin del juego)
        let bDx = obs.x - balloon.x;
        let bDy = obs.y - balloon.y;
        let bDist = Math.sqrt(bDx * bDx + bDy * bDy);
        
        if (bDist < (balloon.radius + obs.radius)) {
            gameOver();
            return;
        }

        // Limpieza si salen de los márgenes inferiores
        if (obs.y > canvas.height + 50) {
            obstacles.splice(i, 1);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar el Hilo del Globo
    ctx.beginPath();
    ctx.moveTo(balloon.x, balloon.y + balloon.radius);
    ctx.lineTo(balloon.x, balloon.y + balloon.radius + balloon.stringLength);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Dibujar Globo Enorme
    ctx.beginPath();
    ctx.arc(balloon.x, balloon.y, balloon.radius, 0, Math.PI * 2);
    ctx.fillStyle = balloon.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = balloon.color;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dibujar Escudo Pequeño de Defensa
    ctx.beginPath();
    ctx.arc(shield.x, shield.y, shield.radius, 0, Math.PI * 2);
    ctx.fillStyle = shield.color;
    ctx.fill();

    // Dibujar Obstáculos Geométricos
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color;
        ctx.beginPath();
        
        if (obs.type === 'cube') {
            // Renderizado en caja usando el radio como dimensión uniforme
            ctx.fillRect(obs.x - obs.radius, obs.y - obs.radius, obs.radius * 2, obs.radius * 2);
        } else {
            // Renderizado Circular
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

// Inicializar posiciones y arrancar
gameLoop();
