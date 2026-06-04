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

// El Globo (Mantiene su tamaño original de 23px de radio)
const balloon = {
    x: 200,
    y: 510,
    radius: 23,
    color: '#ff4757',
    stringLength: 35
};

// El Escudo (Tú lo controlas)
const shield = {
    x: 200, y: 380,
    ox: 200, oy: 380,
    vx: 0, vy: 0,
    radius: 15,
    color: '#ffffff',
    targetX: 200, targetY: 380,
    speedFactor: 0.35,
    mass: 25 // Se aumentó la masa para poder mover los bloques masivos del 400%
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

// Generador de objetos con masa proporcional estricta al volumen/área
function createObstacle(x, y, radius, vx, vy, color, type = 'circle') {
    // La masa escala al cuadrado. Un objeto 400% más grande es 16 veces más pesado.
    const mass = (radius * radius) * 0.05; 
    return {
        x: x, y: y,
        radius: radius,
        vx: vx, vy: vy,
        color: color,
        mass: mass,
        type: type
    };
}

// --- Administrador de Niveles y Variación Extrema de Tamaño ---
function updateLevelsAndSpawning() {
    spawnTimer++;

    if (score < 300) currentLevel = 1;
    else if (score >= 300 && score < 700) currentLevel = 2;
    else if (score >= 700 && score < 1500) currentLevel = 3;
    else currentLevel = 4;

    let levelSpeed = 1.3 + (currentLevel * 0.3);

    // Función para obtener un radio aleatorio (Máximo 400% del globo -> 23 * 4 = 92px de radio)
    function getRandomRadius() {
        let dice = Math.random();
        if (dice > 0.92) return Math.random() * 22 + 70; // Gigantesco (300% - 400%)
        if (dice > 0.75) return Math.random() * 25 + 45; // Mediano-Grande (200%)
        return Math.random() * 12 + 10;                  // Normal / Pequeño (50% - 100%)
    }

    // NIVEL 1: Lluvia Tradicional con tamaños muy locos e impredecibles
    if (currentLevel === 1 && spawnTimer % 35 === 0) {
        let r = getRandomRadius();
        let x = Math.random() * (canvas.width - r * 2) + r;
        obstacles.push(createObstacle(x, -r, r, 0, levelSpeed, '#34d399'));
    }
    
    // NIVEL 2: Estructura de Bloques Pesados (Pared densa)
    else if (currentLevel === 2 && spawnTimer % 180 === 0) {
        let rows = 3;
        let cols = 6;
        let startY = -120;
        let size = 18; // Cada bloque individual
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let blockX = c * 42 + 50;
                let blockY = startY + (r * 32);
                obstacles.push(createObstacle(blockX, blockY, size, 0, levelSpeed * 0.8, '#f43f5e', 'cube'));
            }
        }
    }
    
    // NIVEL 3: La Serpiente continua ondulante
    else if (currentLevel === 3 && spawnTimer % 10 === 0) {
        let r = 12;
        let oX = canvas.width / 2 + Math.sin(Date.now() * 0.005) * 125;
        obstacles.push(createObstacle(oX, -r, r, 0, levelSpeed * 1.1, '#a78bfa'));
    }
    
    // NIVEL 4: Tormenta Total de Meteoros Gigantesco (Hasta 400%) y Patrones en X
    else if (currentLevel === 4) {
        if (spawnTimer % 130 === 0) {
            let pattern = Math.random() > 0.4 ? 'X' : 'mega-bloque';
            
            if (pattern === 'X') {
                for (let i = 0; i < 6; i++) {
                    obstacles.push(createObstacle(i * 50 + 30, -i * 25, 12, 0, levelSpeed, '#fbbf24'));
                    obstacles.push(createObstacle(canvas.width - (i * 50 + 30), -i * 25, 12, 0, levelSpeed, '#fbbf24'));
                }
            } else {
                // Spawnea un obstáculo colosal del 400% del tamaño del globo
                let megaRadius = 90; // Casi tapa media pantalla
                obstacles.push(createObstacle(canvas.width / 2, -megaRadius, megaRadius, 0, levelSpeed * 0.6, '#38bdf8'));
            }
        }
    }
}

