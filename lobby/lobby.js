
const canvas = document.getElementById("lobby");
const ctx = canvas.getContext("2d");

// Cargar las dos imágenes
const mapa = new Image();
mapa.src = '../resources/pueblo.png';

const caminos = new Image();
caminos.src = '../resources/way.png';

const overlay = new Image();
overlay.src = '../resources/overlay.png';

const imagenJugador = new Image();
imagenJugador.src = "../resources/doñaAna.png";

// Canvas auxiliar para leer los colores de la máscara
const canvasCaminos = document.createElement("canvas");
const ctxCaminos = canvasCaminos.getContext("2d", {
  willReadFrequently: true
});

let pixelesCaminos;
let escala = 1;
let offsetX = 0;
let offsetY = 0;

const jugador = {
  x: 0,
  y: 0,
  radio: 12,
  velocidad: 3.5,
  color: "#f2d2a0",
  ancho: 70,
  alto: 100
};

const teclas = {};

const interaction = document.getElementById("interaccion");
const nombreMinijuego = document.getElementById("nombre-minijuego");
const btnJugar = document.getElementById("btn-jugar");

const puertaMinijuegos = {
  x: window.innerWidth / 2 - 20,
  y: window.innerHeight / 2 + 130,
  radio: 20
};

let menuMinijuegosAbierto = false;

// Ajustar el juego al tamaño de la pantalla
function ajustarPantalla() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (mapa.complete && mapa.naturalWidth > 0) {
    calcularMapa();
  }
}

// Mantener las proporciones del mapa
function calcularMapa() {
  escala = Math.min(
    canvas.width / mapa.naturalWidth,
    canvas.height / mapa.naturalHeight
  );

  offsetX = (canvas.width - mapa.naturalWidth * escala) / 2;
  offsetY = (canvas.height - mapa.naturalHeight * escala) / 2;
}

// Preparar la imagen de colisiones
function prepararCaminos() {
  canvasCaminos.width = caminos.naturalWidth;
  canvasCaminos.height = caminos.naturalHeight;

  ctxCaminos.drawImage(caminos, 0, 0);

  pixelesCaminos = ctxCaminos.getImageData(
    0,
    0,
    canvasCaminos.width,
    canvasCaminos.height
  ).data;

  calcularMapa();
  buscarPosicionInicial();
}

// Comprobar si un punto pertenece a un camino negro
function esCamino(x, y) {
  if (!pixelesCaminos) return false;

  // Convertir coordenadas de pantalla a coordenadas de la imagen
  const mx = Math.floor((x - offsetX) / escala);
  const my = Math.floor((y - offsetY) / escala);

  if (
    mx < 0 ||
    my < 0 ||
    mx >= caminos.naturalWidth ||
    my >= caminos.naturalHeight
  ) {
    return false;
  }

  const indice = (my * caminos.naturalWidth + mx) * 4;

  const rojo = pixelesCaminos[indice];
  const verde = pixelesCaminos[indice + 1];
  const azul = pixelesCaminos[indice + 2];

  // Blanco o casi blanco = zona transitable
  return rojo > 200 && verde > 200 && azul > 200;
}

// Revisar varios puntos alrededor del personaje
function puedeMoverse(x, y) {
  const r = jugador.radio - 2;

  const puntos = [
    [x, y],
    [x - r, y],
    [x + r, y],
    [x, y - r],
    [x, y + r],
    [x - r * 0.7, y - r * 0.7],
    [x + r * 0.7, y - r * 0.7],
    [x - r * 0.7, y + r * 0.7],
    [x + r * 0.7, y + r * 0.7]
  ];

  return puntos.every(([px, py]) => esCamino(px, py));
}

// Buscar automáticamente un punto de inicio sobre un camino
function buscarPosicionInicial() {
  const paso = 8;

  for (
    let distancia = 0;
    distancia < Math.max(canvas.width, canvas.height);
    distancia += paso
  ) {
    for (let y = canvas.height / 2 - distancia;
         y <= canvas.height / 2 + distancia;
         y += paso) {

      for (let x = canvas.width / 2 - distancia;
           x <= canvas.width / 2 + distancia;
           x += paso) {

        if (puedeMoverse(x, y)) {
          jugador.x = x;
          jugador.y = y;
          return;
        }
      }
    }
  }

  // Si no encuentra caminos negros, colocar el jugador al centro.
  // Habrá que revisar la máscara si ocurre esto.
  jugador.x = canvas.width / 2;
  jugador.y = canvas.height / 2;
}

