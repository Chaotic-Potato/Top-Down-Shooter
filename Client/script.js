var Client = {
	tickRate: 100,
	players: [],
	x: 0,
	y: 0,
	mapDim: 3200,
	keys: {
		"w": false,
		"s" : false,
		"a" : false,
		"d" : false
	},
	connect: function() {
		if (c.sock == undefined){
			c.sock = new WebSocket("ws://potatobox.no-ip.info:6666", 'echo-protocol')
			c.name = get("name").value
			get("connect").style.visibility = "hidden"
			get("canvas").style.visibility = "visible"
			get("map").style.visibility = "visible"
			c.sock.onmessage = function (evt) { 
				var m = JSON.parse(evt.data)
				typeFunc = {
					"move": function(data) {
						c.getPlayer(data[0])["x"] = data[1]
						c.getPlayer(data[0])["y"] = data[2]
						c.getPlayer(data[0])["dir"] = data[3]
					},
					"connect": function(data) {
						c.players.push({"name" : data})
					},
					"disconnect": function(data) {
						for (i in c.players) {
							if (c.players[i]["name"] == data) {
								c.players.splice(i, 1)
							}
						}
					},
					"map": function(data) {
						c.mapDim = data
					}
				}
				if (typeFunc[m["type"]] != undefined) {
					typeFunc[m["type"]](m["data"])
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
		r.border()
		r.players()
		r.names()
		r.map()
	},
	getPlayer: function(name) {
		for (i in c.players) {
			if (c.players[i]["name"] == name) {
				return c.players[i]
			}
		}
		return false
	},
	keyDown: function(evt) {
		var key = String.fromCharCode(evt.keyCode).toLowerCase()
		if (c.keys[key] != undefined) {
			if (!c.keys[key]) {
				c.keys[key] = true
				c.send("key", [key, true])
			}
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
	},
	vert: function(a) {
		c.lastDir = (a ? "Up" : "Down")
		c.send("move", c.lastDir)
	},
	hor: function(a) {
		c.lastDir = (a ? "Left" : "Right")
		c.send("move", c.lastDir)
	},
	send: function(t, m) {
		c.sock.send(JSON.stringify({"type" : t, "data" : m}))
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
			if (c.players[i]["name"] == c.name) {
				c.x = c.players[i]["x"]
				c.y = c.players[i]["y"]
				c.dir = c.players[i]["dir"]
			}
			else {
				r.drawImage("player" + c.players[i]["dir"], r.getOffsetX() - 32 - c.players[i]["x"], r.getOffsetY() - 32 - c.players[i]["y"], 64, 64)
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
		r.context.fillStyle = "#000"
		for (i in c.players) {
			r.context.fillRect(120 - Math.round(c.players[i]["x"] / c.mapDim * 100), 120 - Math.round(c.players[i]["y"] / c.mapDim * 100), 1, 1)
		}
	},
	names: function() {
		r.context.font = "18px Courier New"
		r.context.textAlign = "center"
		for (i in c.players) {
			var width =  r.context.measureText(c.players[i].name).width
			r.context.fillStyle = "rgba(187, 187, 187, 0.5)"
			r.context.fillRect(r.getOffsetX() - c.players[i]["x"] - width / 2 - 2, r.getOffsetY() - c.players[i]["y"] - 56, width + 4, 20)
			r.context.fillStyle = "rgba(0, 0, 0, 0.5)"
			r.context.strokeText(c.players[i].name,r.getOffsetX() - c.players[i]["x"], r.getOffsetY() - c.players[i]["y"] - 40)
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
	getOffsetX: function(x) {
		return Math.round(window.innerWidth / 2) + c.x
	},
	getOffsetY: function(y) {
		return Math.round(window.innerHeight / 2) + c.y
	},
	drawImage: function(id, x, y, w, h) {
		r.context.drawImage(get(id), x, y, w, h)
	},
	clear: function() {
		r.context.clearRect(0, 0, r.canvas.width, r.canvas.height)
	}
}

var c = Client
var r = Render

setInterval(c.tick, (1000 / c.tickRate))
get = function(id) {return document.getElementById(id)}

document.onkeydown = c.keyDown
document.onkeyup = c.keyUp
window.onresize = r.resize
r.resize()