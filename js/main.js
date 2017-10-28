var GRAVITY = -20;
var ROUGHNESS = 0.5;
var NUM_PARTICLES = 150;

class Emitter {
	constructor(size, position, power = 12, jitter = 0) {
		this.geometry = new THREE.CircleGeometry(size, 12);
		this.material = new THREE.LineBasicMaterial({color: 0x081e47});
		this.mesh = new THREE.Mesh(this.geometry, this.material);

		this.mesh.position.copy(position);

		this.normal = new THREE.Vector3(0, 0, 1);
		this.normalLine = null;
		this.updateNormalLine();

		this.power = power;
		this.jitter = jitter;
	}

	getJitter() {
		return this.jitter;
	}

	updateNormalLine() {
		var material = new THREE.LineBasicMaterial({
			color: 0xfbff26
		});

		var geometry = new THREE.Geometry();
		var n_line_end = new THREE.Vector3();
		n_line_end.addVectors(this.mesh.position, this.normal);

		geometry.vertices.push(
			this.mesh.position,
			n_line_end
		);

		this.normalLine = new THREE.Line(geometry, material);
	}

	rotateX(angle) {
		this.mesh.rotateX(angle);
		this.normal.applyAxisAngle(new THREE.Vector3(1, 0, 0), angle);
		this.updateNormalLine();
	}

	rotateY(angle) {
		this.mesh.rotateY(angle);
		this.normal.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
		this.updateNormalLine();
	}

	rotateZ(angle) {
		this.mesh.rotateZ(angle);
		this.normal.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
		this.updateNormalLine();
	}
}

class Particle {
	constructor(emitter) {
		this.geometry = new THREE.SphereGeometry(0.3,8,8);
		this.material = new THREE.MeshLambertMaterial({color: 0xfcf3d1});
		this.mesh = new THREE.Mesh(this.geometry, this.material);

		this.forces = [new THREE.Vector3(0, GRAVITY, 0)];

		this.mesh.position.copy(emitter.mesh.position);
		this.velocity = emitter.normal.clone();
		this.velocity.multiplyScalar(emitter.power);

		var rand_jitter = (Math.random() * 2 - 1) * emitter.getJitter();
		this.velocity.setX(this.velocity.x + rand_jitter);

		var rand_jitter = (Math.random() * 2 - 1) * emitter.getJitter();
		this.velocity.setY(this.velocity.y + rand_jitter);

		var rand_jitter = (Math.random() * 2 - 1) * emitter.getJitter();
		this.velocity.setZ(this.velocity.z + rand_jitter);

		this.mass = 1;
	}

	addForce(force_vec) {
		this.forces.push(force_vec);
	}

	updatePosition() {
		var dp = new THREE.Vector3(0, 0, 0);
		dp.addScaledVector(this.velocity, 0.01);

		this.mesh.position.add(dp);
	}

	updateVelocity(Collider) {

		if (this.isCollided(Collider)) {
			var k = 0.5
			var a = 0.5

			var v1 = new THREE.Vector3(0, 0, 0);
			var v_dot_n = this.velocity.dot(Collider.normal);

			var v_n = Collider.normal.clone();
			v_n.multiplyScalar(v_dot_n);

			var t_vec = this.velocity.clone();
			t_vec.sub(v_n);
			t_vec.multiplyScalar(a);

			var rand = Math.random() * Collider.getRoughness();
			t_vec.addScalar(rand);

			var n_vec = v_n.clone();
			n_vec.multiplyScalar(k);

			var rand = Math.random() * Collider.getRoughness();
			n_vec.addScalar(rand);

			this.velocity.subVectors(t_vec, n_vec);

		} else {
			var dv = new THREE.Vector3(0, 0, 0);
			for (var i = 0; i < this.forces.length; i++) {
				dv.addScaledVector(this.forces[i], 0.01);
			}

			this.velocity.add(dv);
		}
		
	}

	isCollided(Collider) {
		var xp = new THREE.Vector3(0, 0, 0);

		// set xp = x - p
		xp.subVectors(this.mesh.position, Collider.getPosition());

		var dp = xp.dot(Collider.normal);
		var v_dir = this.velocity.dot(Collider.normal);

		if (!this.inColliderBounds(Collider)) {
			return false
		}

		if (dp > -0.1 && dp < 0.1 && v_dir < 0) {
			return true;
		}

		return false;
	}

