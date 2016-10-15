var Client = {
	tickRate: 100,
	players: [],
	bullets: [],
	killMsgs: [],
	health: 100,
	mapDim: 800,
	ammo: 13,
	lastUpdate: new Date().getTime(),
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
		r.tick()
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
					moveUpdate: function(data) {
						c.getPlayer(data[0]).x = data[1]
						c.getPlayer(data[0]).y = data[2]
						c.getPlayer(data[0]).dx = 0
						c.getPlayer(data[0]).dy = 0
					},
					move: function(data) {
						c.getPlayer(data[0]).dx = data[1]
						c.getPlayer(data[0]).dy = data[2]
						c.getPlayer(data[0]).dir = data[3]
					},

					connect: function(data) {
						c.players.push({name: data[0], team: data[1], x: 0, y: 0, dx: 0, dy: 0, dir: "Down"})
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
						if (data == 0) {
							alert("You Died!")
							c.respawn()
						}
					},
					gun: function(data) {
						c.getPlayer(data[0]).gun = data[1]
					},
					bullet: function(data) {
						c.bullets.push(new Bullet(data[0], data[1], data[2]))
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
		c.bulletTick()
		c.updatePlayerPos()
	},
	getPlayer: function(name) {
		for (z in c.players) {
			if (c.players[z].name == name) {
				return c.players[z]
			}
		}
		return false
	},
	updatePlayerPos: function() {
		var diff = new Date().getTime() - c.lastUpdate
		for (i in c.players) {
			c.players[i].x += c.players[i].dx * diff * c.tickRate / 1000
			c.players[i].y += c.players[i].dy * diff * c.tickRate / 1000
			c.players[i].x = Math.max(Math.min(c.players[i].x, c.mapDim), c.mapDim * -1)
			c.players[i].y = Math.max(Math.min(c.players[i].y, c.mapDim), c.mapDim * -1)
		}
		c.lastUpdate = new Date().getTime()
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
		c.send("respawn", "")
		c.bullets = []
	},
	click: function(evt, down) {
		if (down) {
			c.send("shot", (Math.atan(((window.innerWidth /2) - (evt.offsetX + 16)) / ((evt.offsetY + 16) - (window.innerHeight /2))) * 180 / Math.PI + 450 + ((evt.offsetY + 16) < (window.innerHeight /2) ? 0 : 180)) % 360)
		}

	}
}

var c = Client
document.onkeyup = c.keyUp
document.onkeydown = c.keyDown
