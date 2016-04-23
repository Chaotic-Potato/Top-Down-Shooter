var Server = {
	clients: [],
	tickRate: 100,
	mapDim: 3200,
	init: function() {
		s.loop = setInterval(s.tick, (1000 / s.tickRate))
		s.WebSocketServer = require('websocket').server
		s.http =  require("http") 
		s.server = s.http.createServer(function(res, req){}).listen(6666)
		s.wsServer = new s.WebSocketServer({
			httpServer: s.server,
			autoAcceptcons: false
		})
		s.wsServer.on('request', function(r) {
			var con = r.accept('echo-protocol', r.origin)
			s.clients.push(con)
			con.x = 0
			con.y = 0
			con.dir = "Down"
			con.keyPress = {
				"w" : false,
				"s" : false,
				"a" : false,
				"d" : false,
			}
			con.on('message', function(message) {
				var m = JSON.parse(message["utf8Data"])
				typeFunc = {
					"init": function(data, con) {
						if (s.nameValid(data)) {
							con.name = data
							s.send("connect", con.name)
							con.sendUTF(JSON.stringify({"type" : "map", "data" : s.mapDim}))
							s.updateCoords(con)
							for (i in s.clients) {
								if (s.clients[i] != con) {
									con.sendUTF(JSON.stringify({"type" : "connect", "data" : s.clients[i].name}))
								}
								con.sendUTF(JSON.stringify({"type" : "move", "data" : [s.clients[i].name, s.clients[i].x, s.clients[i].y, s.clients[i].dir]}))
							}
						}
						else {
							con.sendUTF("Name Invalid!")
							con.close()
							return
						}
						
					},
					"key": function(data, con) {
						var keyToDir = {
							"w" : "Up",
							"s" : "Down",
							"a" : "Left",
							"d" : "Right"
						}
						con.keyPress[data[0]] = data[1]
						if (data[1]) {
							con.dir = keyToDir[data[0]]
						}
					}
				}
				if (typeFunc[m["type"]] != undefined) {
					typeFunc[m["type"]](m["data"], con)
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
			if (s.clients[i].keyPress["a"] && !s.clients[i].keyPress["d"]) {
				s.addX(3, s.clients[i])
			}
			if (!s.clients[i].keyPress["a"] && s.clients[i].keyPress["d"]) {
				s.addX(-3, s.clients[i])
			}
			if (s.clients[i].keyPress["w"] && !s.clients[i].keyPress["s"]) {
				s.addY(3, s.clients[i])
			}
			if (!s.clients[i].keyPress["w"] && s.clients[i].keyPress["s"]) {
				s.addY(-3, s.clients[i])
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
	updateCoords: function(c) {
		s.send("move", [c.name, c.x, c.y, c.dir])
	},
	send: function(t, m) {
		for (x in s.clients){
			s.clients[x].sendUTF(JSON.stringify({"type" : t, "data" : m}))
		}
	},
	nameValid: function(name) {
		for (i in s.clients) {
			if (s.clients[i].name == name || name.length > 25) {
				return false
			}
		}
		return true
	}
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