// Detectar teclas
window.addEventListener("keydown", (evento) => {
  const tecla = evento.key.toLowerCase();

  if (
    ["arrowup", "arrowdown", "arrowleft", "arrowright",
     "w", "a", "s", "d"].includes(tecla)
  ) {
    evento.preventDefault();
    teclas[tecla] = true;
  }
});

window.addEventListener("keyup", (evento) => {
  teclas[evento.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
  for (const tecla in teclas) {
    teclas[tecla] = false;
  }
});

// Actualizar el movimiento
function actualizar() {
  let dx = 0;
  let dy = 0;

  if (teclas["arrowup"] || teclas["w"]) dy--;
  if (teclas["arrowdown"] || teclas["s"]) dy++;
  if (teclas["arrowleft"] || teclas["a"]) dx--;
  if (teclas["arrowright"] || teclas["d"]) dx++;

  // Evitar que el movimiento diagonal sea más rápido
  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }

  const nuevoX = jugador.x + dx * jugador.velocidad;
  const nuevoY = jugador.y + dy * jugador.velocidad;

  // Comprobar ambos ejes por separado para deslizarse por las paredes
  if (puedeMoverse(nuevoX, jugador.y)) {
    jugador.x = nuevoX;
  }

  if (puedeMoverse(jugador.x, nuevoY)) {
    jugador.y = nuevoY;
  }
}

function revisarPuertaMinijuegos() {
  const distancia = Math.hypot(
    jugador.x - puertaMinijuegos.x,
    jugador.y - puertaMinijuegos.y
  );
  menuMinijuegosAbierto = distancia < puertaMinijuegos.radio;

  if (menuMinijuegosAbierto) {
    interaccion.hidden = false;
    nombreMinijuego.textContent = "¡Elige un minijuego!";
  } else {
    interaccion.hidden = true;
  }
}


 // Dibujar el juego
function dibujar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fondo del juego
  ctx.fillStyle = "#3b2a20";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar el mapa completo
  if (mapa.complete && mapa.naturalWidth > 0) {
    ctx.drawImage(
      mapa,
      offsetX,
      offsetY,
      mapa.naturalWidth * escala,
      mapa.naturalHeight * escala
    );
  }

  // Dibujar al NPC en lugar del círculo
  if (
    imagenJugador.complete &&
    imagenJugador.naturalWidth > 0
  ) {
    ctx.drawImage(
      imagenJugador,
      jugador.x - jugador.ancho / 2,
      jugador.y - jugador.alto / 2,
      jugador.ancho,
      jugador.alto
    );
  }
}


function dibujarOverlay() {
  if (overlay.complete && overlay.naturalWidth > 0) {
    ctx.drawImage(
      overlay,
      offsetX,
      offsetY,
      overlay.naturalWidth * escala,
      overlay.naturalHeight * escala
    );
  }
}

// Ciclo principal
function bucleJuego() {
  if (pixelesCaminos) {
    actualizar();
    revisarPuertaMinijuegos();
  }

  dibujar();
  dibujarOverlay();
  requestAnimationFrame(bucleJuego);
}

// Iniciar cuando ambas imágenes estén listas
Promise.all([
  new Promise((resolve, reject) => {
    mapa.onload = resolve;
    mapa.onerror = () => reject(
      new Error("No se pudo cargar assets/lobby.png")
    );
  }),
  new Promise((resolve, reject) => {
    caminos.onload = resolve;
    caminos.onerror = () => reject(
      new Error("No se pudo cargar assets/caminos.png")
    );
  })
])
  .then(() => {
    ajustarPantalla();
    prepararCaminos();
    bucleJuego();
  })
  .catch((error) => {
    console.error(error);
    alert(
      "No se pudieron cargar las imágenes. Revisa la carpeta assets."
    );
  });

window.addEventListener("resize", () => {
  ajustarPantalla();

  if (pixelesCaminos) {
    buscarPosicionInicial();
  }
});

window.addEventListener("resize", () => {
  ajustarPantalla();

  if (pixelesCaminos) {
    buscarPosicionInicial();
  }
});

btnJugar.addEventListener("click", () => {
  window.location.href = '../minigame-papalote/papalote.html';
});