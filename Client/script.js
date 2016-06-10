var Client = {
	tickRate: 100,
	players: [],
	bullets: [],
	killMsgs: [],
	health: 100,
	mapDim: 800,
	ammo: 13,
	audio: document.createElement("audio"),
	keys: {
		w : false,
		s : false,
		a : false,
		d : false,
		r : false,
		1 : false,
		2 : false,
		3 : false
	},
	connect: function(host) {
		c.loop = setInterval(c.tick, (1000 / c.tickRate))
		if (c.sock == undefined){
			c.sock = new WebSocket("ws://" + host + ":8989", 'echo-protocol')
			c.name = get("name").value
			get("connect").style.visibility = "hidden"
			get("canvas").style.visibility = "visible"
			get("map").style.visibility = "visible"
			c.sock.onmessage = function (evt) { 
				var m = JSON.parse(evt.data)
				typeFunc = {
					message: function(data) {
						console.log(data)
					},
					move: function(data) {
						c.getPlayer(data[0]).x = data[1]
						c.getPlayer(data[0]).y = data[2]
						c.getPlayer(data[0]).dir = data[3]
					},
					connect: function(data) {
						c.players.push({"name" : data})
					},
					disconnect: function(data) {
						for (i in c.players) {
							if (c.players[i].name == data) {
								c.players.splice(i, 1)
							}
						}
					},
					map: function(data) {
						c.mapDim = data
					},
					health: function(data) {
						c.health = data
					},
					gun: function(data) {
						c.getPlayer(data[0]).gun = data[1]
					},
					bullet: function(data) {
						c.bullets.push(new Bullet(data[0], data[1], data[2], data[3]))
					},
					kills: function(data) {
						c.getPlayer(data[0]).kills = data[1]
					},
					deaths: function(data) {
						c.getPlayer(data[0]).deaths = data[1]
					},
					ammo: function(data) {
						c.ammo = data
					},
					reload: function (data) {
						c.audio.innerHTML = "<source  src='Sounds/reload.wav'>"
						c.audio.play()
					},
					killMsg: function(data) {
						c.killMsgs.push([data[0], data[1], data[2], 0])
					}
				}
				if (typeFunc[m.type] != undefined) {
					typeFunc[m.type](m.data)
				}
			}
			c.sock.onopen = function() {
				c.send("init", c.name)
			}
			c.sock.onclose = function() { 
				alert("Disconnected from Server")
			}
		}
	},
	tick: function() {
		r.clear()
		r.background()
		r.border()
		c.bulletTick()
		r.players()
		r.names()
		r.health()
		r.ammo()
		r.inventory()
		if (r.showScore) {
			r.score()
		}
		r.map()
		r.msgs()
	},
	getPlayer: function(name) {
		for (i in c.players) {
			if (c.players[i].name == name) {
				return c.players[i]
			}
		}
		return false
	},
	bulletTick: function() {
		for (i in c.bullets) {
			c.bullets[i].tick()
		}
		for (var i = c.bullets.length - 1; i > -1; i--) {
			if (c.bullets[i].age > 1000) {
				c.bullets.splice(i, 1)
			}
		}
		r.bulletRender()
	},
	keyDown: function(evt) {
		var key = String.fromCharCode(evt.keyCode).toLowerCase()
		if (c.keys[key] != undefined) {
			if (!c.keys[key]) {
				c.keys[key] = true
				c.send("key", [key, true])
			}
		}
		if (key == "e") {
			r.showScore = true
		}
	},
	keyUp: function(evt) {
		var key = String.fromCharCode(evt.keyCode).toLowerCase()
		if (c.keys[key] != undefined) {
			if (c.keys[key]) {
				c.keys[key] = false
				c.send("key", [key, false])
			}
		}
		if (key == "e") {
			r.showScore = false
		}
	},
	send: function(t, m) {
		c.sock.send(JSON.stringify({type : t, data : m}))
	},
	respawn: function() {
		setTimeout(function() {c.send("respawn", "")} , 500)
	},
	click: function(evt) {
		c.send("shot", (Math.atan(((window.innerWidth /2) - evt.offsetX) / (evt.offsetY - (window.innerHeight /2))) * 180 / Math.PI + 450 + (evt.offsetY < (window.innerHeight /2) ? 0 : 180)) % 360)
	}
}

