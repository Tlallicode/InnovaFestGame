// --- GAME ENGINE SETUP ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        // Required tile2d class implementation
        class tile2d {
            x = 0;
            y = 0;
            width = 64;
            height = 64;
            image = null;
            constructor(x, y, image) {
                this.x = x;
                this.y = y;
                this.image = image;
            }
            render(context) {
                if (this.image) {
                    context.drawImage(this.image, this.x, this.y, this.width, this.height);
                } else {
                    context.fillStyle = '#666';
                    context.fillRect(this.x, this.y, this.width, this.height);
                    context.strokeStyle = '#333';
                    context.strokeRect(this.x, this.y, this.width, this.height);
                }
            }
        }

        class Obstacle extends tile2d {
            constructor(x, y, image, type) {
                super(x, y, image);
                this.type = type;
                this.passed = false;
            }
        }

        // Helper to generate DataURL images for our tiles dynamically
        function createTileImage(bgColor, text, isBorder = false) {
            const c = document.createElement('canvas');
            c.width = 64; c.height = 64;
            const context = c.getContext('2d');
            context.fillStyle = bgColor;
            context.fillRect(0, 0, 64, 64);
            if (isBorder) {
                context.fillStyle = '#ef4444'; // Red and white curbing
                context.fillRect(0, 0, 16, 32);
                context.fillRect(48, 32, 16, 32);
                context.fillStyle = '#f8fafc';
                context.fillRect(0, 32, 16, 32);
                context.fillRect(48, 0, 16, 32);
            } else if (!text && bgColor === '#334155') {
                // Road lines
                context.fillStyle = '#fbbf24';
                context.fillRect(30, 16, 4, 32);
            }
            if(text) {
                context.font = '40px Arial';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(text, 32, 36);
            }
            const img = new Image();
            img.src = c.toDataURL();
            return img;
        }

        const imgRoad = new Image();
        imgRoad.src = "../resources/dirt.png";

        // Variaciones de pasto
        const imgGrass = new Image(); imgGrass.src = "../resources/grass.png";
        const imgGrass2 = new Image(); imgGrass2.src = "../resources/grass2.png";
        const grassVariations = [imgGrass, imgGrass2];

        // Variaciones de bordes
        const side1 = new Image(); side1.src = "../resources/side.png";
        const side2 = new Image(); side2.src = "../resources/side2.png";
        const side3 = new Image(); side3.src = "../resources/side3.png";
        const side4 = new Image(); side4.src = "../resources/side4.png";
        const borderVariations = [side1, side2, side3, side4];
        const imgRock = createTileImage('#334155', '🪨');
        const imgBox = createTileImage('#334155', '📦');
        const imgPuddle = createTileImage('#334155', '💧');

        // --- CUSTOM SPRITES ---
        // To use your own images, change the .src property below to your file path.
        // Example: imgPlayer.src = 'assets/my_player_sprite.png';
        const imgPlayer = new Image(); imgPlayer.src = "../resources/character.png"
        const imgMom = new Image(); imgMom.src = "../resources/characterM.png"
        const imgSlipper = createTileImage('#a16207', '🩴'); 
        
        // Game states
        let gameState = 'START';
        let score = 0;
        let distance = 0; 
        let speed = 4;
        let lives = 3;
        let frameCount = 0;

        const roadWidthFraction = 0.78; 
        
        let player = {
            x: canvas.width / 2,
            y: canvas.height * 0.75,
            width: 48,
            height: 64,
            vx: 0,
            speed: 6,
            isJumping: false,
            jumpHeight: 0,
            jumpVel: 0,
            invulnerableTimer: 0
        };

        let bgTiles = [];
        let cols = 0;
        let rows = 0;
        let roadLeftBound = 0;
        let roadRightBound = 0;
        
        let obstacles = [];
        let particles = [];
        let slippers = []; 
        const keys = { left: false, right: false, jump: false };

        function initBackground() {
            bgTiles = [];
            cols = Math.ceil(canvas.width / 64);
            rows = Math.ceil(canvas.height / 64) + 2; 
            
            const roadWidthCols = Math.max(3, Math.floor(cols * roadWidthFraction));
            const leftGrassCols = Math.floor((cols - roadWidthCols) / 2);
            
            const roadLeftCol = leftGrassCols;
            const roadRightCol = leftGrassCols + roadWidthCols - 1;
            
            roadLeftBound = roadLeftCol * 64 + 64;
            roadRightBound = roadRightCol * 64;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    // Seleccionamos un pasto aleatorio por defecto
                    let img = grassVariations[Math.floor(Math.random() * grassVariations.length)];
                    
                    // Determinar si es camino o borde
                    if (c >= roadLeftCol && c <= roadRightCol) {
                        if (c === roadLeftCol || c === roadRightCol) {
                            // Seleccionamos un borde aleatorio
                            img = borderVariations[Math.floor(Math.random() * borderVariations.length)];
                        } else {
                            img = imgRoad;
                        }
                    }
                    
                    bgTiles.push(new tile2d(c * 64, r * 64 - 64, img));
                }
            }
        }

        function resizeCanvas() {
            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            player.y = canvas.height * 0.75;
            initBackground();
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        window.addEventListener('keydown', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                if (!keys.jump && !player.isJumping && gameState === 'PLAYING') triggerJump();
                keys.jump = true;
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = false;
        });

        const bindTouchButton = (id, keyName, isAction = false) => {
            const btn = document.getElementById(id);
            if(!btn) return;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (isAction && !player.isJumping && gameState === 'PLAYING') triggerJump();
                else keys[keyName] = true;
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                keys[keyName] = false;
            });
        };
        bindTouchButton('btn-left', 'left');
        bindTouchButton('btn-right', 'right');
        bindTouchButton('btn-jump', 'jump', true);

        function triggerJump() {
            player.isJumping = true;
            player.jumpVel = -12;
            createDust(player.x, player.y + player.height/2);
        }

        function createDust(x, y, color = '#e2e8f0') {
            for (let i = 0; i < 5; i++) {
                particles.push({
                    x: x + (Math.random() - 0.5) * 20,
                    y: y,
                    vx: (Math.random() - 0.5) * 2,
                    vy: Math.random() * 2 + 1,
                    radius: Math.random() * 4 + 2,
                    alpha: 0.8,
                    color: color
                });
            }
        }

        function spawnObstacle() {
            const spawnX = roadLeftBound + Math.random() * (roadRightBound - roadLeftBound - 64);
            const types = [
                { type: 'rock', img: imgRock },
                { type: 'puddle', img: imgPuddle },
                { type: 'box', img: imgBox }
            ];
            const selected = types[Math.floor(Math.random() * types.length)];
            obstacles.push(new Obstacle(spawnX, -64, selected.img, selected.type));
        }

        function spawnSlipper() {
            slippers.push({
                x: canvas.width / 2,
                y: 50,
                targetX: player.x,
                speedY: speed * 1.5,
                angle: 0
            });
        }

        function startGame() {
            gameState = 'PLAYING';
            score = 0;
            distance = 60;
            speed = 2;
            lives = 3;
            obstacles = [];
            particles = [];
            slippers = [];
            player.x = canvas.width / 2;
            player.isJumping = false;
            player.jumpHeight = 0;
            player.invulnerableTimer = 0;
            initBackground();
            
            document.getElementById('menu-overlay').classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => { document.getElementById('menu-overlay').style.display = 'none'; }, 300);
        }

        function gameOver() {
            gameState = 'GAMEOVER';
            const overlay = document.getElementById('menu-overlay');
            overlay.style.display = 'flex';
            setTimeout(() => overlay.classList.remove('opacity-0', 'pointer-events-none'), 10);
            document.getElementById('menu-subtitle').innerHTML = `¡Atrapado por mamá! Puntuación final: <b class="text-amber-400">${Math.floor(score)}</b>`;
            document.getElementById('start-btn').innerText = 'JUGAR DE NUEVO';
        }

        document.getElementById('start-btn').addEventListener('click', startGame);

        function update() {
            if (gameState !== 'PLAYING') return;

            frameCount++;
            score += speed * 0.1;
            speed += 0.001;

            // Topar la velocidad máxima para evitar que sea nauseabundo
            if (speed < 9) { 
                speed += 0.001;
            }

            distance -= 0.03;
            if (distance <= 0) { distance = 0; lives = 0; }
            if (distance > 100) distance = 100;

            if (lives <= 0) {
                gameOver();
                return;
            }

            document.getElementById('score-display').innerText = Math.floor(score);
            document.getElementById('mom-distance-bar').style.width = `${distance}%`;
            document.getElementById('lives-display').innerText = Array(3).fill('').map((_, i) => i < lives ? '❤️ ' : '🖤 ').join('');

            // Player movement & clamp
            if (keys.left) player.vx = -player.speed;
            else if (keys.right) player.vx = player.speed;
            else player.vx = 0;

            player.x += player.vx;
            if (player.x < roadLeftBound) player.x = roadLeftBound;
            if (player.x > roadRightBound) player.x = roadRightBound;

            if (player.isJumping) {
                player.jumpHeight += player.jumpVel;
                player.jumpVel += 0.6;
                if (player.jumpHeight >= 0) {
                    player.jumpHeight = 0;
                    player.isJumping = false;
                    createDust(player.x, player.y + player.height/2);
                }
            }

            if (!player.isJumping && frameCount % 10 === 0) createDust(player.x, player.y + player.height/2);
            if (player.invulnerableTimer > 0) player.invulnerableTimer--;

            // Scroll tile2d Background continuo y natural
            const leftCol = (roadLeftBound - 64) / 64;
            const rightCol = roadRightBound / 64;

            for (let t of bgTiles) {
                t.y += speed;
                
                // Si el tile se sale por la parte de abajo de la pantalla...
                if (t.y > canvas.height) {
                    // Lo teletransportamos matemáticamente hasta la fila más alta
                    t.y -= rows * 64;

                    // Y SOLO a este tile le damos una nueva textura aleatoria
                    let col = Math.round(t.x / 64);
                    
                    if (col >= leftCol && col <= rightCol) {
                        if (col === leftCol || col === rightCol) {
                            // Es un borde
                            t.image = borderVariations[Math.floor(Math.random() * borderVariations.length)];
                        } else {
                            // Es el camino de tierra
                            t.image = imgRoad;
                        }
                    } else {
                        // Es pasto / casas
                        t.image = grassVariations[Math.floor(Math.random() * grassVariations.length)];
                    }
                }
            }

            if (frameCount % Math.max(40, Math.floor(90 - speed * 3)) === 0) spawnObstacle();
            if (frameCount % 250 === 0) spawnSlipper();

            for (let i = obstacles.length - 1; i >= 0; i--) {
                let obs = obstacles[i];
                obs.y += speed;

                const canClearByJump = (obs.type === 'rock' || obs.type === 'puddle');
                const isOverObstacle = player.isJumping && player.jumpHeight < -20;

                if (!obs.passed && obs.y > player.y + player.height) {
                    obs.passed = true;
                    distance = Math.min(100, distance + 3);
                }

                // AABB Collision using tile2d dimensions
                if (
                    player.x + player.width/3 > obs.x &&
                    player.x - player.width/3 < obs.x + obs.width &&
                    player.y + player.height/2 > obs.y &&
                    player.y - player.height/2 < obs.y + obs.height
                ) {
                    if (!(canClearByJump && isOverObstacle) && player.invulnerableTimer === 0) {
                        lives--;
                        distance = Math.max(0, distance - 20);
                        player.invulnerableTimer = 60;
                        createDust(player.x, player.y, '#ef4444');
                        obstacles.splice(i, 1);
                        continue;
                    }
                }

                if (obs.y > canvas.height) obstacles.splice(i, 1);
            }

            for (let i = slippers.length - 1; i >= 0; i--) {
                let s = slippers[i];
                let dx = s.targetX - s.x;
                s.x += dx * 0.05;
                s.y += s.speedY;
                s.angle += 0.2;

                if (Math.abs(player.x - s.x) < 30 && Math.abs(player.y - s.y) < 30 && player.invulnerableTimer === 0) {
                    lives--;
                    distance = Math.max(0, distance - 25);
                    player.invulnerableTimer = 60;
                    slippers.splice(i, 1);
                    continue;
                }

                if (s.y > canvas.height) slippers.splice(i, 1);
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                let p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.03;
                if (p.alpha <= 0) particles.splice(i, 1);
            }
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 1. Draw tile2d Background Grid
            for (let t of bgTiles) {
                t.render(ctx);
            }

            // 2. Draw Particles
            for (let p of particles) {
                ctx.fillStyle = p.color || `rgba(226, 232, 240, ${p.alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            // 3. Draw tile2d Obstacles
            for (let obs of obstacles) {
                obs.render(ctx);
            }

            // 4. Draw Slippers
            for (let s of slippers) {
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.angle);
                // Draw Slipper Sprite
                ctx.drawImage(imgSlipper, -16, -16, 32, 32);
                ctx.restore();
            }

            // 5. Draw Player
            ctx.save();
            ctx.translate(player.x, player.y + player.jumpHeight);

            if (player.invulnerableTimer > 0 && Math.floor(frameCount / 4) % 2 === 0) ctx.globalAlpha = 0.5;

            if (player.isJumping) {
                ctx.save();
                ctx.translate(0, -player.jumpHeight);
                let shadowScale = Math.max(0.4, 1 - Math.abs(player.jumpHeight) / 120);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.beginPath();
                ctx.ellipse(0, player.height/2, 22 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Draw Player Sprite (centered on the translation point)
            ctx.drawImage(imgPlayer, -player.width/2, -player.height/2, player.width, player.height);
            
            ctx.restore();

            // 6. Draw Mom
            if (distance < 60) {
                ctx.save();
                
                // player.y es donde está el muchacho. 
                // Multiplicamos la distancia por un factor (ej. 5) para mandarla abajo de la pantalla
                // Cuando distance es 0, momY será igual a player.y (¡Te atrapó!)
                let momY = player.y + (distance * 5); 
                
                // Hacemos que persiga la posición X del jugador
                ctx.translate(player.x, momY);
                
                // Draw Mom Sprite
                ctx.drawImage(imgMom, -32, -32, 64, 64);
                ctx.restore();
            }
        }

        function gameLoop() {
            update();
            render();
            requestAnimationFrame(gameLoop);
        }

        requestAnimationFrame(gameLoop);