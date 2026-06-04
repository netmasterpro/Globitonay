const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos de la interfaz
const scoreTxt = document.getElementById('score');
const progressBar = document.getElementById('progress-bar');
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
const MAX_LEVELS = 10;
const POINTS_PER_LEVEL = 200;

// El Globo (Radio original fijo)
const balloon = { x: 200, y: 510, radius: 23, color: '#ff4757', stringLength: 35 };

// El Escudo Protector
const shield = {
    x: 200, y: 380, ox: 200, oy: 380, vx: 0, vy: 0,
    radius: 15, color: '#ffffff',
    targetX: 200, targetY: 380, speedFactor: 0.4, mass: 30 
};

// --- Mensajes de Metas Especiales por Nivel ---
const levelRewards = {
    1: "¡Calentando motores, ojitos de uva! 🍇",
    2: "¡Te amo, amor, tú puedes! 🥰✨",
    3: "¡Cuidado con los costados! 🌀",
    4: "¡Eh, aseguraste 10 quetzales! 💰🎉",
    5: "¡Esto ya va muy rápido! ⚡",
    6: "¡Increíble! Aseguraste 20 quetzales 💵🔥",
    7: "¡Esquiva el zigzag! 🐍",
    8: "¡Casi imposible! El coloso se acerca 🏔️",
    9: "¡Falta poco por nuestro amor! ❤️🏆",
    10: "¡DIOS MÍO! ¡Membresía para el Free asegurada! 💎👑"
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
    score = 0; obstacles = []; spawnTimer = 0; currentLevel = 1;
    progressBar.style.width = "0%";
    scoreTxt.innerHTML = `Nivel 1 | Puntos: ${score}`;
    shield.x = 200; shield.y = 380; shield.targetX = 200; shield.targetY = 380;
    shield.vx = 0; shield.vy = 0;
    balloon.x = 200; balloon.y = 510;
}

function createObstacle(x, y, radius, vx, vy, color, type = 'circle') {
    return { x, y, radius, vx, vy, color, mass: radius * radius * 0.05, type };
}

// --- Generador de los 10 Niveles Basados en el Juego Real ---
function updateLevelsAndSpawning() {
    spawnTimer++;
    
    // Calcular nivel actual con tope de 10
    let calculatedLevel = Math.floor(score / POINTS_PER_LEVEL) + 1;
    if (calculatedLevel > MAX_LEVELS) calculatedLevel = MAX_LEVELS;
    
    if (calculatedLevel !== currentLevel) {
        currentLevel = calculatedLevel;
    }

    // Actualizar la Barra de Progreso Visual
    let pointsInCurrentLevel = score % POINTS_PER_LEVEL;
    let progressPercent = (pointsInCurrentLevel / POINTS_PER_LEVEL) * 100;
    if (currentLevel === MAX_LEVELS && score >= MAX_LEVELS * POINTS_PER_LEVEL) progressPercent = 100;
    progressBar.style.width = `${progressPercent}%`;

    let baseSpeed = 1.2 + (currentLevel * 0.35);

    // Selector de tamaños variados
    function getRadius() {
        let dice = Math.random();
        if (dice > 0.94 && currentLevel >= 4) return Math.random() * 20 + 65; // Gigantesco (Nivel 4+)
        if (dice > 0.75) return Math.random() * 15 + 35; // Mediano
        return Math.random() * 8 + 10; // Pequeño y veloz
    }

    // MAPEO DE LOS 10 NIVELES:
    if (currentLevel === 1 && spawnTimer % 35 === 0) { // Nivel 1: Lluvia Simple
        obstacles.push(createObstacle(Math.random() * 340 + 30, -20, getRadius(), 0, baseSpeed, '#34d399'));
    }
    else if (currentLevel === 2 && spawnTimer % 160 === 0) { // Nivel 2: Conjunto / Bloque compacto para empujar
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 6; c++) {
                obstacles.push(createObstacle(c * 44 + 45, -100 + (r * 30), 15, 0, baseSpeed * 0.8, '#f43f5e', 'cube'));
            }
        }
    }
    else if (currentLevel === 3 && spawnTimer % 12 === 0) { // Nivel 3: Culebrita desde un costado continuo
        let oX = canvas.width / 2 + Math.sin(Date.now() * 0.005) * 120;
        obstacles.push(createObstacle(oX, -15, 13, 0, baseSpeed * 1.1, '#a78bfa'));
    }
    else if (currentLevel === 4 && spawnTimer % 45 === 0) { // Nivel 4: Lluvia mixta masiva con meteoros grandes
        obstacles.push(createObstacle(Math.random() * 300 + 50, -50, getRadius(), 0, baseSpeed, '#38bdf8'));
    }
    else if (currentLevel === 5 && spawnTimer % 140 === 0) { // Nivel 5: Embudos en forma de "V" invertida
        let cX = canvas.width / 2;
        for(let i = 0; i < 5; i++) {
            obstacles.push(createObstacle(cX - (i * 35), -20 - (i * 25), 14, 0, baseSpeed, '#fbbf24'));
            obstacles.push(createObstacle(cX + (i * 35), -20 - (i * 25), 14, 0, baseSpeed, '#fbbf24'));
        }
    }
    else if (currentLevel === 6 && spawnTimer % 20 === 0) { // Nivel 6: Ataques cruzados desde los dos laterales
        let side = Math.random() > 0.5;
        let x = side ? -20 : canvas.width + 20;
        let vx = side ? (Math.random() * 2 + 1.5) : -(Math.random() * 2 + 1.5);
        obstacles.push(createObstacle(x, Math.random() * 150 + 50, 15, vx, baseSpeed * 0.9, '#f43f5e'));
    }
    else if (currentLevel === 7 && spawnTimer % 150 === 0) { // Nivel 7: El péndulo/Línea horizontal que barra la pantalla
        for(let i = 0; i < 9; i++) {
            obstacles.push(createObstacle(i * 45 + 20, -30, 14, 0, baseSpeed * 1.2, '#10b981'));
        }
    }
    else if (currentLevel === 8 && spawnTimer % 180 === 0) { // Nivel 8: El Bloque Colosal del 400%
        obstacles.push(createObstacle(canvas.width / 2, -92, 92, 0, baseSpeed * 0.6, '#ec4899'));
    }
    else if (currentLevel === 9 && spawnTimer % 80 === 0) { // Nivel 9: Caos de figuras mixtas rebotando locamente
        obstacles.push(createObstacle(Math.random() * 300 + 50, -30, getRadius(), (Math.random() - 0.5) * 3, baseSpeed, '#8b5cf6'));
    }
    else if (currentLevel === 10 && spawnTimer % 10 === 0) { // Nivel 10: Tormenta final apocalíptica de todo tipo
        if(Math.random() > 0.7) {
            obstacles.push(createObstacle(Math.random() * 320 + 40, -40, getRadius(), (Math.random() - 0.5) * 2, baseSpeed * 1.3, '#f59e0b'));
        }
    }
}

