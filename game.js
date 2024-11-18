

const WORLD_SIZE = 100


const MAP = new Array();
for (let i = 0; i < WORLD_SIZE; i++) {
	MAP[i] = new Array()
	for (let j = 0; j < WORLD_SIZE; j++) {
		MAP[i][j] = new Array()
		for (let k = 0; k < WORLD_SIZE; k++) {
			MAP[i][j][k] = false
		}
	}
}

for (let i = 0; i < 16; i++) {
	for (let j = 0; j < 16; j++) {
		MAP[i][j][0] = true
		MAP[16][j][i] = true
		MAP[i][j][16] = true
	}
}

function check_map(pos) {
	let p = snap_v(pos)
	if (p.x < 0 || p.x >= WORLD_SIZE) return false
	if (p.y < 0 || p.y >= WORLD_SIZE) return false
	if (p.z < 0 || p.z >= WORLD_SIZE) return false
	
		return MAP[p.x][p.y][p.z]
	
}
function check_map_n(i, j, k) {
	return check_map(new Vector(i, j, k))
}


class Vector {
	constructor(x, y, z) {
		this.x = x
		this.y = y
		this.z = z
	}
}
function add_v(v1, v2) {
	return new Vector(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z)
}
function scale_v(v, k) {
	return new Vector(v.x * k, v.y * k, v.z * k)
}
function sub_v(v1, v2) {
	return add_v(v1, scale_v(v2, -1))
}
function mag_v(v) {
	return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}
function normalize_v(v) {
	return scale_v(v, 1 / mag_v(v))
}
function snap_v(v) {
	return new Vector(Math.round(v.x), Math.round(v.y), Math.round(v.z))
}
function dot_v(v1, v2) {
	return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z
}
function cross_v(v1, v2) {
	return new Vector(
		v1.y * v2.z - v1.z * v2.y,
		-(v1.x * v2.z - v1.z * v2.x),
		v1.x * v2.y - v1.y * v2.x
	)
}
function component_v(b, a) // component of v1 along v2
{
	// |b|cost ^a
	// |b|a.b/(|a||b|) a/|a|
	// a.b/|a|^2 a
	let f = dot_v(a, b) / (dot_v(a, a))
	return scale_v(a, f)
}

class Segment {
	constructor(r, next, prev) {
		this.r = r
		this.next = null
		this.prev = null
		this.render_object = []
		this.active = true
	}
}
class Seed {
	constructor(r) {
		this.r = r
		this.active = true
		this.render_object = []
	}
}

let SNAKE = new Segment(new Vector(5, 5, 1), null, null)
let SNAKE_velocity = new Vector(2, 0, 0)
let normal = new Vector(0, 0, -1)
let seeds = []
let seedable = []

const SEED_DENSITY = 1 / 10
function check_seedable(x, y, z) {
	let ct = 0
	if (check_map_n(x + 1, y, z) && check_map_n(x - 1, y, z)) ct += 1
	if (check_map_n(x, y + 1, z) && check_map_n(x, y - 1, z)) ct += 1
	if (check_map_n(x, y, z + 1) && check_map_n(x, y, z - 1)) ct += 1
	return ct >= 2
}
for (let i = 0; i < WORLD_SIZE; i++)for (let j = 0; j < WORLD_SIZE; j++)for (let k = 0; k < WORLD_SIZE; k++)
	if (MAP[i][j][k])
		if (check_seedable(i, j, k))
			seedable.push([i, j, k])
let SEED_NUMBER = Math.round(SEED_DENSITY * seedable.length)

function random_normal() {
	let id = Math.floor(Math.random() * 2.999)
	let n = [0, 0, 0]
	n[id] = 1
	if (Math.random() > 0.5) n[id] = -1
	return new Vector(n[0], n[1], n[2])
}
function replenish_seeds() {
	let new_seeds = []
	for (let s of seeds) if (s.active) new_seeds.push(s)
	seeds = new_seeds
	if (seeds.length >= SEED_NUMBER) return
	let num = SEED_NUMBER - seeds.length
	for (let i = 0; i < num; i++) {
		let host = seedable[Math.floor(Math.random() * seedable.length)]
		let host_r = new Vector(host[0],host[1],host[2])
		if(mag_v(sub_v(host_r,SNAKE.r))<4) // do not spawn near snake head
		{
			i--;
			continue
		}
		while (true) 
		{
			let n = random_normal()
			let seed_r = add_v(n,host_r)
			if(check_map(seed_r))continue // do not spawn within map
			for(let sd of seeds)if(mag_v(sub_v(sd.r,seed_r))<0.1)continue // do not double-spawn
			seeds.push(new Seed(seed_r))
			break
		}
	}
}



function copy_normal() { return new Vector(normal.x, normal.y, normal.z) }



