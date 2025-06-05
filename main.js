import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Basic 3D Car Game Starter with Three.js
let scene, camera, renderer, car;
let carMoving = true; // Flag to control car movement
let carDirection = -Math.PI / 2; // Car faces forward (negative Z)
console.log('Car Direction:', carDirection); // Log initial direction
const turnStep = Math.PI / 36; // 5 degrees per key press
const carSpeed = 0.03; // Forward speed
let obstacles = []; // Store obstacle boxes
const roadWidth = 8; // Increased broadness
const roadLength = 80; // Moved roadLength here for global access
let gameOverDiv; // Declare at top for global access

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222233);

    // Remove HDRI environment/background
    // (No RGBELoader or scene.environment/background assignment)

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 5, roadLength / 2 + 5); // Behind the starting point
    camera.lookAt(0, 0, roadLength / 2);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // --- Mobile Arrow Buttons ---
    // Create left arrow button
    const leftBtn = document.createElement('button');
    leftBtn.id = 'left-arrow-btn';
    leftBtn.innerHTML = '⟵';
    leftBtn.className = 'arrow-btn';
    document.body.appendChild(leftBtn);

    // Create right arrow button
    const rightBtn = document.createElement('button');
    rightBtn.id = 'right-arrow-btn';
    rightBtn.innerHTML = '⟶';
    rightBtn.className = 'arrow-btn';
    document.body.appendChild(rightBtn);

    // Show/hide buttons based on screen size
    function updateArrowButtonsVisibility() {
        const isMobile = window.innerWidth <= 800;
        leftBtn.style.display = isMobile ? 'block' : 'none';
        rightBtn.style.display = isMobile ? 'block' : 'none';
    }
    updateArrowButtonsVisibility();
    window.addEventListener('resize', updateArrowButtonsVisibility);

    // Touch feedback for buttons
    function addTouchFeedback(btn) {
        btn.addEventListener('touchstart', () => {
            btn.style.background = '#666';
            btn.style.color = '#fff';
        });
        btn.addEventListener('touchend', () => {
            btn.style.background = '';
            btn.style.color = '';
        });
        btn.addEventListener('touchcancel', () => {
            btn.style.background = '';
            btn.style.color = '';
        });
    }
    addTouchFeedback(leftBtn);
    addTouchFeedback(rightBtn);

    // Arrow button actions
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        carDirection -= turnStep;
    });
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        carDirection += turnStep;
    });

    // Lighting
    // Add a bright directional sunlight
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(10, 30, 20);
    sunLight.castShadow = false;
    scene.add(sunLight);

    // Add a subtle ambient light for soft shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Add ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xe4d096 }); // Sand color
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Add road (a broad, long rectangle)
    const roadGeometry = new THREE.BoxGeometry(roadWidth, 0.1, roadLength);
    const roadMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.position.y = 0.06; // slightly above ground
    scene.add(road);

    // Add dotted center line
    const lineCount = 20;
    const lineLength = 2;
    const lineWidth = 0.2;
    const lineHeight = 0.05;
    for (let i = 0; i < lineCount; i++) {
        const lineGeometry = new THREE.BoxGeometry(lineWidth, lineHeight, lineLength);
        const lineMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(0, 0.11, -roadLength/2 + (i + 0.5) * (roadLength / lineCount));
        scene.add(line);
    }

    // Load car model from GLB file
    const loader = new GLTFLoader();
    loader.load('/LowPolyCars-v2.glb', function(gltf) {
        car = gltf.scene;
        car.position.set(-2, 0.18, roadLength / 2 - 2); // Lift car slightly above the road
        car.scale.set(1, 1, 1); // Adjust scale if needed
        car.rotation.y = -Math.PI / 2; // Rotate 90 degrees right
        scene.add(car);
        // Optionally, log to confirm model loaded
        console.log('Car model loaded:', car);
    }, function(xhr) {
        // Progress callback
        console.log('Car model loading: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    }, function(error) {
        console.error('Error loading car model:', error);
    });

    // Add boxes on either side of the road
    const boxCount = 10;
    const boxSpacing = 8; // space between boxes along the road
    const boxOffset = roadWidth / 2 + 1.2; // distance from road center to box center
    for (let i = 0; i < boxCount; i++) {
        // Left side
        const leftBoxGeometry = new THREE.BoxGeometry(2, 0.4, 8);
        const leftBoxMaterial = new THREE.MeshPhongMaterial({ color: 0xff9933 });
        const leftBox = new THREE.Mesh(leftBoxGeometry, leftBoxMaterial);
        leftBox.position.set(-boxOffset, 0.5, -roadLength/2 + (i + 0.5) * (roadLength / boxCount));
        scene.add(leftBox);
        obstacles.push(leftBox); // Add to obstacles
        // Right side
        const rightBoxGeometry = new THREE.BoxGeometry(2, 0.4, 8);
        const rightBoxMaterial = new THREE.MeshPhongMaterial({ color: 0xff9933 });
        const rightBox = new THREE.Mesh(rightBoxGeometry, rightBoxMaterial);
        rightBox.position.set(boxOffset, 0.5, -roadLength/2 + (i + 0.5) * (roadLength / boxCount));
        scene.add(rightBox);
        obstacles.push(rightBox); // Add to obstacles
    }

    // Add a wall obstacle in the left lane a short distance after the start
    const wallGeometry = new THREE.BoxGeometry(4, 2, 0.5); // Wide and tall wall
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0xee0000 }); // Bright red
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(-1, 0.5, 25); // Left lane, a few units after start
    scene.add(wall);
    obstacles.push(wall); // Add to obstacles

    // Add a wall obstacle in the right lane at z = 10
    const wall2 = new THREE.Mesh(wallGeometry.clone(), wallMaterial.clone());
    wall2.position.set(2, 0.5, 16); // Right lane, z = 10
    scene.add(wall2);
    obstacles.push(wall2); // Add to obstacles

    // Add two more walls even closer
    const wall3 = new THREE.Mesh(wallGeometry.clone(), wallMaterial.clone());
    wall3.position.set(-1, 0.5, 7); // Left lane, closer to start
    scene.add(wall3);
    obstacles.push(wall3);

    const wall4 = new THREE.Mesh(wallGeometry.clone(), wallMaterial.clone());
    wall4.position.set(2, 0.5, 2); // Right lane, very close to start
    scene.add(wall4);
    obstacles.push(wall4);

    // Place finish line just after the last wall (wall4)
    const finishLineWidth = roadWidth;
    const finishLineHeight = 0.15;
    const finishLineDepth = 0.5;
    const finishLineGeometry = new THREE.BoxGeometry(finishLineWidth, finishLineHeight, finishLineDepth);
    const finishLineMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
    finishLine.position.set(0, 0.13, -2);
    scene.add(finishLine);

    // Add game over message element
    gameOverDiv = document.createElement('div');
    gameOverDiv.id = 'game-over';
    gameOverDiv.textContent = 'GAME OVER';
    document.body.appendChild(gameOverDiv);

    // Add YOU WIN message element
    const youWinDiv = document.createElement('div');
    youWinDiv.id = 'you-win';
    youWinDiv.textContent = 'YOU WIN';
    document.body.appendChild(youWinDiv);

    // Add Start New Game button
    const startBtn = document.createElement('button');
    startBtn.id = 'start-btn';
    startBtn.textContent = 'Start New Game';
    // Only set dynamic styles here, move static styles to style.css
    startBtn.style.position = 'fixed';
    startBtn.style.top = '65%';
    startBtn.style.left = '50%';
    startBtn.style.transform = 'translate(-50%, -50%)';
    startBtn.style.zIndex = '20';
    document.body.appendChild(startBtn);

    carMoving = false; // Car does not move until start is pressed

    startBtn.addEventListener('click', () => {
        carMoving = true;
        startBtn.style.display = 'none';
        // Hide win/lose messages if restarting
        const winDiv = document.getElementById('you-win');
        if (winDiv) winDiv.style.display = 'none';
        if (gameOverDiv) gameOverDiv.style.display = 'none';
        // Optionally reset car position and direction
        if (car) {
            car.position.set(-2, 0.18, roadLength / 2 - 2); // Lift car on reset too
            carDirection = -Math.PI / 2;
            car.rotation.y = -Math.PI / 2;
        }
    });

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown, false);

    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    if (!car) return;
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
            carDirection -= turnStep; // Turn left
            break;
        case 'ArrowRight':
        case 'd':
            carDirection += turnStep; // Turn right
            break;
    }
}

