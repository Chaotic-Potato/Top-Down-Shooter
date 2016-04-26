var Server = {
	clients: [],
	tickRate: 100,
	mapDim: 1600,
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
			con.dir = "Down"
			con.keyPress = {
				w : false,
				s : false,
				a : false,
				d : false,
				1 : false,
				2 : false,
				3 : false
			}
			con.on('message', function(message) {
				var m = JSON.parse(message.utf8Data)
				typeFunc = {
					init: function(data, con) {
						if (s.nameValid(data)) {
							con.name = data
							s.send("connect", con.name)
							con.sendUTF(JSON.stringify({type : "map", data : s.mapDim}))
							s.updateCoords(con)
							for (i in s.clients) {
								if (s.clients[i] != con) {
									con.sendUTF(JSON.stringify({type : "connect", data : s.clients[i].name}))
								}
								con.sendUTF(JSON.stringify({type : "move", data : [s.clients[i].name, s.clients[i].x, s.clients[i].y, s.clients[i].dir]}))
							}
						}
						else {
							con.sendUTF("Name Invalid!")
							con.close()
							return
						}
					},
					key: function(data, con) {
						var gun = ["1", "2", "3"]
						if (gun.indexOf(data[0]) != -1 && data[1]) {
							con.gun = gun.indexOf(data[0])
							con.sendUTF(JSON.stringify({type : "gun", data : gun.indexOf(data[0])}))
						}
						else
						var keyToDir = {
							w : "Up",
							s : "Down",
							a : "Left",
							d : "Right"
						}
						con.keyPress[data[0]] = data[1]
						if (data[1] && gun.indexOf(data[0]) == -1) {
							con.dir = keyToDir[data[0]]
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
						s.send("bullet", [con.x, con.y, data])
						var hitBoxes = [
							[-9, 7, 9, 21, 1.6],
							[-9, -15, 9, 9, 1],
							[-9, -33, 9, -13, 0.6],
						]
						var guns = [-25, -40, -60]
						for (x in s.clients) {
							for (var n = 0; n < 3; n++) {
								if (s.hitBoxReg(s.clients[x].x + hitBoxes[n][0], s.clients[x].y + hitBoxes[n][1], s.clients[x].x + hitBoxes[n][2], s.clients[x].y + hitBoxes[n][3], con.x, con.y, data) && con != s.clients[x] && s.clients[x].health > 0) {
									s.changeHealth(s.clients[x], guns[con.gun] * hitBoxes[n][4])
								}
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
	changeHealth(c, val) {
		if (c.health + val > 0) {
			c.health += val
		}
		else {
			c.health = 0
			c.dir = "Dead"
			s.send("move", [c.name, c.x, c.y, c.dir])
		}
		c.sendUTF(JSON.stringify({type : "health", data : c.health}))
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
	angleComp: function(a, b) {return Math.min(((a - b + 360) % 360), ((b - a + 360) % 360));}
}

function decode(string) {
	r = ""
	for (i in string) {
		r += (string.charAt(i) == "+" ? " " : string.charAt(i))
	}
	return decodeURIComponent(r)
}

var s = Server

s.init()