(() => {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    const context = canvas.getContext('2d');
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const GROUND_HEIGHT = 88;
    const GROUND_Y = HEIGHT - GROUND_HEIGHT;
    const COLLISION_GROUND_Y = GROUND_Y + 40;
    const COLLISION_CEILING_Y = -15;
    const SCROLL_SPEED = 1.8;
    const GRAVITY = 0.05;
    const FLAP_STRENGTH = -2.8;
    const OBSTACLE_INTERVAL = 1500;
    const FRAME_DURATION = 1000 / 60;
    const HOUSE_SIZE = 210;
    const HOUSE_SPACING = 178;
    const HOUSE_Y_OFFSET = 18;
    const ROAD_TILE_WIDTH = 1024;
    const ROAD_TILE_OVERLAP = 3;
    const TRAP_HEIGHT = 64;
    const POST_TOTAL_HEIGHT = 146;
    const TRAP_Y_OFFSET = 45;
    const SCORE_SPEED_START = 5;
    const SCORE_SPEED_STEP = 5;
    const MAX_SCORE_SPEED_BONUS = 0.35;
    const imageSources = {
        playerA: '../resources/papalote.png',
        playerB: '../resources/papalote2.png',
        road: '../resources/road.png',
        bird: '../resources/birdo.png',
        post: '../resources/poste.png',
        lamp: '../resources/headlamp.png',
        trap: '../resources/trap1.png',
        houses: [
            '../resources/casita.png',
            '../resources/casita2.png',
            '../resources/casita3.png',
            '../resources/casita4.png',
            '../resources/casita5.png'
        ]
    };

    const images = {};
    const loadImage = (source) => {
        const image = new Image();
        image.src = source;
        return image;
    };

    Object.entries(imageSources).forEach(([key, source]) => {
        if (Array.isArray(source)) {
            images[key] = source.map(loadImage);
        } else {
            images[key] = loadImage(source);
        }
    });

    const randomBetween = (minimum, maximum) =>
        minimum + Math.random() * (maximum - minimum);

    const drawImageCover = (image, x, y, width, height) => {
        if (image && image.complete && image.naturalWidth > 0) {
            context.drawImage(image, x, y, width, height);
        }
    };

    class Player {
        constructor() {
            this.width = 32;
            this.height = 32;
            this.x = 130;
            this.y = HEIGHT / 2 - this.height / 2;
            this.velocity = 0;
            this.animationFrame = 0;
            this.hitboxPadding = 5;
        }

        flap() {
            this.velocity = FLAP_STRENGTH;
        }

        update() {
            this.velocity += GRAVITY;
            this.y += this.velocity;
            this.animationFrame += 1;
        }

        draw() {
            const frame = Math.floor(this.animationFrame / 14) % 2;
            const image = frame === 0 ? images.playerA : images.playerB;
            drawImageCover(image, this.x, this.y, this.width, this.height);
        }

        getBounds() {
            return {
                left: this.x + this.hitboxPadding,
                right: this.x + this.width - this.hitboxPadding,
                top: this.y + this.hitboxPadding,
                bottom: this.y + this.height - this.hitboxPadding
            };
        }

        reset() {
            this.y = HEIGHT / 2 - this.height / 2;
            this.velocity = 0;
            this.animationFrame = 0;
        }
    }

    class Obstacle {
        constructor(type, x) {
            this.type = type;
            this.x = x;
            this.passed = false;
            this.width = type === 'bird' ? 44 : type === 'trap' ? 122 : 36;
            this.height = type === 'bird' ? 44 : type === 'trap' ? TRAP_HEIGHT : POST_TOTAL_HEIGHT;
            this.setPosition();
        }

        setPosition() {
            if (this.type === 'bird') {
                this.y = randomBetween(90, GROUND_Y - 180);
            } else if (this.type === 'trap') {
                this.y = GROUND_Y - HOUSE_SIZE + TRAP_Y_OFFSET + randomBetween(-3, 3);
            } else {
                this.y = GROUND_Y - this.height;
            }
        }

        update() {
            this.x -= this.scrollSpeed;
        }

        draw() {
            if (this.type === 'bird') {
                drawImageCover(images.bird, this.x, this.y, this.width, this.height);
            } else if (this.type === 'trap') {
                drawImageCover(images.trap, this.x, this.y, this.width, this.height);
            } else {
                for (let segment = 0; segment < 8; segment += 1) {
                    drawImageCover(images.post, this.x, this.y + 18 + segment * 16, this.width, 16);
                }
                drawImageCover(images.lamp, this.x + 9, this.y, 18, 18);
            }
        }

        getBounds() {
            const margin = this.type === 'trap' ? 7 : 3;
            return {
                left: this.x + margin,
                right: this.x + this.width - margin,
                top: this.y + margin,
                bottom: this.y + this.height - margin
            };
        }

        isOffscreen() {
            return this.x + this.width < 0;
        }
    }

    class Background {
        constructor() {
            this.roadOffset = 0;
            this.houseOffset = 0;
        }

        update(scrollSpeed) {
            this.roadOffset = (this.roadOffset - scrollSpeed * 0.6 + ROAD_TILE_WIDTH) % ROAD_TILE_WIDTH;
            this.houseOffset -= scrollSpeed * 0.6;
        }

        draw() {
            const skyGradient = context.createLinearGradient(0, 0, 0, HEIGHT);
            skyGradient.addColorStop(0, '#70c9ef');
            skyGradient.addColorStop(1, '#d8f2fa');
            context.fillStyle = skyGradient;
            context.fillRect(0, 0, WIDTH, HEIGHT);

            for (let x = this.roadOffset - ROAD_TILE_WIDTH; x <= WIDTH; x += ROAD_TILE_WIDTH) {
                drawImageCover(images.road, x, 0, ROAD_TILE_WIDTH + ROAD_TILE_OVERLAP, HEIGHT);
            }

            const houseImages = images.houses;
            const firstHouse = Math.floor((-this.houseOffset - HOUSE_SIZE) / HOUSE_SPACING) - 1;
            const lastHouse = Math.ceil((WIDTH - this.houseOffset) / HOUSE_SPACING) + 1;
            for (let index = firstHouse; index <= lastHouse; index += 1) {
                const x = this.houseOffset + index * HOUSE_SPACING;
                const randomValue = Math.abs(Math.sin(index * 12.9898) * 43758.5453) % 1;
                const imageIndex = Math.floor(randomValue * houseImages.length);
                drawImageCover(
                    houseImages[imageIndex],
                    x,
                    GROUND_Y - HOUSE_SIZE + HOUSE_Y_OFFSET,
                    HOUSE_SIZE,
                    HOUSE_SIZE
                );
            }

        }
    }

    class Game {
        constructor() {
            this.player = new Player();
            this.background = new Background();
            this.obstacles = [];
            this.score = 0;
            this.state = 'ready';
            this.lastObstacleTime = 0;
            this.lastTimestamp = 0;
            this.elapsedSinceScore = 0;
            this.scrollSpeed = SCROLL_SPEED;
            this.bindControls();
            requestAnimationFrame((timestamp) => this.loop(timestamp));
        }

        bindControls() {
            const action = (event) => {
                if (event.type === 'keydown' && event.code !== 'Space') {
                    return;
                }
                event.preventDefault();
                if (this.state === 'gameover') {
                    this.reset();
                    return;
                }
                if (this.state === 'ready') {
                    this.state = 'playing';
                }
                this.player.flap();
            };

            canvas.addEventListener('pointerdown', action);
            window.addEventListener('keydown', action);
        }

        reset() {
            this.player.reset();
            this.background = new Background();
            this.obstacles = [];
            this.score = 0;
            this.state = 'playing';
            this.lastObstacleTime = 0;
            this.elapsedSinceScore = 0;
            this.scrollSpeed = SCROLL_SPEED;
            this.player.flap();
        }

        createObstacle(timestamp) {
            if (timestamp - this.lastObstacleTime < OBSTACLE_INTERVAL) {
                return;
            }
            const types = ['bird', 'bird', 'ground', 'trap'];
            const type = types[Math.floor(Math.random() * types.length)];
            const firstObstacle = new Obstacle(type, WIDTH + 20);
            firstObstacle.scrollSpeed = this.scrollSpeed;
            this.obstacles.push(firstObstacle);
            if (type === 'bird' && Math.random() < 0.7) {
                const secondBird = new Obstacle('bird', WIDTH + 110);
                secondBird.y = Math.max(70, Math.min(GROUND_Y - 100, firstObstacle.y + randomBetween(-72, 72)));
                secondBird.scrollSpeed = this.scrollSpeed;
                this.obstacles.push(secondBird);
            }
            this.lastObstacleTime = timestamp;
        }

        update(timestamp, deltaTime) {
            if (this.state !== 'playing') {
                return;
            }
            this.scrollSpeed = SCROLL_SPEED + Math.min(
                Math.max(this.score - SCORE_SPEED_START + 1, 0) / SCORE_SPEED_STEP * 0.05,
                MAX_SCORE_SPEED_BONUS
            );
            this.background.update(this.scrollSpeed);
            this.player.update();
            this.createObstacle(timestamp);

            this.obstacles.forEach((obstacle) => {
                obstacle.scrollSpeed = this.scrollSpeed;
                obstacle.update();
            });
            this.obstacles = this.obstacles.filter((obstacle) => {
                if (!obstacle.passed && obstacle.x + obstacle.width < this.player.x) {
                    obstacle.passed = true;
                    this.score += 1;
                }
                return !obstacle.isOffscreen();
            });

            this.elapsedSinceScore += deltaTime;
            if (this.elapsedSinceScore >= 1000) {
                this.score += Math.floor(this.elapsedSinceScore / 1000);
                this.elapsedSinceScore %= 1000;
            }

            if (this.player.y < COLLISION_CEILING_Y ||
                this.player.y + this.player.height > COLLISION_GROUND_Y ||
                this.obstacles.some((obstacle) => this.intersects(this.player.getBounds(), obstacle.getBounds()))) {
                this.state = 'gameover';
            }
        }

        intersects(first, second) {
            return first.left < second.right &&
                first.right > second.left &&
                first.top < second.bottom &&
                first.bottom > second.top;
        }

        draw() {
            this.background.draw();
            this.obstacles.forEach((obstacle) => obstacle.draw());
            this.player.draw();
            this.drawScore();
            if (this.state === 'ready') {
                this.drawMessage('PAPALOTE', 'Haz clic o presiona ESPACIO para comenzar');
            } else if (this.state === 'gameover') {
                this.drawMessage('¡GAME OVER!', 'Haz clic o presiona ESPACIO para reiniciar');
            }
        }

        drawScore() {
            context.fillStyle = 'rgb(12 35 66 / 75%)';
            context.fillRect(18, 18, 130, 48);
            context.fillStyle = '#fff';
            context.font = 'bold 24px Arial';
            context.fillText(`Puntos: ${this.score}`, 30, 49);
        }

        drawMessage(title, subtitle) {
            context.fillStyle = 'rgb(10 31 58 / 78%)';
            context.fillRect(100, 190, WIDTH - 200, 150);
            context.textAlign = 'center';
            context.fillStyle = '#fff';
            context.font = 'bold 42px Arial';
            context.fillText(title, WIDTH / 2, 250);
            context.font = '18px Arial';
            context.fillText(subtitle, WIDTH / 2, 290);
            context.textAlign = 'start';
        }

        loop(timestamp) {
            const deltaTime = this.lastTimestamp === 0
                ? FRAME_DURATION
                : Math.min(timestamp - this.lastTimestamp, 50);
            this.lastTimestamp = timestamp;
            this.update(timestamp, deltaTime);
            this.draw();
            requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
        }
    }

    new Game();
})();