	// plane collider
	inColliderBounds(Collider) {
		var cross_arr = []
		for (var i = 0; i < Collider.edgeVecs.length; i++) {
			var v1 = new THREE.Vector3(0, 0, 0);

			var edge = new THREE.Vector3();
			edge.subVectors(Collider.edgeVecs[(i+1)%Collider.edgeVecs.length], Collider.edgeVecs[i]);

			var cornerToPoint = new THREE.Vector3();
			cornerToPoint.subVectors(this.mesh.position, Collider.edgeVecs[(i+1)%Collider.edgeVecs.length]);

			v1.crossVectors(edge, cornerToPoint);
			cross_arr.push(v1);
		}

		for (var i = 1; i < cross_arr.length; i++) {
			if (Math.sign(cross_arr[i].y) != Math.sign(cross_arr[i-1].y)) {
				return false;
			}
		}

		return true;
	}
}

class PlaneCollider {
	constructor(width, height, position = new THREE.Vector3(), color = 0x799ad1) {
		this.geometry = new THREE.PlaneGeometry(width, height);
		this.material = new THREE.MeshLambertMaterial({color: 0x799ad1});
		this.mesh = new THREE.Mesh(this.geometry, this.material);

		this.normal = new THREE.Vector3(0, 1, 0);

		this.edgeVecs = [new THREE.Vector3(width, 0, height), 
						   new THREE.Vector3(-width, 0, height), 
						   new THREE.Vector3(-width, 0, -height),
						   new THREE.Vector3(width, 0, -height)];

		this.mesh.position.copy(position);
		this.mesh.rotateX(-1.57);
		this.roughness = 1;
	}

	getRoughness() {
		return this.roughness;
	}

	getPosition() {
		return this.mesh.position;
	}

	setPosition(p) {
		this.mesh.position.clone();
	}

	getHeight() {
		return this.geometry.parameters["height"];
	}

	getWidth() {
		return this.geometry.parameters["width"];
	}

	rotateX() {
	}
}

/////////////////////////////////////////////////////////////
/* SETUP THE SCENE, CAMERA, AND ORBIT CONTROLS */
/////////////////////////////////////////////////////////////

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

var renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0x589b84);

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

controls = new THREE.OrbitControls( camera, renderer.domElement );
// enable animation loop when using damping or autorotation
controls.enableZoom = false;

/////////////////////////////////////////////////////////////
/* SETUP THE CAMERA */
/////////////////////////////////////////////////////////////

camera.position.z = 20;
camera.position.x = -10;
camera.lookAt(new THREE.Vector3(0, 0, 0));

/////////////////////////////////////////////////////////////
/* SETUP LIGHTS */
/////////////////////////////////////////////////////////////

var light = new THREE.PointLight(0xffffff, 2, 50);
light.position.set(2, 10, 3);

var a_light = new THREE.AmbientLight(0x404040, 2);
scene.add(a_light);

scene.add(light);

/////////////////////////////////////////////////////////////
/* SETUP COLLIDERS */
/////////////////////////////////////////////////////////////

var plane = new PlaneCollider(20, 30);
plane.setPosition(0, -5, 0);
scene.add(plane.mesh);

/////////////////////////////////////////////////////////////
/* SETUP EMITTERS */
/////////////////////////////////////////////////////////////

var emitter = new Emitter(3, new THREE.Vector3(0, 10, -10));
scene.add(emitter.mesh);

/////////////////////////////////////////////////////////////
/* ACTUAL ANIMATION OF SIMULATION */
/////////////////////////////////////////////////////////////

var SIM_ON = false;
var particles = [];

$(document).ready(function(){
    $("#pause_button").click(function(){
        SIM_ON = false;  
        particles = [];   
    });

    $("#reset_button").click(function(){
        SIM_ON = false;
        for (var i = 0; i < particles.length; i++) {
			scene.remove(particles[i]);
		}

		particles = [];
        renderer.render(scene, camera);      
    });

    $("#start_button").click(function(){
        SIM_ON = true;   
    });

});

var intervalID = window.setInterval(addParticle, 500);

function addParticle() {
	if (SIM_ON) {
		if (particles.length < NUM_PARTICLES) {
			particles.push(new Particle(emitter));
			scene.add(particles[particles.length - 1].mesh);
		}
	}
}

function animate() {
	requestAnimationFrame(animate);

	controls.update();

	for (var i = 0; i < particles.length; i++) {
		particles[i].updateVelocity(plane);
		particles[i].updatePosition();
	}

	renderer.render(scene, camera);
}

animate();