const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const speedSlider = document.getElementById('speed-slider');
const pointsSlider = document.getElementById('points-slider');
const speedVal = document.getElementById('speed-val');
const pointsVal = document.getElementById('points-val');
const infoPanel = document.getElementById('info-panel');
const infoCoords = document.getElementById('info-coords');
const unfollowBtn = document.getElementById('unfollow-btn');

let width, height;
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const sigma = 10;
const rho = 28;
const beta = 8 / 3;
const baseDt = 0.005;

let camera = { targetX: 0, targetY: 0, targetZ: 0, rotX: 0.3, rotY: 0, distance: 80 };
let camPos = { x: 0, y: 0, z: 0 };
let camYaw = 0;
let camPitch = 0;

let isDragging = false;
let dragMode = null; 
let previousMousePosition = { x: 0, y: 0 };
let totalDelta = 0;
let previousPinchDistance = null;

let trackedParticle = null;
let povMode = false;

// Evitar menú contextual al usar clic derecho
canvas.addEventListener('contextmenu', e => e.preventDefault());

const colors = [
  '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff',
  '#ff8844', '#88ff44', '#8844ff', '#ff4488', '#4488ff', '#44ff88'
];

class Particle {
  constructor(x, y, z, id) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.id = id;
    this.color = colors[id % colors.length];
    this.history = [];
    this.maxLength = 250;
  }

  update(dt) {
    const dx = (sigma * (this.y - this.x)) * dt;
    const dy = (this.x * (rho - this.z) - this.y) * dt;
    const dz = (this.x * this.y - beta * this.z) * dt;

    this.x += dx;
    this.y += dy;
    this.z += dz;

    this.history.push({ x: this.x, y: this.y, z: this.z });
    if (this.history.length > this.maxLength) {
      this.history.shift();
    }
  }

  draw(ctx) {
    if (this.history.length < 2) return;

    ctx.beginPath();
    let started = false;
    for (let i = 0; i < this.history.length; i++) {
      let p = this.history[i];
      let proj = projectPoint(p.x, p.z - 25, p.y);
      if (proj) {
        if (!started) {
          ctx.moveTo(proj.x, proj.y);
          started = true;
        } else {
          ctx.lineTo(proj.x, proj.y);
        }
      } else {
        started = false;
      }
    }
    
    if (started) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7; 
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Dibujar la cabeza (la partícula en sí)
    let head = this.history[this.history.length - 1];
    let proj = projectPoint(head.x, head.z - 25, head.y);
    if (proj) {
      // Escala de perspectiva para el tamaño
      let size = (120 / proj.z); 
      if (size > 15) size = 15;
      if (size < 1) size = 1;
      
      let isTracked = (trackedParticle === this);
      if (isTracked) size *= 1.5;

      ctx.beginPath();
      ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }
}

let particles = [];
function generateParticles(count) {
  const newParticles = [];
  for (let i = 0; i < count; i++) {
    newParticles.push(new Particle(0.1 + i * 0.0001, 0, 0, i));
  }
  for(let i = 0; i < Math.min(particles.length, count); i++) {
    newParticles[i] = particles[i];
  }
  particles = newParticles;
  if(trackedParticle && !particles.includes(trackedParticle)) {
    unfollow();
  }
}

generateParticles(parseInt(pointsSlider.value));

pointsSlider.addEventListener('input', (e) => {
  const count = parseInt(e.target.value);
  pointsVal.innerText = count;
  generateParticles(count);
});

let speedMultiplier = 1;
speedSlider.addEventListener('input', (e) => {
  speedMultiplier = parseFloat(e.target.value);
  speedVal.innerText = speedMultiplier.toFixed(1) + 'x';
});

function getEventPos(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.offsetX, y: e.offsetY };
}

function pointerDown(e) {
  if (e.target !== canvas) return;
  
  if (e.touches) {
    if (e.touches.length === 1) {
      dragMode = 'rotate';
    } else if (e.touches.length >= 2) {
      dragMode = 'pan';
      let dx = e.touches[0].clientX - e.touches[1].clientX;
      let dy = e.touches[0].clientY - e.touches[1].clientY;
      previousPinchDistance = Math.hypot(dx, dy);
    }
    previousMousePosition = getEventPos(e);
  } else {
    if (e.button === 0) dragMode = 'pan';       // Left click -> Pan
    else if (e.button === 2) dragMode = 'rotate'; // Right click -> Rotate
    else return;
    previousMousePosition = { x: e.offsetX, y: e.offsetY };
  }
  
  isDragging = true;
  totalDelta = 0;
}

