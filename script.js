const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const progressBar = document.getElementById("progress-bar");

const overlay = document.getElementById("screen-overlay");
const startBtn = document.getElementById("start-btn");

const victoryOverlay = document.getElementById("victory-overlay");
const restartBtn = document.getElementById("restart-btn");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let gameRunning = false;
let score = 0;
let level = 1;
let scoreTimer = 0;

const MAX_LEVEL = 10;
const LEVEL_POINTS = 250;

let obstacles = [];
let particles = [];
let floatingHearts = [];
let spawnTimer = 0;

const balloon = {
    x: window.innerWidth / 2,
    y: window.innerHeight - 140,
    radius: 26
};

const shield = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    targetX: window.innerWidth / 2,
    targetY: window.innerHeight / 2,
    radius: 38,
    speed: 0.22
};

const loveMessages = [
    "❤️ Te amo mucho mi Ojitos de Uva ❤️",
    "🌹 Gracias por existir 🌹",
    "🥰 Eres mi persona favorita 🥰",
    "💕 Siempre elegiría estar contigo 💕",
    "✨ Tú haces mi mundo más bonito ✨",
    "🍇 Mi Ojitos de Uva hermosa 🍇",
    "💖 Estoy orgulloso de ti 💖",
    "❤️ Nuestro amor puede con todo ❤️"
];

let currentMessage = "";
let messageTimer = 0;


canvas.addEventListener("touchmove", e => {

    e.preventDefault();

    const rect = canvas.getBoundingClientRect();

    shield.targetX =
        e.touches[0].clientX - rect.left;

    shield.targetY =
        e.touches[0].clientY - rect.top;

}, { passive:false });

canvas.addEventListener("mousemove", e => {

    const rect = canvas.getBoundingClientRect();

    shield.targetX =
        e.clientX - rect.left;

    shield.targetY =
        e.clientY - rect.top;
});



class Particle {

    constructor(x,y){

        this.x = x;
        this.y = y;

        this.vx = (Math.random()-0.5)*5;
        this.vy = (Math.random()-0.5)*5;

        this.life = 40;
        this.size = Math.random()*6+3;
    }

    update(){

        this.x += this.vx;
        this.y += this.vy;

        this.life--;
    }

    draw(){

        ctx.save();

        ctx.globalAlpha =
            this.life / 40;

        ctx.fillStyle =
            "#ff4d88";

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            this.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}




function drawHeart(x,y,size){

    ctx.beginPath();

    ctx.moveTo(x,y);

    ctx.bezierCurveTo(
        x-size,
        y-size,
        x-size*2,
        y+size*0.5,
        x,
        y+size*2
    );

    ctx.bezierCurveTo(
        x+size*2,
        y+size*0.5,
        x+size,
        y-size,
        x,
        y
    );

    ctx.fill();
}


class FloatingHeart {

    constructor(){

        this.x =
            Math.random() * canvas.width;

        this.y =
            canvas.height + 50;

        this.size =
            Math.random() * 14 + 10;

        this.speed =
            Math.random() * 1.2 + 0.3;

        this.alpha =
            Math.random() * 0.5 + 0.2;
    }

    update(){

        this.y -= this.speed;

        if(this.y < -50){

            this.y =
                canvas.height + 50;

            this.x =
                Math.random() * canvas.width;
        }
    }

    draw(){

        ctx.save();

        ctx.globalAlpha =
            this.alpha;

        ctx.fillStyle =
            "#ffffff";

        drawHeart(
            this.x,
            this.y,
            this.size
        );

        ctx.restore();
    }
}

for(let i=0;i<35;i++){

    floatingHearts.push(
        new FloatingHeart()
    );
}


class Obstacle {

    constructor(
        x,
        y,
        r,
        vx,
        vy,
        color,
        type="circle"
    ){

        this.x = x;
        this.y = y;

        this.radius = r;

        this.vx = vx;
        this.vy = vy;

        this.color = color;

        this.type = type;
    }

    update(){

        this.x += this.vx;
        this.y += this.vy;
    }

