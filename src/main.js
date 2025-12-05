import * as THREE from 'three';
import { Network } from './Network.js';
import { Pig } from './Pig.js';
import nipplejs from 'nipplejs';

class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.peers = {};
        this.localId = null;
        this.lastTime = performance.now();
        this.keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };
        this.joystickVector = { x: 0, y: 0 };

        this.initThree();
        this.initInputs();
        this.initNetwork();
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 10, 10);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Ground
        const textureLoader = new THREE.TextureLoader();
        const grassTexture = textureLoader.load('asset_name.png');
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(20, 20);

        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({ 
            map: grassTexture,
            color: 0x88cc88 
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Loop
        this.animate();
    }

    initInputs() {
        // Keyboard
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);

        // Joystick
        const joystickZone = document.getElementById('joystick-zone');
        const manager = nipplejs.create({
            zone: joystickZone,
            mode: 'static',
            position: { left: '75px', bottom: '75px' },
            color: 'white'
        });

        manager.on('move', (evt, data) => {
            const forward = Math.sin(data.angle.radian);
            const right = Math.cos(data.angle.radian);
            // Limit magnitude to 1
            const force = Math.min(data.force, 1);
            this.joystickVector.x = right * force;
            this.joystickVector.y = forward * force;
        });

        manager.on('end', () => {
            this.joystickVector.x = 0;
            this.joystickVector.y = 0;
        });
    }

    async initNetwork() {
        this.network = new Network(this);
        const myPeer = await this.network.connect();

        // Hide loading screen
        const loadingScreen = document.getElementById('loading');
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.style.display = 'none', 500);

        if (myPeer) {
            this.localId = this.network.id;
        }
    }

    addPeer(id, info) {
        if (this.peers[id]) return;

        const isLocal = id === this.network.id;
        const pig = new Pig(isLocal);

        // Set initial position if remote, or default if local
        pig.mesh.position.set(
            (Math.random() - 0.5) * 10,
            0,
            (Math.random() - 0.5) * 10
        );

        pig.setAvatar(info.avatarUrl);

        this.scene.add(pig.mesh);
        this.peers[id] = pig;

        // Create nametag
        this.createNametag(id, info.username);
    }

    removePeer(id) {
        if (this.peers[id]) {
            this.scene.remove(this.peers[id].mesh);
            delete this.peers[id];

            const nametag = document.getElementById(`nametag-${id}`);
            if (nametag) nametag.remove();
        }
    }

    updatePeer(id, data) {
        const pig = this.peers[id];
        if (pig) {
            pig.targetPos = new THREE.Vector3(data.x, 0, data.z);
            pig.targetRot = data.rot;
            // Also sync animation state if provided
            if (data.moving !== undefined) pig.isMoving = data.moving;
        }
    }

    createNametag(id, username) {
        const div = document.createElement('div');
        div.id = `nametag-${id}`;
        div.className = 'nametag';
        div.textContent = username;
        document.getElementById('nametags-container').appendChild(div);
    }

    updateNametags() {
        for (const [id, pig] of Object.entries(this.peers)) {
            const nametag = document.getElementById(`nametag-${id}`);
            if (nametag && pig.mesh) {
                const headPos = pig.mesh.position.clone().add(new THREE.Vector3(0, 2.5, 0));
                headPos.project(this.camera);

                const x = (headPos.x * .5 + .5) * window.innerWidth;
                const y = (-(headPos.y * .5) + .5) * window.innerHeight;

                if (headPos.z < 1) {
                    nametag.style.display = 'block';
                    nametag.style.left = `${x}px`;
                    nametag.style.top = `${y}px`;
                } else {
                    nametag.style.display = 'none';
                }
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // Update local player
        if (this.localId && this.peers[this.localId]) {
            const myPig = this.peers[this.localId];
            const speed = 5;
            const move = new THREE.Vector3(0, 0, 0);

            // Keyboard input
            if (this.keys.w || this.keys.ArrowUp) move.z -= 1;
            if (this.keys.s || this.keys.ArrowDown) move.z += 1;
            if (this.keys.a || this.keys.ArrowLeft) move.x -= 1;
            if (this.keys.d || this.keys.ArrowRight) move.x += 1;

            // Joystick input (additive)
            move.x += this.joystickVector.x;
            move.z -= this.joystickVector.y; // NippleJS Y is up, ThreeJS Z- is forward

            // Normalize and apply speed
            if (move.length() > 0.1) {
                if (move.length() > 1) move.normalize();

                // Calculate rotation based on movement direction
                const targetRotation = Math.atan2(move.x, move.z);

                // Smooth rotation
                let rotDiff = targetRotation - myPig.mesh.rotation.y;
                while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                myPig.mesh.rotation.y += rotDiff * 10 * dt;

                // Move in direction
                myPig.mesh.position.x += Math.sin(myPig.mesh.rotation.y) * speed * dt * move.length();
                myPig.mesh.position.z += Math.cos(myPig.mesh.rotation.y) * speed * dt * move.length();

                myPig.isMoving = true;
            } else {
                myPig.isMoving = false;
            }

            // Camera follow
            const camOffset = new THREE.Vector3(0, 8, 12); // Behind and up
            // camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), myPig.mesh.rotation.y); // Optional: Rotate camera with player
            const targetCamPos = myPig.mesh.position.clone().add(camOffset);
            this.camera.position.lerp(targetCamPos, 5 * dt);
            this.camera.lookAt(myPig.mesh.position);

            // Network update
            this.network.updateMyPresence({
                x: myPig.mesh.position.x,
                z: myPig.mesh.position.z,
                rot: myPig.mesh.rotation.y,
                moving: myPig.isMoving
            });
        }

        // Update peers (interpolation and animation)
        for (const [id, pig] of Object.entries(this.peers)) {
            pig.update(dt); // Animation

            if (id !== this.localId && pig.targetPos) {
                // Interpolate position
                pig.mesh.position.lerp(pig.targetPos, 10 * dt);

                // Interpolate rotation
                let rotDiff = pig.targetRot - pig.mesh.rotation.y;
                while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                pig.mesh.rotation.y += rotDiff * 10 * dt;

                // Assuming remote peer updates 'moving' state or we infer it
                // pig.isMoving is updated in updatePeer
            }
        }

        this.updateNametags();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start game
new Game();