// --- MOTOR FÍSICO ULTRA PRECISO ANTI-BUGS ---
function resolveCollision(obj1, obj2) {
    let dx = obj2.x - obj1.x;
    let dy = obj2.y - obj1.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let minDist = obj1.radius + obj2.radius;

    if (distance < minDist) {
        let overlap = minDist - distance;
        let nx = dx / distance;
        let ny = dy / distance;
        
        let totalMass = obj1.mass + obj2.mass;
        
        // Separación posicional para evitar que se fusionen o traspasen
        if (obj1 !== shield) {
            let ratio1 = obj2.mass / totalMass;
            obj1.x -= nx * overlap * ratio1;
            obj1.y -= ny * overlap * ratio1;
        }
        let ratio2 = obj1.mass / totalMass;
        obj2.x += nx * overlap * ratio2;
        obj2.y += ny * overlap * ratio2;

        // Choque elástico matemático estricto
        let kx = obj1.vx - obj2.vx;
        let ky = obj1.vy - obj2.vy;
        let vn = kx * nx + ky * ny;

        if (vn < 0) return;

        let impulse = (2 * vn) / totalMass;

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

    // 1. SUB-STEPS FÍSICOS (Divide el frame en 4 micro-cálculos para evitar el efecto túnel/atravesar)
    const SUB_STEPS = 4;
    
    // Guardar inercia del escudo del jugador
    shield.vx = (shield.x - shield.ox);
    shield.vy = (shield.y - shield.oy);
    shield.ox = shield.x;
    shield.oy = shield.y;

    shield.x += (shield.targetX - shield.x) * shield.speedFactor;
    shield.y += (shield.targetY - shield.y) * shield.speedFactor;
    shield.x = Math.max(shield.radius, Math.min(canvas.width - shield.radius, shield.x));
    shield.y = Math.max(shield.radius, Math.min(canvas.height - shield.radius, shield.y));

    updateLevelsAndSpawning();

    // Sistema de puntos por supervivencia
    if (Date.now() % 12 === 0) {
        score++;
        scoreTxt.innerHTML = `Nivel ${currentLevel} | Puntos: <span style="color:#38bdf8">${score}</span>`;
    }

    // Dividimos el movimiento en micro-pasos para que los objetos rápidos no se salten las colisiones
    for (let step = 0; step < SUB_STEPS; step++) {
        
        obstacles.forEach(obs => {
            // Avanzar solo una fracción de su velocidad por cada sub-paso
            obs.x += obs.vx / SUB_STEPS;
            obs.y += obs.vy / SUB_STEPS;
            
            // Rebotar en paredes laterales
            if (obs.x - obs.radius < 0) {
                obs.x = obs.radius;
                obs.vx *= -0.8;
            } else if (obs.x + obs.radius > canvas.width) {
                obs.x = canvas.width - obs.radius;
                obs.vx *= -0.8;
            }
        });

        // Revisar choques: Obstáculo vs Obstáculo
        for (let i = 0; i < obstacles.length; i++) {
            for (let j = i + 1; j < obstacles.length; j++) {
                resolveCollision(obstacles[i], obstacles[j]);
            }
        }

        // Revisar choques: Jugador Escudo vs Obstáculo
        for (let i = 0; i < obstacles.length; i++) {
            resolveCollision(shield, obstacles[i]);
            
            // Verificar choque definitivo contra el Globo
            let bDx = obstacles[i].x - balloon.x;
            let bDy = obstacles[i].y - balloon.y;
            let bDist = Math.sqrt(bDx * bDx + bDy * bDy);
            if (bDist < (balloon.radius + obstacles[i].radius)) {
                gameOver();
                return;
            }
        }
    }

    // Aplicar fricción normal e hilos fuera del sub-paso
    obstacles.forEach(obs => { obs.vx *= 0.98; });

    // Limpieza de memoria
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (obstacles[i].y - obstacles[i].radius > canvas.height + 40) {
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

    // Renderizar obstáculos
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
    
    // Buscar meta de nivel alcanzada para el mensaje
    let rewardText = levelRewards[currentLevel] || "¡Sigue intentándolo mi ojitos de uva! ❤️";
    
    overlayDesc.innerHTML = `Llegaste al <strong>Nivel ${currentLevel}</strong> de 10.<br>Puntuación total: <strong>${score} puntos</strong>.<br><br><em>"${rewardText}"</em>`;
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