    draw(){

        ctx.fillStyle =
            this.color;

        if(this.type === "square"){

            ctx.fillRect(
                this.x - this.radius,
                this.y - this.radius,
                this.radius * 2,
                this.radius * 2
            );

        }else{

            ctx.beginPath();

            ctx.arc(
                this.x,
                this.y,
                this.radius,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }
}


function createObstacle(){

    const side =
        Math.floor(
            Math.random() * 3
        );

    let x;
    let y;

    if(side === 0){

        x = -40;
        y =
            Math.random()
            * canvas.height
            * 0.7;

    }else if(side === 1){

        x =
            canvas.width + 40;

        y =
            Math.random()
            * canvas.height
            * 0.7;

    }else{

        x =
            Math.random()
            * canvas.width;

        y = -40;
    }

    const radius =
        Math.random() * 20 + 15;

    const speed =
        Math.random() * 2 + 1.5;

    const angle =
        Math.atan2(
            balloon.y - y,
            balloon.x - x
        );

    const vx =
        Math.cos(angle)
        * speed;

    const vy =
        Math.sin(angle)
        * speed;

    const color =
        "#ff4d88";

    const type =
        Math.random() > 0.75
        ? "square"
        : "circle";

    obstacles.push(

        new Obstacle(
            x,
            y,
            radius,
            vx,
            vy,
            color,
            type
        )

    );
}


function handleSpawning(){

    spawnTimer++;

    let spawnRate =
        Math.max(
            14,
            60 - level * 5
        );

    if(spawnTimer >= spawnRate){

        spawnTimer = 0;

        createObstacle();

        if(
            level >= 4 &&
            Math.random() > 0.65
        ){
            createObstacle();
        }

        if(
            level >= 7 &&
            Math.random() > 0.60
        ){
            createObstacle();
        }
    }
}



function circleCollision(a,b){

    const dx =
        a.x - b.x;

    const dy =
        a.y - b.y;

    const dist =
        Math.sqrt(
            dx * dx +
            dy * dy
        );

    return (
        dist <
        a.radius + b.radius
    );
}

function pushObstacle(obstacle){

    const dx =
        obstacle.x - shield.x;

    const dy =
        obstacle.y - shield.y;

    let distance =
        Math.sqrt(
            dx*dx +
            dy*dy
        );

    if(distance === 0){

        distance = 0.01;
    }

    obstacle.vx +=
        (dx / distance)
        * 1.8;

    obstacle.vy +=
        (dy / distance)
        * 1.8;
}


function resetGame(){

    score = 0;
    level = 1;

    spawnTimer = 0;
    scoreTimer = 0;

    obstacles = [];
    particles = [];

    currentMessage = "";
    messageTimer = 0;

    balloon.x =
        canvas.width / 2;

    balloon.y =
        canvas.height - 140;

    shield.x =
        canvas.width / 2;

    shield.y =
        canvas.height / 2;

    shield.targetX =
        shield.x;

    shield.targetY =
        shield.y;

    scoreEl.textContent = "0";
    levelEl.textContent = "1";

    progressBar.style.width = "0%";
}

function updateLevel(){

    const newLevel =
        Math.min(
            MAX_LEVEL,
            Math.floor(
                score / LEVEL_POINTS
            ) + 1
        );

    if(newLevel > level){

        level = newLevel;

        levelEl.textContent =
            level;

        currentMessage =
            loveMessages[
                Math.floor(
                    Math.random()
                    * loveMessages.length
                )
            ];

        messageTimer = 240;
    }
}

function gameOver(){

    gameRunning = false;

    overlay.classList.remove(
        "hidden"
    );

    document.getElementById(
        "overlay-desc"
    ).textContent =
    "💔 Nuestro corazón chocó. Inténtalo nuevamente mi amor.";
}

function victory(){

    gameRunning = false;

    victoryOverlay.classList.remove(
        "hidden"
    );
}

function update(){

    if(!gameRunning)
        return;

    shield.x +=
        (shield.targetX - shield.x)
        * shield.speed;

    shield.y +=
        (shield.targetY - shield.y)
        * shield.speed;

    scoreTimer++;

    if(scoreTimer >= 6){

        score++;

        scoreTimer = 0;

        scoreEl.textContent =
            score;
    }

    updateLevel();

    const progress =
        Math.min(
            100,
            (
                score /
                (LEVEL_POINTS * MAX_LEVEL)
            ) * 100
        );

    progressBar.style.width =
        progress + "%";

    if(
        level >= 10 &&
        score >=
        LEVEL_POINTS * MAX_LEVEL
    ){

        victory();
        return;
    }

    handleSpawning();

    for(
        let i =
        obstacles.length - 1;

        i >= 0;

        i--
    ){

        const obs =
            obstacles[i];

        obs.update();

        if(
            circleCollision(
                shield,
                obs
            )
        ){

            pushObstacle(obs);

            particles.push(
                new Particle(
                    obs.x,
                    obs.y
                )
            );
        }

        if(
            circleCollision(
                balloon,
                obs
            )
        ){

            gameOver();
            return;
        }

        if(
            obs.x < -200 ||
            obs.x > canvas.width + 200 ||
            obs.y < -200 ||
            obs.y > canvas.height + 200
        ){

            obstacles.splice(i,1);
        }
    }

    for(
        let i =
        particles.length - 1;

        i >= 0;

        i--
    ){

        particles[i].update();

        if(
            particles[i].life <= 0
        ){

            particles.splice(i,1);
        }
    }

    if(messageTimer > 0){

        messageTimer--;
    }

    floatingHearts.forEach(
        heart => heart.update()
    );
}


function drawBackground(){

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            canvas.height
        );

    gradient.addColorStop(
        0,
        "#ffd6e8"
    );

    gradient.addColorStop(
        0.5,
        "#ffb7d5"
    );

    gradient.addColorStop(
        1,
        "#ff8ebf"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    floatingHearts.forEach(
        heart => heart.draw()
    );
}

function drawString(){

    ctx.beginPath();

    ctx.moveTo(
        balloon.x,
        balloon.y + 25
    );

    ctx.quadraticCurveTo(
        balloon.x - 10,
        balloon.y + 60,
        balloon.x + 5,
        balloon.y + 110
    );

    ctx.strokeStyle =
        "rgba(255,255,255,.8)";

    ctx.lineWidth = 2;

    ctx.stroke();
}

function drawBalloon(){

    ctx.save();

    const glow =
        ctx.createRadialGradient(
            balloon.x,
            balloon.y,
            5,
            balloon.x,
            balloon.y,
            70
        );

    glow.addColorStop(
        0,
        "#ffccd9"
    );

    glow.addColorStop(
        0.4,
        "#ff4d88"
    );

    glow.addColorStop(
        1,
        "#c9184a"
    );

    ctx.shadowBlur = 30;
    ctx.shadowColor = "#ff4d88";

    ctx.fillStyle = glow;

    drawHeart(
        balloon.x,
        balloon.y,
        22
    );

    ctx.restore();

    drawString();
}

function drawShield(){

    ctx.save();

    ctx.shadowBlur = 25;
    ctx.shadowColor = "#ffffff";

    const gradient =
        ctx.createRadialGradient(
            shield.x,
            shield.y,
            5,
            shield.x,
            shield.y,
            shield.radius
        );

    gradient.addColorStop(
        0,
        "#ffffff"
    );

    gradient.addColorStop(
        1,
        "#ffd6e8"
    );

    ctx.fillStyle =
        gradient;

    ctx.beginPath();

    ctx.arc(
        shield.x,
        shield.y,
        shield.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
}

function drawLoveMessage(){

    if(messageTimer <= 0)
        return;

    ctx.save();

    ctx.globalAlpha =
        Math.min(
            1,
            messageTimer / 60
        );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 24px Segoe UI";

    ctx.textAlign =
        "center";

    ctx.fillText(
        currentMessage,
        canvas.width / 2,
        120
    );

    ctx.restore();
}

function drawParticles(){

    particles.forEach(
        particle =>
        particle.draw()
    );
}

function drawObstacles(){

    obstacles.forEach(
        obstacle =>
        obstacle.draw()
    );
}

function render(){

    drawBackground();

    drawObstacles();

    drawParticles();

    drawBalloon();

    drawShield();

    drawLoveMessage();
}

function gameLoop(){

    update();

    render();

    requestAnimationFrame(
        gameLoop
    );
}

startBtn.addEventListener(
    "click",
    () => {

        overlay.classList.add(
            "hidden"
        );

        victoryOverlay.classList.add(
            "hidden"
        );

        resetGame();

        gameRunning = true;
    }
);

restartBtn.addEventListener(
    "click",
    () => {

        victoryOverlay.classList.add(
            "hidden"
        );

        overlay.classList.add(
            "hidden"
        );

        resetGame();

        gameRunning = true;
    }
);

gameLoop();