function pointerMove(e) {
  if (!isDragging) return;

  if (e.touches && e.touches.length >= 2) {
    let dx = e.touches[0].clientX - e.touches[1].clientX;
    let dy = e.touches[0].clientY - e.touches[1].clientY;
    let pinchDistance = Math.hypot(dx, dy);
    if (previousPinchDistance) {
      camera.distance -= (pinchDistance - previousPinchDistance) * 0.5;
      if (camera.distance < 10) camera.distance = 10;
      if (camera.distance > 300) camera.distance = 300;
    }
    previousPinchDistance = pinchDistance;
  }

  const pos = getEventPos(e);
  const deltaX = pos.x - previousMousePosition.x;
  const deltaY = pos.y - previousMousePosition.y;
  
  totalDelta += Math.abs(deltaX) + Math.abs(deltaY);

  if (dragMode === 'rotate') {
    camera.rotY -= deltaX * 0.005;
    camera.rotX += deltaY * 0.005;
    if (camera.rotX > 1.5) camera.rotX = 1.5;
    if (camera.rotX < -1.5) camera.rotX = -1.5;
  } else if (dragMode === 'pan') {
    if (povMode) unfollow(); // Desvincular al arrastrar la cámara
    let panSpeed = camera.distance * 0.0015;
    let rightX = Math.cos(camera.rotY);
    let rightZ = -Math.sin(camera.rotY);
    
    camera.targetX -= rightX * deltaX * panSpeed;
    camera.targetZ -= rightZ * deltaX * panSpeed;
    camera.targetY += deltaY * panSpeed;
  }
  
  previousMousePosition = pos;
}

function pointerUp(e) {
  if (!isDragging) return;
  isDragging = false;
  
  // Click detection only on left click / single touch
  let isClick = false;
  if (e.changedTouches && e.changedTouches.length === 1) isClick = true;
  if (e.button === 0) isClick = true;

  if (totalDelta < 15 && isClick) {
    const pos = e.changedTouches ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY } : { x: e.offsetX, y: e.offsetY };
    handleClick(pos.x, pos.y);
  }
}

canvas.addEventListener('mousedown', pointerDown);
window.addEventListener('mousemove', pointerMove);
window.addEventListener('mouseup', pointerUp);

canvas.addEventListener('touchstart', pointerDown);
window.addEventListener('touchmove', pointerMove, {passive: true});
window.addEventListener('touchend', pointerUp);

canvas.addEventListener('wheel', (e) => {
  camera.distance += e.deltaY * 0.05;
  if (camera.distance < 10) camera.distance = 10;
  if (camera.distance > 300) camera.distance = 300;
});

function updateCamera() {
  if (povMode && trackedParticle && trackedParticle.history.length > 0) {
    let head = trackedParticle.history[trackedParticle.history.length - 1];
    camera.targetX = head.x;
    camera.targetY = head.z - 25;
    camera.targetZ = head.y;
  }

  camYaw = camera.rotY;
  camPitch = camera.rotX;
  
  camPos.x = camera.targetX - Math.sin(camYaw) * Math.cos(camPitch) * camera.distance;
  camPos.y = camera.targetY + Math.sin(camPitch) * camera.distance;
  camPos.z = camera.targetZ - Math.cos(camYaw) * Math.cos(camPitch) * camera.distance;
}

function projectPoint(x, y, z) {
  let tx = x - camPos.x;
  let ty = y - camPos.y;
  let tz = z - camPos.z;

  let cy = Math.cos(-camYaw);
  let sy = Math.sin(-camYaw);
  let rx = tx * cy - tz * sy;
  let rz = tx * sy + tz * cy;

  let cx = Math.cos(-camPitch);
  let sx = Math.sin(-camPitch);
  let ry = ty * cx - rz * sx;
  rz = ty * sx + rz * cx;

  if (rz < 0.1) return null; // Detrás de la cámara

  let fov = width * 0.8; 
  return {
    x: width / 2 + (rx / rz) * fov,
    y: height / 2 - (ry / rz) * fov, // Invertimos Y para que cuadre con la pantalla
    z: rz
  };
}

function handleClick(mouseX, mouseY) {
  let minDist = 40; 
  let found = null;

  for (let p of particles) {
    if (p.history.length === 0) continue;
    let head = p.history[p.history.length - 1];
    let proj = projectPoint(head.x, head.z - 25, head.y);
    if (!proj) continue;

    const dist = Math.hypot(mouseX - proj.x, mouseY - proj.y);
    if (dist < minDist) {
      minDist = dist;
      found = p;
    }
  }

  if (found) {
    trackedParticle = found;
    povMode = true;
    infoPanel.classList.add('visible');
  }
}

function unfollow() {
  trackedParticle = null;
  povMode = false;
  infoPanel.classList.remove('visible');
}
unfollowBtn.addEventListener('click', unfollow);

function animate() {
  ctx.fillStyle = '#000000'; 
  ctx.fillRect(0, 0, width, height);

  const dt = baseDt * speedMultiplier;
  
  particles.forEach(p => p.update(dt));

  updateCamera();

  if (trackedParticle) {
    infoCoords.innerText = `X: ${trackedParticle.x.toFixed(2)} | Y: ${trackedParticle.y.toFixed(2)} | Z: ${trackedParticle.z.toFixed(2)}`;
  }

  particles.forEach(p => p.draw(ctx));

  requestAnimationFrame(animate);
}

animate();
