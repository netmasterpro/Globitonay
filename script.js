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

// Propiedades físicas básicas
const physics = {
    gravity: 0.1,
    obstacleSpeed: 1.5
};

// El Escudo (La bolita protectora)
const shield = {
    x: 200,
    y: 400,
    radius: 25,
    color: '#ffffff',
    targetX: 200,
    targetY: 400,
    speedFactor: 0.2
};

// El Globo
const balloon = {
    x: 200,
    y: 480,
    radius: 18,
    color: '#ff4757',
    stringLength: 30
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


// --- Lógica del Juego ---
function resetGame() {
    score = 0;
    obstacles = [];
    spawnTimer = 0;
    scoreTxt.innerText = score;
    
    shield.x = 200;
    shield.y = 400;
    shield.targetX = 200;
    shield.targetY = 400;
    
    balloon.x = 200;
    balloon.y = 480;
}

function spawnObstacle() {
    const size = Math.random() * 20 + 15;
    const x = Math.random() * (canvas.width - size);
    
    obstacles.push({
        x: x,
        y: -size,
        width: size,
        height: size,
        vx: (Math.random() - 0.5) * 1,
        vy: physics.obstacleSpeed,
        color: '#34d399',
        type: 'cube'
    });
}

function checkCircleCollision(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

    return {
        collided: distanceSquared < (circle.radius * circle.radius),
        closestX: closestX,
        closestY: closestY
    };
}

function update() {
    if (!gameActive) return;

    shield.x += (shield.targetX - shield.x) * shield.speedFactor;
    shield.y += (shield.targetY - shield.y) * shield.speedFactor;

    shield.x = Math.max(shield.radius, Math.min(canvas.width - shield.radius, shield.x));
    shield.y = Math.max(shield.radius, Math.min(canvas.height - shield.radius, shield.y));

    spawnTimer++;
    if (spawnTimer > 60) {
        spawnObstacle();
        spawnTimer = 0;
        score++;
        scoreTxt.innerText = score;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        
        obs.x += obs.vx;
        obs.y += obs.vy;

        let shieldCollision = checkCircleCollision(shield, obs);
        if (shieldCollision.collided) {
            let angle = Math.atan2(obs.y + obs.height/2 - shield.y, obs.x + obs.width/2 - shield.x);
            obs.vx = Math.cos(angle) * 7;
            obs.vy = Math.sin(angle) * 7;
        }

        let balloonCollision = checkCircleCollision(balloon, obs);
        if (balloonCollision.collided) {
            gameOver();
        }

        if (obs.y > canvas.height + 50) {
            obstacles.splice(i, 1);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Hilo del Globo
    ctx.beginPath();
    ctx.moveTo(balloon.x, balloon.y + balloon.radius);
    ctx.lineTo(balloon.x, balloon.y + balloon.radius + balloon.stringLength);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Globo
    ctx.beginPath();
    ctx.arc(balloon.x, balloon.y, balloon.radius, 0, Math.PI * 2);
    ctx.fillStyle = balloon.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = balloon.color;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Escudo
    ctx.beginPath();
    ctx.arc(shield.x, shield.y, shield.radius, 0, Math.PI * 2);
    ctx.fillStyle = shield.color;
    ctx.fill();

    // Obstáculos
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    });
}

function gameOver() {
    gameActive = false;
    overlayTitle.innerText = "¡Fin del Juego!";
    overlayDesc.innerText = `Tu globo explotó. Conseguiste ${score} puntos.`;
    startBtn.innerText = "Volver a Intentar";
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
