var Server = {
	clients: [],
	tickRate: 100,
	mapDim: 800,
	init: function() {
		s.loop = setInterval(s.tick, (1000 / s.tickRate))
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
							con.name = data
							s.send("connect", con.name)
							s.send("gun", [con.name, con.gun])
							con.sendUTF(JSON.stringify({type : "map", data : s.mapDim}))
							s.updateCoords(con)
							for (i in s.clients) {
								if (s.clients[i] != con) {
									con.sendUTF(JSON.stringify({type : "connect", data : s.clients[i].name}))
								}
								con.sendUTF(JSON.stringify({type : "move", data : [s.clients[i].name, s.clients[i].x, s.clients[i].y, s.clients[i].dir]}))
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
						con.keyPress[data[0]] = data[1]
						if (data[1] && v.keyToDir[data[0]] != undefined) {
							con.dir = v.keyToDir[data[0]]
						}
					},
					respawn: function(data, con) {
						if (con.health == 0) {
							s.changeHealth(con, 100)
							con.x = Math.round((Math.random() * (s.mapDim * 2)) - s.mapDim)
							con.y = Math.round((Math.random() * (s.mapDim * 2)) - s.mapDim)
							con.dir = "Down"
							s.send("move",[con.name, con.x, con.y, con.dir])
						}
					},
					shot: function(data, con) {
						if (con.cooldown + con.reload == 0) {
							if (con.ammo > 0 && con.health > 0) {
								s.changeAmmo(con, con.ammo - 1)
								data = (data + Math.pow(Math.random(), 2) * v.inacc[con.gun] * (Math.random() > 0.5 ? -1 : 1)) + 360 % 360
								s.send("bullet", [con.x, con.y, data, con.gun])
								con.cooldown = v.cooldown[con.gun]
								for (x in s.clients) {
									for (var n = 0; n < 3; n++) {
										if (s.hitBoxReg(s.clients[x].x - 8, s.clients[x].y + v.hitBoxes[n][0], s.clients[x].x + 8, s.clients[x].y + v.hitBoxes[n][1], con.x, con.y, data) && con != s.clients[x] && s.clients[x].health > 0) {
											s.changeHealth(s.clients[x], v.dmg[con.gun] * v.hitBoxes[n][2], con)
										}
									}
								}
							}
							if (con.ammo == 0) {
								s.reload(con)
							}
						}
					} 
				}
				if (typeFunc[m.type] != undefined) {
					typeFunc[m.type](m.data, con)
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
	tick: function() {
		for (i in s.clients) {
			if (s.clients[i].health > 0) {
				if (s.clients[i].keyPress.a && !s.clients[i].keyPress.d) {
					s.addX(3, s.clients[i])
				}
				if (!s.clients[i].keyPress.a && s.clients[i].keyPress.d) {
					s.addX(-3, s.clients[i])
				}
				if (s.clients[i].keyPress.w && !s.clients[i].keyPress.s) {
					s.addY(3, s.clients[i])
				}
				if (!s.clients[i].keyPress.w && s.clients[i].keyPress.s) {
					s.addY(-3, s.clients[i])
				}
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
	addX: function(a, c) {
		c.x += a
		if (Math.abs(c.x) > s.mapDim) {
			c.x = s.mapDim * (c.x > 0 ? 1 : -1)
		}
		s.updateCoords(c)
	},
	addY: function(a, c) {
		c.y += a
		if (Math.abs(c.y) > s.mapDim) {
			c.y = s.mapDim * (c.y > 0 ? 1 : -1)
		}
		s.updateCoords(c)
	},
	changeHealth(c, val, shooter) {
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
			}
			s.send("move", [c.name, c.x, c.y, c.dir])
		}
		c.sendUTF(JSON.stringify({type : "health", data : c.health}))
	},
	changeAmmo: function(c, a) {
		c.ammo = a
		c.sendUTF(JSON.stringify({type : "ammo", data : c.ammo}))
	},
	updateCoords: function(c) {
		s.send("move", [c.name, c.x, c.y, c.dir])
	},
	send: function(t, m) {
		for (x in s.clients){
			s.clients[x].sendUTF(JSON.stringify({type : t, data : m}))
		}
	},
	nameValid: function(name) {
		for (i in s.clients) {
			if (s.clients[i].name == name || name.length > 25) {
				return false
			}
		}
		return true
	},
	hitBoxReg: function(rx, ry, cx, cy, px, py, a) {
		var pairs = [
			[[rx,ry],[rx,cy]],
			[[rx,ry],[cx,ry]],
			[[rx,ry],[cx,cy]],
			[[rx,cy],[cx,ry]],
			[[rx,cy],[cx,cy]],
			[[cx,ry],[cx,cy]]
		]
		var max = 0
		var endPair
		for (i in pairs) {
			pairs[i] = [s.calcAngle(px, py, pairs[i][0][0], pairs[i][0][1]), s.calcAngle(px, py, pairs[i][1][0], pairs[i][1][1])]
			if (s.angleComp(pairs[i][0], pairs[i][1]) > max) {
				max = s.angleComp(pairs[i][0], pairs[i][1])
				endPair = pairs[i]
			}
		}
		return (s.angleComp(a, endPair[0]) + s.angleComp(a, endPair[1]) == max) || (rx < px && cx > px  &&  ry < py && cy > py)
	},
	calcAngle: function(xa, ya, xb, yb) {
		var ang = (xa == xb ? 90 : Math.acos((xb - xa) / Math.sqrt(Math.pow((xa - xb), 2) + Math.pow((ya - yb), 2))) * 180 / Math.PI)
		return (ya > yb ? -1 * ang + 360 : ang)
	},
	reload: function(c) {
		if (c.reload == 0) {
			c.reload = v.reload[c.gun]
			c.sendUTF(JSON.stringify({type : "reload"}))
		}
	},
	angleComp: function(a, b) {return Math.min(((a - b + 360) % 360), ((b - a + 360) % 360));}
}

var Values = {
	gun: ["1", "2", "3"],
	keyToDir: {
		w : "Up",
		s : "Down",
		a : "Left",
		d : "Right"
	},
	inacc: [5, 2, 1],
	cooldown: [30,17,20],
	hitBoxes: [
		[8, 20, 1.6],
		[-14, 8, 1],
		[-32, -14, 0.6],
	],
	dmg: [-25, -40, -60],
	reload: [50,70,100],
	ammo: [13, 75, 40],
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