let feeler = new Vector(0, 0, 0)
function dir_snap(v) {
	let v_ = [v.x, v.y, v.z]
	let index = 0
	for (let i = 1; i < 3; i++) {
		if (Math.abs(v_[index]) < Math.abs(v_[i])) {
			index = i
		}
	}
	for (let i = 0; i < 3; i++) {
		if (i == index) v_[i] = v_[i] / Math.abs(v_[i]);
		else v_[i] = 0
	}
	return new Vector(v_[0], v_[1], v_[2])
}
function side_check() {
	let f1 = cross_v(normalize_v(SNAKE_velocity), normal)
	let f2 = scale_v(f1, -1)
	return check_map(add_v(SNAKE.r, f1)) || check_map(add_v(SNAKE.r, f2))
}
function update_normal() {
	let sv = dir_snap(SNAKE_velocity)
	feeler = add_v((SNAKE.r), scale_v(sv, 0.5))
	if (check_map(feeler)) {
		let old_normal = new Vector(normal.x, normal.y, normal.z)
		normal = sub_v(snap_v(feeler), snap_v(SNAKE.r))
		// snap position but do it propery
		SNAKE_velocity = scale_v(old_normal, -mag_v(SNAKE_velocity))
		return true
	}
	if (check_map(add_v(SNAKE.r, normal))) return true
	return false
}

const CAMDIST = 1
const CAM_RATIO = 0.05
const CAM_ZOOM = 10
let camera_helper = sub_v(SNAKE.r, scale_v(normalize_v(SNAKE_velocity), CAMDIST))
function purge(snek) {
	console.log("colln chain")
	while (snek != null) {
		snek.active = false
		snek = snek.next
	}
}
function colln() {
	if (check_map(SNAKE.r)) {
		SNAKE.active = false
		console.log("wall collision")
		return
	}
	let snek = SNAKE.next
	while (snek != null) {
		if (mag_v(sub_v(snek.r, SNAKE.r)) < 0.5) purge(snek)

		snek = snek.next
	}
}
function move_snake(dt) {

	SNAKE.r = add_v(SNAKE.r, scale_v(SNAKE_velocity, dt))
	for (let s of seeds) {
		if (!s.active) continue
		if (mag_v(sub_v(s.r, feeler)) < 1) {
			s.active = false
			let new_head = new Segment(s.r, null, null)
			new_head.next = SNAKE
			SNAKE.prev = new_head
			SNAKE = new_head
		}
	}
	let snek = SNAKE.next
	while (snek != null) {
		let diff = normalize_v(sub_v(snek.prev.r, snek.r))
		snek.r = sub_v(snek.prev.r, diff)
		snek = snek.next
	}
	let diff = scale_v(normalize_v(sub_v(SNAKE.r, camera_helper)), CAMDIST)
	camera_helper = sub_v(SNAKE.r, diff)
	if (!SNAKE.active) {
		SNAKE = SNAKE.next
	}
	colln()
	if (!update_normal() || side_check()) {
		console.log("normal update fail or side check fail")
		SNAKE.active = false
	}
}
const CAM_L = 8
const CAM_H = 8
const CAM_F = 4
function damp_r(actual_r, ideal_r, delta) {
	let threshold = mag_v(SNAKE_velocity) * delta
	let diff = sub_v(ideal_r, actual_r)
	if (mag_v(diff) <= threshold) return ideal_r
	return add_v(actual_r, scale_v(normalize_v(diff), threshold))

}
function get_focus_ideal() {
	return add_v(SNAKE.r, scale_v(normalize_v(SNAKE_velocity), CAM_F))
}
function get_camera_ideal() {
	let p = scale_v(normalize_v(SNAKE_velocity), -CAM_L)
	let q = scale_v(normalize_v(normal), -CAM_H)
	return add_v(p, add_v(q, SNAKE.r))
}

function get_camera_ideal_aux(camera, delta) {

	let v = sub_v(SNAKE.r, camera_helper)
	let w = scale_v(normal, -1)
	let comp = component_v(w, v)
	let n = normalize_v(sub_v(w, comp))
	let a = camera_helper
	a = add_v(a, scale_v(v, 1 / 2))
	a = add_v(a, scale_v(n, CAMDIST * CAM_RATIO))
	let dir = sub_v(a, SNAKE.r)
	let answer = add_v(SNAKE.r, scale_v(dir, CAM_ZOOM))
	let cam_v = new Vector(camera.position.x, camera.position.y, camera.position.z)
	let difference = sub_v(answer, cam_v)
	if (mag_v(difference) > delta * mag_v(SNAKE_velocity)) {
		let d = normalize_v(sub_v(answer, cam_v))
		let correction = scale_v(d, delta * mag_v(SNAKE_velocity))
		let corrected_answer = add_v(cam_v, correction)
		return corrected_answer
	}
	return answer
	//return add_v(SNAKE.r,scale_v(add_v(normalize_v(SNAKE_velocity),(normal)),-4))
}


function init_snake() {
	let snek = SNAKE
	for (let i = 0; i < 4; i++) {
		snek.next = new Segment(new Vector(snek.r.x - 1, snek.r.y, snek.r.z), null, null)
		snek.next.prev = snek
		snek = snek.next
	}
}
init_snake()
function rotate(angle) {
	let perp = cross_v(normal, SNAKE_velocity)
	SNAKE_velocity = add_v(
		scale_v(SNAKE_velocity, Math.cos(angle)),
		scale_v(perp, Math.sin(angle))

	)
}


export {
	MAP,
	WORLD_SIZE,
	SNAKE,
	move_snake,
	feeler,
	get_camera_ideal,
	SNAKE_velocity,
	rotate,
	get_focus_ideal,
	damp_r,
	copy_normal,
	replenish_seeds,
	seeds
}