// --- OBB utility from three.js examples ---
// Minimal OBB class for collision detection
class OBB {
    constructor(center = new THREE.Vector3(), halfSize = new THREE.Vector3(), rotation = new THREE.Matrix3()) {
        this.center = center.clone();
        this.halfSize = halfSize.clone();
        this.rotation = rotation.clone();
    }
    set(center, halfSize, rotation) {
        this.center.copy(center);
        this.halfSize.copy(halfSize);
        this.rotation.copy(rotation);
        return this;
    }
    copy(obb) {
        this.center.copy(obb.center);
        this.halfSize.copy(obb.halfSize);
        this.rotation.copy(obb.rotation);
        return this;
    }
    // OBB vs AABB (Box3) intersection
    intersectsBox3(box3) {
        // Convert Box3 to OBB (axis-aligned)
        const boxCenter = box3.getCenter(new THREE.Vector3());
        const boxHalfSize = box3.getSize(new THREE.Vector3()).multiplyScalar(0.5);
        const boxRotation = new THREE.Matrix3(); // identity
        const obbB = new OBB(boxCenter, boxHalfSize, boxRotation);
        return OBB.intersectsOBB(this, obbB);
    }
    // OBB vs OBB intersection (SAT)
    static intersectsOBB(a, b) {
        // Based on three-mesh-bvh OBB implementation
        const EPSILON = 1e-3;
        const aAxes = [
            new THREE.Vector3().fromArray(a.rotation.elements, 0),
            new THREE.Vector3().fromArray(a.rotation.elements, 3),
            new THREE.Vector3().fromArray(a.rotation.elements, 6)
        ];
        const bAxes = [
            new THREE.Vector3().fromArray(b.rotation.elements, 0),
            new THREE.Vector3().fromArray(b.rotation.elements, 3),
            new THREE.Vector3().fromArray(b.rotation.elements, 6)
        ];
        // Compute rotation matrix expressing b in a's frame
        const R = [];
        const AbsR = [];
        for (let i = 0; i < 3; i++) {
            R[i] = [];
            AbsR[i] = [];
            for (let j = 0; j < 3; j++) {
                R[i][j] = aAxes[i].dot(bAxes[j]);
                AbsR[i][j] = Math.abs(R[i][j]) + EPSILON;
            }
        }
        // Compute translation vector t
        let t = b.center.clone().sub(a.center);
        // Express t in a's frame
        t = new THREE.Vector3(t.dot(aAxes[0]), t.dot(aAxes[1]), t.dot(aAxes[2]));
        // Test axes L = A0, A1, A2
        for (let i = 0; i < 3; i++) {
            const ra = a.halfSize.getComponent(i);
            let rb = 0;
            for (let j = 0; j < 3; j++) rb += b.halfSize.getComponent(j) * AbsR[i][j];
            if (Math.abs(t.getComponent(i)) > ra + rb) return false;
        }
        // Test axes L = B0, B1, B2
        for (let i = 0; i < 3; i++) {
            let ra = 0;
            for (let j = 0; j < 3; j++) ra += a.halfSize.getComponent(j) * AbsR[j][i];
            const rb = b.halfSize.getComponent(i);
            if (Math.abs(t.x * R[0][i] + t.y * R[1][i] + t.z * R[2][i]) > ra + rb) return false;
        }
        // No separating axis found
        return true;
    }
}

