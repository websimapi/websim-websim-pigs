import * as THREE from 'three';

export class Pig {
    constructor(isLocal = false) {
        this.isLocal = isLocal;
        this.mesh = new THREE.Group();
        this.bodyGroup = new THREE.Group();
        this.mesh.add(this.bodyGroup);

        // Materials
        this.pigMaterial = new THREE.MeshStandardMaterial({ color: 0xffb6c1 }); // Pink
        this.darkPigMaterial = new THREE.MeshStandardMaterial({ color: 0xe08fa0 }); // Darker Pink
        this.stickMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black stick figure

        this.createPigGeometry();
        this.createRiderGeometry();
        
        // Animation state
        this.legAngle = 0;
    }

    createPigGeometry() {
        // Body
        const bodyGeo = new THREE.BoxGeometry(1, 0.8, 1.5);
        this.body = new THREE.Mesh(bodyGeo, this.pigMaterial);
        this.body.position.y = 0.8;
        this.body.castShadow = true;
        this.bodyGroup.add(this.body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.7, 0.7, 0.6);
        this.head = new THREE.Mesh(headGeo, this.pigMaterial);
        this.head.position.set(0, 1.1, 0.9);
        this.head.castShadow = true;
        this.bodyGroup.add(this.head);

        // Snout
        const snoutGeo = new THREE.BoxGeometry(0.3, 0.2, 0.2);
        this.snout = new THREE.Mesh(snoutGeo, this.darkPigMaterial);
        this.snout.position.set(0, 1.0, 1.25);
        this.bodyGroup.add(this.snout);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        this.eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        this.eyeL.position.set(0.2, 1.2, 1.21);
        this.bodyGroup.add(this.eyeL);

        this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        this.eyeR.position.set(-0.2, 1.2, 1.21);
        this.bodyGroup.add(this.eyeR);

        // Legs (Pivots are important for animation)
        this.legs = [];
        const legPositions = [
            { x: -0.3, z: 0.5 }, // Front Left
            { x: 0.3, z: 0.5 },  // Front Right
            { x: -0.3, z: -0.5 },// Back Left
            { x: 0.3, z: -0.5 }  // Back Right
        ];

        legPositions.forEach(pos => {
            const legGroup = new THREE.Group();
            legGroup.position.set(pos.x, 0.5, pos.z);
            
            const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
            const legMesh = new THREE.Mesh(legGeo, this.pigMaterial);
            legMesh.position.y = -0.3; // Offset so pivot is at top
            legMesh.castShadow = true;
            
            legGroup.add(legMesh);
            this.bodyGroup.add(legGroup);
            this.legs.push(legGroup);
        });

        // Tail
        const tailGeo = new THREE.CylinderGeometry(0.05, 0.02, 0.3);
        this.tail = new THREE.Mesh(tailGeo, this.darkPigMaterial);
        this.tail.position.set(0, 0.8, -0.8);
        this.tail.rotation.x = -1;
        this.bodyGroup.add(this.tail);
    }

    createRiderGeometry() {
        this.riderGroup = new THREE.Group();
        // Rider sits on top of body
        this.riderGroup.position.set(0, 1.2, 0); 
        this.bodyGroup.add(this.riderGroup);

        // Torso
        const torsoGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6);
        this.torso = new THREE.Mesh(torsoGeo, this.stickMaterial);
        this.torso.position.y = 0.3;
        this.riderGroup.add(this.torso);

        // Legs (Straddling)
        const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5);
        
        const leftLeg = new THREE.Mesh(legGeo, this.stickMaterial);
        leftLeg.position.set(0.2, 0.1, 0);
        leftLeg.rotation.z = -0.5;
        this.riderGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, this.stickMaterial);
        rightLeg.position.set(-0.2, 0.1, 0);
        rightLeg.rotation.z = 0.5;
        this.riderGroup.add(rightLeg);

        // Arms
        const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4);
        
        const leftArm = new THREE.Mesh(armGeo, this.stickMaterial);
        leftArm.position.set(0.15, 0.5, 0.1);
        leftArm.rotation.x = -1;
        this.riderGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, this.stickMaterial);
        rightArm.position.set(-0.15, 0.5, 0.1);
        rightArm.rotation.x = -1;
        this.riderGroup.add(rightArm);
    }
}