// --- Físicas Avanzadas de Colisión Elástica Completa ---
function resolvePhysicsCollision(obj1, obj2) {
    let dx = obj2.x - obj1.x;
    let dy = obj2.y - obj1.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let minDist = obj1.radius + obj2.radius;

    if (distance < minDist) {
        // 1. Separación física inmediata para evitar solapamientos u objetos atorados
        let overlap = minDist - distance;
        let nx = dx / distance;
        let ny = dy / distance;
        
        // Distribuir el empuje de separación basándose en las masas de cada uno
        let totalMass = obj1.mass + obj2.mass;
        
        // Si el objeto 1 NO es el escudo del jugador (que es inamovible por ratón), ambos se repelen
        if (obj1 !== shield) {
            let ratio1 = obj2.mass / totalMass;
            obj1.x -= nx * overlap * ratio1;
            obj1.y -= ny * overlap * ratio1;
        }
        
        let ratio2 = obj1.mass / totalMass;
        obj2.x += nx * overlap * ratio2;
        obj2.y += ny * overlap * ratio2;

        // 2. Transferencia Vectorial de Impulso Elástico Real
        let kx = obj1.vx - obj2.vx;
        let ky = obj1.vy - obj2.vy;
        let vn = kx * nx + ky * ny; // Velocidad relativa normal

        // Si se están moviendo en direcciones opuestas de separación, no recalcular
        if (vn < 0) return;

        let impulse = (2 * vn) / totalMass;

        // Aplicar el rebote físico real a ambas velocidades corporales
        if (obj1 !== shield) {
            obj1.vx -= impulse * obj2.mass * nx;
            obj1.vy -= impulse * obj2.mass * ny;
        }
        obj2.vx += impulse * obj1.mass * nx;
        obj2.vy += impulse * obj1.mass * ny;
    }
}

function update() {
    if (!gameActive) return;

    // Calcular la inercia/fuerza del escudo
    shield.vx = (shield.x - shield.ox);
    shield.vy = (shield.y - shield.oy);
    shield.ox = shield.x;
    shield.oy = shield.y;

    // Mover el escudo hacia el cursor
    shield.x += (shield.targetX - shield.x) * shield.speedFactor;
    shield.y += (shield.targetY - shield.y) * shield.speedFactor;

    shield.x = Math.max(shield.radius, Math.min(canvas.width - shield.radius, shield.x));
    shield.y = Math.max(shield.radius, Math.min(canvas.height - shield.radius, shield.y));

    updateLevelsAndSpawning();

    // Puntuación por tiempo de supervivencia
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

    // --- BUCLE DE FÍSICAS E INTERACCIONES ---
    // Mover todos los obstáculos individuales
    obstacles.forEach(obs => {
        obs.x += obs.vx;
        obs.y += obs.vy;
        
        // Fricción de arrastre sutil para frenar rebotes infinitos en las paredes laterales
        obs.vx *= 0.98;
        
        // Hacer que reboten contra las paredes laterales de la pantalla
        if (obs.x - obs.radius < 0) {
            obs.x = obs.radius;
            obs.vx *= -0.8;
        } else if (obs.x + obs.radius > canvas.width) {
            obs.x = canvas.width - obs.radius;
            obs.vx *= -0.8;
        }
    });

    // DETECCIÓN CADENA: Chocar obstáculos CONTRA OTROS obstáculos
    for (let i = 0; i < obstacles.length; i++) {
        for (let j = i + 1; j < obstacles.length; j++) {
            resolvePhysicsCollision(obstacles[i], obstacles[j]);
        }
    }

    // DETECCIÓN: Chocar obstáculos contra el ESCUDO del jugador
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        resolvePhysicsCollision(shield, obs);

        // DETECCIÓN: Choque mortal contra el GLOBO
        let bDx = obs.x - balloon.x;
        let bDy = obs.y - balloon.y;
        let bDist = Math.sqrt(bDx * bDx + bDy * bDy);
        
        if (bDist < (balloon.radius + obs.radius)) {
            gameOver();
            return;
        }

        // Eliminar del mapa si el obstáculo cae al fondo por completo
        if (obs.y - obs.radius > canvas.height + 40) {
            obstacles.splice(i, 1);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Hilo fino
    ctx.beginPath();
    ctx.moveTo(balloon.x, balloon.y + balloon.radius);
    ctx.lineTo(balloon.x, balloon.y + balloon.radius + balloon.stringLength);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Dibujar Globo Romántico
    ctx.beginPath();
    ctx.arc(balloon.x, balloon.y, balloon.radius, 0, Math.PI * 2);
    ctx.fillStyle = balloon.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = balloon.color;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dibujar Escudo Protector
    ctx.beginPath();
    ctx.arc(shield.x, shield.y, shield.radius, 0, Math.PI * 2);
    ctx.fillStyle = shield.color;
    ctx.fill();

    // Dibujar Obstáculos Geométricos
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
