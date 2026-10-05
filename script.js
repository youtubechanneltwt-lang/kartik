import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import {
  PointerLockControls
} from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

// ===============================
// BASIC SETUP
// ===============================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x87ceeb);

scene.fog = new THREE.Fog(0x87ceeb, 20, 90);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.shadowMap.enabled = true;

document.body.appendChild(renderer.domElement);


// ===============================
// LIGHTING
// ===============================

const ambientLight = new THREE.HemisphereLight(
  0xffffff,
  0x555555,
  1.5
);

scene.add(ambientLight);

const sun = new THREE.DirectionalLight(
  0xffffff,
  2
);

sun.position.set(30, 50, 20);

sun.castShadow = true;

scene.add(sun);


// ===============================
// CONTROLS
// ===============================

const controls = new PointerLockControls(
  camera,
  document.body
);

const startButton = document.getElementById("startButton");
const startScreen = document.getElementById("startScreen");

startButton.addEventListener("click", () => {
  controls.lock();
});

controls.addEventListener("lock", () => {
  startScreen.style.display = "none";
});

controls.addEventListener("unlock", () => {
  startScreen.style.display = "flex";
});


// ===============================
// BLOCK MATERIALS
// ===============================

const materials = {

  grass: new THREE.MeshLambertMaterial({
    color: 0x45a832
  }),

  dirt: new THREE.MeshLambertMaterial({
    color: 0x8b5a2b
  }),

  stone: new THREE.MeshLambertMaterial({
    color: 0x888888
  }),

  wood: new THREE.MeshLambertMaterial({
    color: 0x9b632f
  }),

  sand: new THREE.MeshLambertMaterial({
    color: 0xe6d27a
  }),

  leaves: new THREE.MeshLambertMaterial({
    color: 0x238b23
  })
};


// ===============================
// BLOCK SYSTEM
// ===============================

const blockGeometry = new THREE.BoxGeometry(
  1,
  1,
  1
);

const blocks = [];

function createBlock(x, y, z, type = "grass") {

  const block = new THREE.Mesh(
    blockGeometry,
    materials[type]
  );

  block.position.set(x, y, z);

  block.castShadow = true;
  block.receiveShadow = true;

  block.userData.type = type;

  scene.add(block);

  blocks.push(block);

  return block;
}


// ===============================
// WORLD GENERATION
// ===============================

const WORLD_SIZE = 30;

for (let x = -WORLD_SIZE; x <= WORLD_SIZE; x++) {

  for (let z = -WORLD_SIZE; z <= WORLD_SIZE; z++) {

    // Simple terrain height
    const height =
      Math.floor(
        2 +
        Math.sin(x * 0.25) * 1 +
        Math.cos(z * 0.25) * 1
      );

    for (let y = 0; y <= height; y++) {

      let type = "dirt";

      if (y === height) {
        type = "grass";
      }

      if (y === 0) {
        type = "stone";
      }

      createBlock(x, y, z, type);
    }
  }
}


// ===============================
// TREES
// ===============================

function createTree(x, y, z) {

  // Trunk
  for (let i = 0; i < 4; i++) {
    createBlock(x, y + i, z, "wood");
  }

  // Leaves
  for (let lx = -2; lx <= 2; lx++) {

    for (let lz = -2; lz <= 2; lz++) {

      for (let ly = 2; ly <= 4; ly++) {

        if (
          Math.abs(lx) +
          Math.abs(lz) < 4
        ) {

          createBlock(
            x + lx,
            y + ly,
            z + lz,
            "leaves"
          );
        }
      }
    }
  }
}


// Random trees

for (let i = 0; i < 25; i++) {

  const x =
    Math.floor(Math.random() * 45) - 22;

  const z =
    Math.floor(Math.random() * 45) - 22;

  createTree(x, 3, z);
}


// ===============================
// PLAYER
// ===============================

camera.position.set(
  0,
  5,
  8
);

const velocity = new THREE.Vector3();

const direction = new THREE.Vector3();

const keys = {};

let canJump = false;

document.addEventListener("keydown", (event) => {

  keys[event.code] = true;

  if (
    event.code === "Space" &&
    canJump
  ) {

    velocity.y = 9;

    canJump = false;
  }

  // Block selection
  if (
    event.key >= "1" &&
    event.key <= "5"
  ) {

    selectBlock(
      Number(event.key) - 1
    );
  }
});

document.addEventListener("keyup", (event) => {

  keys[event.code] = false;

});


// ===============================
// HOTBAR
// ===============================

const blockTypes = [
  "grass",
  "dirt",
  "stone",
  "wood",
  "sand"
];

let selectedBlock = "grass";

const slots =
  document.querySelectorAll(".slot");

function selectBlock(index) {

  selectedBlock = blockTypes[index];

  slots.forEach(
    slot => slot.classList.remove("selected")
  );

  slots[index].classList.add("selected");
}

slots.forEach((slot, index) => {

  slot.addEventListener("click", () => {

    selectBlock(index);

  });

});


// ===============================
// BREAK / PLACE BLOCK
// ===============================

const raycaster = new THREE.Raycaster();

document.addEventListener(
  "mousedown",
  (event) => {

    if (!controls.isLocked) return;

    raycaster.setFromCamera(
      new THREE.Vector2(0, 0),
      camera
    );

    const hits =
      raycaster.intersectObjects(blocks);

    if (hits.length === 0) return;

    const hit = hits[0];

    // LEFT CLICK = BREAK
    if (event.button === 0) {

      const block = hit.object;

      scene.remove(block);

      const index =
        blocks.indexOf(block);

      if (index !== -1) {
        blocks.splice(index, 1);
      }
    }

    // RIGHT CLICK = PLACE
    if (event.button === 2) {

      const normal =
        hit.face.normal.clone();

      normal.transformDirection(
        hit.object.matrixWorld
      );

      const position =
        hit.object.position.clone()
          .add(normal);

      createBlock(
        Math.round(position.x),
        Math.round(position.y),
        Math.round(position.z),
        selectedBlock
      );
    }
  }
);


// Disable context menu

document.addEventListener(
  "contextmenu",
  event => event.preventDefault()
);


// ===============================
// MOVEMENT
// ===============================

const clock = new THREE.Clock();

function updatePlayer(delta) {

  if (!controls.isLocked) return;

  const speed = 8;

  direction.set(0, 0, 0);

  if (keys["KeyW"]) {
    direction.z -= 1;
  }

  if (keys["KeyS"]) {
    direction.z += 1;
  }

  if (keys["KeyA"]) {
    direction.x -= 1;
  }

  if (keys["KeyD"]) {
    direction.x += 1;
  }

  direction.normalize();

  if (direction.length() > 0) {

    controls.moveRight(
      direction.x * speed * delta
    );

    controls.moveForward(
      -direction.z * speed * delta
    );
  }

  // Gravity

  velocity.y -= 20 * delta;

  camera.position.y +=
    velocity.y * delta;

  // Ground

  if (camera.position.y < 4) {

    camera.position.y = 4;

    velocity.y = 0;

    canJump = true;
  }
}


// ===============================
// GAME LOOP
// ===============================

function animate() {

  requestAnimationFrame(animate);

  const delta =
    Math.min(clock.getDelta(), 0.05);

  updatePlayer(delta);

  renderer.render(
    scene,
    camera
  );
}

animate();


// ===============================
// RESIZE
// ===============================

window.addEventListener(
  "resize",
  () => {

    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  }
);