function getCarOBB(car, margin = 0.1) {
    // Use the first mesh in the car scene
    let mesh = null;
    car.traverse((child) => {
        if (child.isMesh && !mesh) mesh = child;
    });
    if (!mesh) return null;
    mesh.updateWorldMatrix(true, false);
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox.clone();
    // Shrink for margin
    box.expandByScalar(-margin);
    // Get center and halfSize in local space
    const size = new THREE.Vector3();
    box.getSize(size);
    const halfSize = size.multiplyScalar(0.5);
    const center = box.getCenter(new THREE.Vector3());
    // Get world matrix (rotation/position)
    const worldMatrix = mesh.matrixWorld;
    // Extract rotation (upper-left 3x3)
    const rotation = new THREE.Matrix3().setFromMatrix4(worldMatrix);
    // Transform center to world
    const worldCenter = center.clone().applyMatrix4(worldMatrix);
    return new OBB(worldCenter, halfSize, rotation);
}

function checkCollisionOBB(car, obstacles) {
    if (!car) return false;
    const carOBB = getCarOBB(car, 0.2); // Tighter fit
    if (!carOBB) return false;
    for (let obs of obstacles) {
        const obsBox = new THREE.Box3().setFromObject(obs);
        if (carOBB.intersectsBox3(obsBox)) {
            return true;
        }
    }
    return false;
}

function highlightCarCollisionOBB(car, obstacles) {
    if (!car) return false;
    // Remove any previous hit box
    const prevHitBox = scene.getObjectByName('car-hit-box');
    if (prevHitBox) scene.remove(prevHitBox);
    let hit = false;
    const carOBB = getCarOBB(car, 0.2);
    if (!carOBB) return false;
    for (let obs of obstacles) {
        const obsBox = new THREE.Box3().setFromObject(obs);
        if (carOBB.intersectsBox3(obsBox)) {
            // No longer visualize OBB as a red box
            hit = true;
            break;
        }
    }
    return hit;
}

function animate() {
    requestAnimationFrame(animate);
    // Move the car forward slowly if loaded and moving
    if (car && carMoving) {
        // Move in the direction the car is facing
        car.position.x += Math.cos(carDirection) * carSpeed;
        car.position.z += Math.sin(carDirection) * carSpeed;
        car.rotation.y = -1 * carDirection + Math.PI; // Add 180 degrees to make car face forward
        // Highlight collision part if any (OBB)
        if (highlightCarCollisionOBB(car, obstacles)) {
            carMoving = false;
            gameOverDiv.style.display = 'block';
            console.log('Collision! Car stopped.');
            // Show Start New Game button again
            const startBtn = document.getElementById('start-btn');
            if (startBtn) startBtn.style.display = 'block';
        }
        // Check for crossing the finish line (green line)
        // The finish line is now at z = -2
        const finishLineZ = -2;
        if (car.position.z - 1 < finishLineZ) {
            carMoving = false;
            document.getElementById('you-win').style.display = 'block';
            console.log('You win!');
            // Show Start New Game button again
            const startBtn = document.getElementById('start-btn');
            if (startBtn) startBtn.style.display = 'block';
        }
        // Move the camera along with the car (behind the car)
        camera.position.z = car.position.z - 5 * Math.sin(carDirection);
        camera.position.x = car.position.x + 5 * Math.cos(carDirection);
        camera.lookAt(car.position.x, car.position.y + 1, car.position.z);
    }
    renderer.render(scene, camera);
}

init();