var Render = {
	canvas: document.getElementById("canvas"),
	context: document.getElementById("canvas").getContext("2d"),
	map: document.getElementById("map"),
	mapContext: document.getElementById("map").getContext("2d"),
	resize: function() {
		get("canvas").width = window.innerWidth
		get("canvas").height = window.innerHeight
		r.repos("connect", window.innerHeight / 2 - 13, window.innerWidth / 2 - 198)
		r.repos("canvas", 0, 0)
		r.repos("map", 20, 20, 200, 200)
	},
	repos: function(id, t, l, w, h) {
		get(id).style.top = t
		get(id).style.left = l
		if (w != undefined) {
			get(id).style.width = w
			get(id).style.height = h
		}
	},
	players: function() {
		for (i in c.players) {
			if (c.players[i].name == c.name) {
				c.x = c.players[i].x
				c.y = c.players[i].y
				c.dir = c.players[i].dir
				if (c.dir == "Dead") {
					c.respawn()
				}
			}
			else {
				var gun = ["pistol", "smg", "rifle"]
				r.drawImage("player" + c.players[i].dir, r.getOffsetX() - 32 - c.players[i].x, r.getOffsetY() - 32 - c.players[i].y, 64, 64)
				r.drawImage(gun[c.players[i].gun], r.getOffsetX() - 16 - c.players[i].x, r.getOffsetY() - 80 - c.players[i].y, 32, 32)
			}
		}
		r.drawImage("player" + c.dir, Math.round(window.innerWidth / 2) - 32, Math.round(window.innerHeight / 2) - 32, 64, 64)
	},
	map: function() {
		r.context.fillStyle = "#AAA"
		r.context.beginPath()
		r.context.moveTo(19, 19)
		r.context.lineTo(222, 19)
		r.context.lineTo(222, 222)
		r.context.lineTo(19, 222)
		r.context.lineTo(19, 19)
		r.context.stroke()
		r.context.fillStyle = "#EEE"
		r.context.fillRect(20, 20, 201, 201)
		for (i in c.players) {
			if (c.players[i].name == c.name) {
				r.context.fillStyle = "#4BF"
			}
			else {
				r.context.fillStyle = "#000"
			}
			r.context.fillRect(119 - Math.round(c.players[i].x / c.mapDim * 100), 119 - Math.round(c.players[i].y / c.mapDim * 100), 3, 3)
		}
	},
	inventory: function() {
		var weapons = ["pistol", "smg", "rifle"]
		for (var i = 0; i < 3; i++) {
			if (i == c.getPlayer(c.name).gun) {
				r.context.fillStyle = "rgba(127, 127, 127, 0.5)"
			}
			else {
				r.context.fillStyle = "rgba(187, 187, 187, 0.5)"
			}
			r.context.fillRect(window.innerWidth / 2 + (i * 80) - 112, 10, 64, 64)
			r.context.fillRect(window.innerWidth / 2 + (i * 80) - 112, 10, 64, 64)
			r.drawImage(weapons[i], window.innerWidth / 2 + (i * 80) - 112, 10, 64, 64)
		}
	},
	names: function() {
		r.context.font = "18px Courier New"
		r.context.textAlign = "center"
		for (i in c.players) {
			var width =  r.context.measureText(c.players[i].name).width
			r.context.fillStyle = "rgba(187, 187, 187, 0.5)"
			r.context.fillRect(r.getOffsetX() - c.players[i].x - width / 2 - 2, r.getOffsetY() - c.players[i].y - 56, width + 4, 20)
			r.context.fillStyle = "rgba(0, 0, 0, 0.5)"
			r.context.strokeText(c.players[i].name,r.getOffsetX() - c.players[i].x, r.getOffsetY() - c.players[i].y - 40)
		}
	},
	border: function() {
		r.context.beginPath()
		r.context.moveTo(r.getOffsetX() - c.mapDim, r.getOffsetY() - c.mapDim)
		r.context.lineTo(r.getOffsetX() + c.mapDim, r.getOffsetY() - c.mapDim)
		r.context.lineTo(r.getOffsetX() + c.mapDim, r.getOffsetY() + c.mapDim)
		r.context.lineTo(r.getOffsetX() - c.mapDim, r.getOffsetY() + c.mapDim)
		r.context.lineTo(r.getOffsetX() - c.mapDim, r.getOffsetY() - c.mapDim)
		r.context.stroke()
	},
	health: function() {
		r.context.font = "24px Courier New"
		r.context.textAlign = "left"
		r.context.fillStyle = "#000"
		r.context.strokeText(c.health + "/100", 10, window.innerHeight - 10)
	},
	ammo: function() {
		var ammo = [13, 75, 40]
		r.context.font = "24px Courier New"
		r.context.textAlign = "right"
		r.context.fillStyle = "#000"
		r.context.strokeText(c.ammo + "/" + ammo[c.getPlayer(c.name).gun], window.innerWidth - 10, window.innerHeight - 10)
	},
	bulletRender: function () {
		for (i in c.bullets) {
			r.context.strokeStyle = "rgba(127, 127, 127, 1)"
			r.context.beginPath()
			r.context.lineWidth = 3
			r.context.moveTo(r.getOffsetX() - c.bullets[i].x, r.getOffsetY() - c.bullets[i].y)
			r.context.lineTo(r.getOffsetX() - c.bullets[i].x + (c.bullets[i].velX * (c.bullets[i].age < 5 ? c.bullets[i].age : 5)), r.getOffsetY() - c.bullets[i].y + (c.bullets[i].velY * (c.bullets[i].age < 5 ? c.bullets[i].age : 5)), 50)
			r.context.stroke()
			r.context.lineWidth = 1
			r.context.strokeStyle = "rgba(0, 0, 0, 1)"
		}
	},
	background: function() {
		get("body").style.backgroundPosition  = c.x + " " + c.y
	},
	getOffsetX: function() {
		return Math.round(window.innerWidth / 2) + c.x
	},
	getOffsetY: function() {
		return Math.round(window.innerHeight / 2) + c.y 
	},
	drawImage: function(id, x, y, w, h) {
		r.context.drawImage(get(id), x, y, w, h)
	},
	score: function() {
		r.context.textAlign = "left"
		var width = 60
		for (i in c.players) {
			if (c.players[i].kills == undefined) {
				c.players[i].kills = 0
			} 
			if (c.players[i].deaths == undefined) {
				c.players[i].deaths = 0
			} 
			width =  Math.max(r.context.measureText(c.players[i].name).width, width)
		}
		width += 130
		r.context.fillStyle = "rgba(187, 187, 187, 0.5)"
		r.context.fillRect(window.innerWidth / 2 - (width /2), 150, width, (c.players.length + 1) * 25)
		r.context.strokeText("NAME", window.innerWidth / 2 - (width /2), 170)
		r.context.strokeText("KLL", window.innerWidth / 2 + (width /2) - 110, 170)
		r.context.strokeText("DTH", window.innerWidth / 2 + (width /2) - 50, 170)
		for (i in c.players) {
			r.context.fillStyle = "rgba(0, 0, 0, 0.5)"
			r.context.strokeText(c.players[i].name, window.innerWidth / 2 - (width /2), 195 + (25 * i))
			r.context.strokeText(c.players[i].kills, window.innerWidth / 2 + (width /2) - 110, 195 + (25 * i))
			r.context.strokeText(c.players[i].deaths, window.innerWidth / 2 + (width /2) - 50, 195 + (25 * i))
		}
	},
	msgs: function() {
		for (i in c.killMsgs) {
			c.killMsgs[i][3]++
			if (c.killMsgs[i][3] > 500) {
				c.killMsgs.splice(i, 1)
			}
		}
		for (i in c.killMsgs) {
			var width = r.context.measureText(c.killMsgs[i][0]).width+ r.context.measureText(c.killMsgs[i][1]).width + 55
			var gun = ["pistol", "smg", "rifle"]
			r.context.fillStyle = "rgba(187, 187, 187, 0.5)"
			r.context.fillRect(window.innerWidth - width - 15, 20 + i * 25, width, 20)
			r.context.strokeText(c.killMsgs[i][1] + "   " + c.killMsgs[i][0], window.innerWidth - 20 , 38 + (i * 25))
			r.drawImage(gun[c.killMsgs[i][2]], (window.innerWidth - r.context.measureText(c.killMsgs[i][0]).width - 55), 15 + (i * 25), 32, 32)
			
		}
	},
	clear: function() {
		r.context.clearRect(0, 0, r.canvas.width, r.canvas.height)
	}
}

var Bullet = function(x, y, a, gun) {
	var sounds = ["pistol", "smg", "rifle"]
	this.x = x
	this.y = y
	this.audio = document.createElement("audio")
	this.audio.innerHTML = "<source  src='Sounds/" + sounds[gun]  +".wav'>"
	this.audio.volume = Math.pow(750 / ((Math.pow(Math.pow((c.x - x), 2) + Math.pow((c.y - y), 2), 1/2)) + 750), 2)
	this.velX = Math.cos(a * Math.PI / 180) * 100
	this.velY = Math.sin(a * Math.PI / 180) * 100
	this.age = 0
	this.audio.play()
}

Bullet.prototype = {
	tick: function() {
		this.age++
		this.x += this.velX
		this.y += this.velY
	}
}

var c = Client
var r = Render

get = function(id) {return document.getElementById(id)}

document.onkeydown = c.keyDown
document.onkeyup = c.keyUp
window.onresize = r.resize
r.resize()