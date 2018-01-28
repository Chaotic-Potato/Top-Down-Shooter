var Server = {
	clients: [],
	tickRate: 100,
	mapDim: 3200,
	lastSecond: new Date().getTime() + 1000,
	ticks: 0,
	points: 0,
	clipBoxes: [],
	init: function() {
		s.genMap()
		s.loop = setInterval(s.tick, (1000 / s.tickRate) - 0.1)
		s.WebSocketServer = require('websocket').server
		s.http =  require("http") 
		s.server = s.http.createServer(function(res, req){}).listen(8989)
		s.wsServer = new s.WebSocketServer({
			httpServer: s.server,
			autoAcceptcons: false
		})
		s.wsServer.on('request', function(r) {
			var con = r.accept('echo-protocol', r.origin)
			s.clients.push(con)
			con.x = 0
			con.y = 0
			con.dx = 0
			con.dy = 0
			con.health = 100
			con.gun = 0
			con.kills = 0
			con.deaths = 0
			con.dir = "Down"
			con.cooldown = 0
			con.keyPress = {
				w : false,
				s : false,
				a : false,
				d : false,
				r : false,
				1 : false,
				2 : false,
				3 : false
			}
			con.reload = 0
			con.ammo = 13
			con.on('message', function(message) {
				var m = JSON.parse(message.utf8Data)
				typeFunc = {
					init: function(data, con) {
						if (s.nameValid(data)) {
							con.team = !s.getMajorityTeam()
							s.spawn(con)
							con.name = data
							s.send("connect", [con.name, con.team, con.x, con.y])
							s.send("gun", [con.name, con.gun])
							con.sendUTF(JSON.stringify({type : "map", data : [s.mapDim, s.clipBoxes]}))
							con.sendUTF(JSON.stringify({type : "points", data : s.points}))
							for (i in s.clients) {
								if (s.clients[i] != con) {
									con.sendUTF(JSON.stringify({type : "connect", data : [s.clients[i].name, s.clients[i].team]}))
								}
								con.sendUTF(JSON.stringify({type : "moveUpdate", data : [s.clients[i].name, s.clients[i].x, s.clients[i].y]}))
								con.sendUTF(JSON.stringify({type : "move", data : [s.clients[i].name, s.clients[i].dx, s.clients[i].dy, s.clients[i].dir]}))
								con.sendUTF(JSON.stringify({type : "kills", data : [s.clients[i].name, s.clients[i].kills]}))
								con.sendUTF(JSON.stringify({type : "deaths", data : [s.clients[i].name, s.clients[i].deaths]}))
								con.sendUTF(JSON.stringify({type : "gun", data : [s.clients[i].name, s.clients[i].gun]}))
							}
						}
						else {
							con.sendUTF("Name Invalid!")
							con.close()
							return
						}
					},
					key: function(data, con) {
						if (v.gun.indexOf(data[0]) != -1 && data[1]) {
							con.gun = v.gun.indexOf(data[0])
							s.send("gun", [con.name, v.gun.indexOf(data[0])])
							s.changeAmmo(con, 0)
							s.reload(con)
						}
						else if (data[0] == "r") {
							s.reload(con)
						}
						else {
							s.updateCoords(con, con.x, con.y)	
						}
						con.keyPress[data[0]] = data[1]
						if (data[1] && v.keyToDir[data[0]] != undefined) {
							con.dir = v.keyToDir[data[0]]
						}
					},
					respawn: function(data, con) {
						if (con.health == 0) {
							s.changeHealth(con, 100)
							for (i in con.keyPress) {
								con.keyPress[i] = false
							}
							s.spawn(con)
						}
					},
					shot: function(data, con) {
						if (con.cooldown + con.reload == 0) {
							if (con.ammo > 0 && con.health > 0) {
								s.changeAmmo(con, con.ammo - 1)
								data = (data + Math.pow(Math.random(), 2) * v.inacc[con.gun] * (Math.random() > 0.5 ? -1 : 1)) + Math.PI * 2 % (Math.PI * 2)
								con.cooldown = v.cooldown[con.gun]
								var boxesHit = []
								for (z in s.clients) {
									for (var n = 0; n < v.hitBoxes.length; n++) {
										var hit = s.hitBoxReg(s.clients[z].x - 8, s.clients[z].y + v.hitBoxes[n][0], s.clients[z].x + 8, s.clients[z].y + v.hitBoxes[n][1], con.x, con.y, data) 
										if (hit != null && con != s.clients[z] && s.clients[z].health > 0 && s.clients[z].team != con.team) {
											boxesHit.push([z, n, hit])
										}
									}
								}
								for (z in s.clipBoxes) {
									var hit = s.hitBoxReg(s.clipBoxes[z].rx, s.clipBoxes[z].ry, s.clipBoxes[z].cx, s.clipBoxes[z].cy, con.x, con.y, data)
									if (hit != null) {
										boxesHit.push([z, null, hit])
									}
								}
								if (boxesHit.length > 0) {
									var index = 0
									var min = boxesHit[0][2]
									for (var z = 1; z < boxesHit.length; z++) {
										if (boxesHit[z][2] != null && boxesHit[z][2] < min) {
											min = boxesHit[z][2]
											index = z
										}
									}
									if (boxesHit[index][1] != null) {
										s.changeHealth(s.clients[boxesHit[index][0]], v.dmg[con.gun] * v.hitBoxes[boxesHit[index][1]][2], con)
									}
								}
								s.send("bullet", [con.name, data, con.gun, (boxesHit.length > 0 ? boxesHit[index][2] : 65536)])
							}
							if (con.ammo == 0) {
								s.reload(con)
							}
						}
					} 
				}
				if (typeFunc[m.type] != undefined) {
					typeFunc[m.type](m.data, con)
					console.log("[" + new Date().toString().split(" GMT")[0] + '] GOT: {client:"' + con.name + '", ' +  'data:"' + m.data + '"}')
				}
			})
			con.on('close', function(r, desc) {
				for (i in s.clients) {
					if (s.clients[i] == con) {
						s.send("disconnect", s.clients[i].name)
						s.clients.splice(i, 1)
					}
				}
				
			})
		})
	},
	genMap: function() {
		const WIDTH = Math.floor(s.mapDim / 64)
		const CORN = Math.ceil(-s.mapDim / 64) * 64
		var map = [[]]
		for (var i = 0; i < WIDTH; i++) {
			map[i] = []
			for (var j = 0; j < WIDTH; j++) {
				map[i][j] = false
			}
		}
		for (var i = 0; i < WIDTH; i += 2) {
			for (var j = 0; j < 2; j++) {
				var b = Math.floor(Math.random() * (WIDTH - 1))
				var e = 1 + b + Math.floor(Math.random() * (WIDTH - b - 1))
				for (var k = b; k <= e; k++) {
					map[(j ? i : k)][(j ? k : i)] = Math.random() < 0.7
				}
			}
		}
		for (i in map) {
			for (j in map[i]) {
				if (map[i][j]) {
					var x = CORN + (i * 128)
					var y = CORN + (j * 128)
					s.clipBoxes.push({rx: x, ry: y, cx: x + 128, cy: y + 128})
				}
			}
		}
	},
	tick: function() {
		if (new Date().getTime() - s.lastSecond >= 1000) { 
			s.lastSecond += 1000
			if (s.ticks < 100) {
				console.log("[" + new Date().toString().split(" GMT")[0] + "] WARNING: " + s.ticks + " UPS") 
			}
			s.ticks = 0
		}
		s.ticks++
		for (i in s.clients) {
			if (s.clients[i].health > 0) {
				var dx = s.addX((s.clients[i].keyPress.a ? 300 : 0) - (s.clients[i].keyPress.d ? 300 : 0), s.clients[i])
				var dy = s.addY((s.clients[i].keyPress.w ? 300 : 0) - (s.clients[i].keyPress.s ? 300 : 0), s.clients[i])
				s.fixCollide(s.clients[i])
				if (dx != s.clients[i].dx || dy != s.clients[i].dy) {
					s.updateVel(s.clients[i], dx, dy)
				}
				s.clients[i].dx = dx
				s.clients[i].dy = dy
				
			}
			s.clients[i].cooldown -= (s.clients[i].cooldown > 0 ? 1 : 0)
			if (s.clients[i].reload > 0) {
				s.clients[i].reload--
				if (s.clients[i].reload == 0) {
					s.changeAmmo(s.clients[i], v.ammo[s.clients[i].gun])
				}
			}
		}
	},
	spawn: function(c) {
		c.x = Math.round(((Math.random() + 1) / 2) * s.mapDim * (c.team ? -1 : 1))
		c.y = Math.round((Math.random() * (s.mapDim * 2)) - s.mapDim)
		c.dx = 0
		c.dy = 0
		c.dir = "Down"
		s.send("moveUpdate",[c.name, c.x, c.y])
		s.send("move", [c.name, c.dx, c.dy, "Down"])
	},
	addX: function(a, c) {
		c.x += a / s.tickRate
		if (Math.abs(c.x) > s.mapDim) {
			c.x = s.mapDim * (c.x > 0 ? 1 : -1)
		}
		return a
	},
	addY: function(a, c) {
		c.y += a / s.tickRate
		if (Math.abs(c.y) > s.mapDim) {
			c.y = s.mapDim * (c.y > 0 ? 1 : -1)
		}
		return a
	},
	fixCollide: function(c) {
		box = s.getCollide(c)
		if (!box) {
			return
		}
		mx = (box.rx + box.cx) / 2
		my = (box.ry + box.cy) / 2
		dmx = c.x - mx
		dmy = c.y - my
		if (Math.abs(dmx) > Math.abs(dmy)) {
			if (dmx > 0) {
			c.dx
				c.x = box.cx + 1
			}
			else {
				c.x = box.rx - 1
			}
		}
		else {
			if (dmy > 0) {
				c.y = box.cy + 1
			}
			else {
				c.y = box.ry - 1
			}
		}
		s.updateCoords(c, c.x, c.y)
	},
	getCollide: function(c) {
		for (b in s.clipBoxes) {
			box = s.clipBoxes[b]
			if (box.rx < c.x &&  box.cx > c.x && box.ry < c.y && box.cy > c.y) {
				return box
			}
		}
		return null
	},
	changeHealth: function(c, val, shooter) {
		if (c.health + val > 0) {
			c.health += val
		}
		else {
			c.health = 0
			c.dir = "Dead"
			c.deaths += 1
			s.send("deaths", [c.name, c.deaths])
			if (shooter != undefined) {
				s.send("killMsg", [c.name, shooter.name, shooter.gun])
				shooter.kills += 1
				s.send("kills", [shooter.name, shooter.kills])
				s.points += v.points[shooter.gun] * (shooter.team ? 1 : -1)
				s.send("points", s.points)
				s.checkWin()
			}
			s.send("moveUpdate", [c.name, c.x, c.y])
			s.send("move", [c.name, 0, 0, c.dir])
		}
		c.sendUTF(JSON.stringify({type : "health", data : c.health}))
	},
	checkWin: function() {
		if (Math.abs(s.points) >= s.clients.length * 2) {
			s.send("win", s.points > 0)
			s.points = 0
			for (var i = s.clients.length - 1; i >= 0; i--) {
				s.clients[i].close()
			}
		}
	},
	changeAmmo: function(c, a) {
		c.ammo = a
		c.sendUTF(JSON.stringify({type : "ammo", data : c.ammo}))
	},
	updateCoords: function(c, x, y) {
		s.send("moveUpdate", [c.name, x, y])
	},
	updateVel: function(c, dx, dy) {
		s.send("move", [c.name, dx, dy, c.dir])
	},
	send: function(t, m) {
		for (x in s.clients){
			s.clients[x].sendUTF(JSON.stringify({type : t, data : m}))
		}
		console.log("[" + new Date().toString().split(" GMT")[0] + '] SEND: {type:"' + t + '", ' +  'data:"' + m + '"}')
	},
	nameValid: function(name) {
		for (i in s.clients) {
			if (s.clients[i].name == name || name.length > 25) {
				return false
			}
		}
		return true
	},
	getMajorityTeam: function() {
		var trueTeam = 0
		var falseTeam = 0
		for (i in s.clients) {
			if (s.clients[i].team != undefined) {
				trueTeam += (s.clients[i].team ? 0 : 1)
				falseTeam += (s.clients[i].team ? 1 : 0)
			}
		}
		return (trueTeam == falseTeam ? Math.random() < 0.5 : trueTeam < falseTeam)
	},
	hitBoxReg: function(rx, ry, cx, cy, px, py, a) {
		if (rx < px && px < cx && ry < py && py < cy) {
			return -1
		}
		if ((((px - rx) * Math.cos(a)) >= 0 || ((px - cx) * Math.cos(a)) >= 0) && (((py - ry) * Math.sin(a)) >= 0 || ((py - cy) * Math.sin(a)) >= 0)) {
			return null
		}
		var out = null
		var p = [px, py]
		var r = [rx, ry]
		var c = [cx, cy]
		for (var i = 0; i < 4; i++) { //0: rx, 1: cx, 2: ry, 3: cy
			var h = Math.floor(i / 2)
			var e = i % 2 == 0
			var t = (i < 2 ? function(n){return 1/Math.tan(n)} : Math.tan)
			var s = (i < 2 ? Math.sin : Math.cos)
			var d = ((e ? r : c)[1 - h] - p[1 - h])
			if (p[h] + d * t(a) >= r[h] && p[h] + d * t(a) <= c[h]) {
				var dist = d / s(a)
				out = (out == null ? dist : Math.min(out, dist))
			}
		}
		return out
	},
	reload: function(c) {
		if (c.reload == 0) {
			c.reload = v.reload[c.gun]
			c.sendUTF(JSON.stringify({type : "reload"}))
		}
	}
}

var Values = {
	gun: ["1", "2", "3"],
	keyToDir: {
		w : "Up",
		s : "Down",
		a : "Left",
		d : "Right"
	},
	inacc: [0.09, 0.35, 0.18],
	cooldown: [30, 17, 20],
	hitBoxes: [
		[8, 20, 1.6],
		[20, 20, 0.6],
		[-14, 8, 1.0],
		[-32, -14, 0.6],
	],
	hitCenters: [14, 20, -3, -23],
	dmg: [-25, -40, -60],
	reload: [50,70,100],
	ammo: [13, 75, 40],
	points: [8, 5, 3]
}

function decode(string) {
	r = ""
	for (i in string) {
		r += (string.charAt(i) == "+" ? " " : string.charAt(i))
	}
	return decodeURIComponent(r)
}

var s = Server
var v = Values

s.init()
