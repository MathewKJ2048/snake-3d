import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { MAP, WORLD_SIZE, SNAKE, SNAKE_velocity, replenish_seeds,get_focus_ideal,move_snake, feeler, get_camera_ideal, rotate, damp_r,seeds, copy_normal } from './game.js';

const scene = new THREE.Scene();

const snake_radius = 0.8
const snake_inner_radius = snake_radius/2
const geo_snake_outer = []
const snake_material_outer = []
const stars = []
let t = 0.05
let dimensions = [[1, t, t], [t, 1, t], [t, t, 1]]
let positions = [[1/2,0,0],[-1/2,0,0],[0,1/2,0],[0,-1/2,0],[0,0,1/2],[0,0,-1/2]]

const geometry = new THREE.BoxGeometry((1, 1, 1));
const material = new THREE.MeshBasicMaterial({ color: 0x000000});
const material_ridge = new THREE.MeshBasicMaterial({ color: 0xff00ff});
const star_geo = new THREE.IcosahedronGeometry(WORLD_SIZE/32)
const star_mesh = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe:true})
const feelg = new THREE.IcosahedronGeometry(0.4)
const feelc = new THREE.Mesh(feelg,new THREE.MeshBasicMaterial({color:0xffffff}))
const geo_snake_core = new THREE.IcosahedronGeometry(snake_inner_radius)
const snake_material_core = new THREE.MeshBasicMaterial({color:0xffff00})


function init_feeler()
{
	feelc.position.set(feeler.x,feeler.y,feeler.z)
	scene.add(feelc)
}
function init_stars()
{
	for(let i=0;i<256;i++)
	{
		let R = (0.8+Math.random())*WORLD_SIZE
		let theta = Math.random()*Math.PI*2
		let phi = Math.random()*Math.PI
		let x = R*Math.cos(theta)*Math.sin(phi)
		let y = R*Math.sin(theta)*Math.sin(phi)
		let z = R* Math.cos(phi)
		let star = new THREE.Mesh(star_geo,star_mesh)
		star.position.set(x,y,z)
		scene.add(star)
		stars.push(star)
	}
}
function init_snake_mesh()
{
	for(let i=0;i<8;i++)
	{
		geo_snake_outer.push(new THREE.IcosahedronGeometry(
			snake_inner_radius+(snake_radius-snake_inner_radius)*i/8
			))
		let r = Math.round(0xff0000)*0
		let g = Math.round(0xff00)
		let b = Math.round(0xff)
		let c = r+g+b
		snake_material_outer.push(new THREE.MeshBasicMaterial({color:c, wireframe:true}))
	}
}
function get_positions(dimension)
{
	positions = []
	for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)
		positions.push([x/2,y/2,z/2])
	let final_positons = []
	let id=0
	for(;id<3;id++)if(dimension[id]==1)break;
	for(let p of positions)
		if(p[id]==0 && p[(id+1)%3]!=0 && p[(id+2)%3]!=0)
			final_positons.push(p)
	return final_positons
}
function init_map()
{
	let overall = []
	for (let d of dimensions)overall.push({"d":d,"p":get_positions(d)})
	for (let i=0;i<WORLD_SIZE;i++)for(let j=0;j<WORLD_SIZE;j++)for(let k=0;k<WORLD_SIZE;k++) 
	{
		if(!MAP[i][j][k])continue
		let cube = new THREE.Mesh(geometry, material);
		cube.position.set(i, j, k)
		scene.add(cube)
		for(let o of overall)
		{
			let d = o["d"]
			let ps = o["p"]
			for(let p of ps)
			{
				let g = new THREE.BoxGeometry(d[0],d[1],d[2]);
				let cu = new THREE.Mesh(g,material_ridge)
				cu.position.set(i+p[0],j+p[1],k+p[2])
				scene.add(cu)
			}
		}
	}
}
function init_render()
{
	init_stars()
	init_feeler()
	init_snake_mesh()
	init_map()
}
init_render()

function update_render_snake()
{
	let snek = SNAKE
	while(snek!=null)
	{
		for(let sro of snek.render_object)
		{
			sro.position.set(snek.r.x,snek.r.y,snek.r.z)
			if(!snek.active)
			{
				console.log("render remove")
				scene.remove(sro)
			}
		}
		if(snek.render_object.length==0)
		{
			let sro = new THREE.Mesh(geo_snake_core,snake_material_core)
			sro.position.set(snek.r.x,snek.r.y,snek.r.z)
			scene.add(sro)
			snek.render_object.push(sro)
			for(let i=0;i<snake_material_outer.length;i++)
			{
				let sro = new THREE.Mesh(geo_snake_outer[i],snake_material_outer[i])
				sro.position.set(snek.r.x,snek.r.y,snek.r.z)
				scene.add(sro)
				snek.render_object.push(sro)
			}
		}
		snek = snek.next
	}
}

function update_render_star()
{
	for(let star of stars)star.rotation.x+=delta
}
function update_render_seeds()
{
	for(let seed of seeds)
	{
		if(!seed.active)
			for(let sdro of seed.render_object)
				{scene.remove(sdro)
				console.log("seed object removed")}
		if(seed.render_object.length == 0)
		{
			let sd = new THREE.Mesh(geo_snake_core,snake_material_core)
			sd.position.set(seed.r.x,seed.r.y,seed.r.z)
			seed.render_object.push(sd)
			scene.add(sd)
		}
	}
}
let camera_focus = get_focus_ideal()
let camera_position = get_camera_ideal()
let camera_up = copy_normal()
function update_render_camera()
{
	camera_position = damp_r(camera_position, get_camera_ideal(), delta)
	camera.position.set(
		camera_position.x,
		camera_position.y,
		camera_position.z
		)
	camera_focus = damp_r(camera_focus, get_focus_ideal(), delta)
	camera.lookAt(new THREE.Vector3(
		camera_focus.x,
		camera_focus.y,
		camera_focus.z
		))
	camera_up = damp_r(camera_up,copy_normal(), delta/10)
	camera.up.set(-camera_up.x,-camera_up.y,-camera_up.z)
	feelc.position.set(feeler.x,feeler.y,feeler.z)
}
function update_render()
{
	update_render_seeds()
	update_render_star()
	update_render_snake()
	update_render_camera()
}



const params = {
	threshold: 0.1,
	strength: 0.4,
	radius: 0,
	exposure: 0.5
};

let camera, composer, renderer;

camera = new THREE.PerspectiveCamera(400, window.innerWidth / window.innerHeight, 0.1, WORLD_SIZE*2);
camera.position.set(- 5, -5, - 5);
let cam_init = get_camera_ideal(camera)
camera.position.set(cam_init.x,cam_init.y,cam_init.z)
scene.add(camera);



// scene.add( new THREE.AmbientLight( 0xcccccc ) );

const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(4, 4, 4)
camera.add(pointLight);

renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.toneMapping = THREE.ReinhardToneMapping;
container.appendChild(renderer.domElement);

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;
bloomPass.radius = params.radius;

const outputPass = new OutputPass();

composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);
composer.addPass(outputPass);

// const controls = new OrbitControls(camera, renderer.domElement);

camera.rotation.z = -Math.PI/2
camera.rotation.y = 0
let clock = new THREE.Clock();
let delta = 0


let f=0
window.addEventListener("mousemove", function (event) {
	f = event.x/this.window.innerWidth
})

function animate() {

	delta = clock.getDelta();
	rotate(delta*4*(f-0.5))
	
	move_snake(delta)
	update_render(delta)
	replenish_seeds()
	composer.render();
	

}





renderer.setAnimationLoop(animate);



