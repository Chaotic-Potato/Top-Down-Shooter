var Render = {
	canvas: document.getElementById("canvas"),
	context: document.getElementById("canvas").getContext("2d"),
	map: document.getElementById("map"),
	mapContext: document.getElementById("map").getContext("2d"),
	tick: function() {
		r.clear()
		r.clipBoxes()
		r.background()
		r.border()
		r.bullets()
		r.players()
		r.names()
		r.health()
		r.ammo()
		r.inventory()
		if (r.showScore) {
			r.score()
		}
		r.map()
		r.points()
		r.msgs()
		window.requestAnimationFrame(r.tick)
	},
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
				r.drawImage(("player" + c.players[i].dir + (c.players[i].team == c.getPlayer(c.name).team ? "Blue" : "Red")), r.getOffsetX() - 32 - c.players[i].x, r.getOffsetY() - 32 - c.players[i].y, 64, 64)
				r.drawImage(gun[c.players[i].gun], r.getOffsetX() - 16 - c.players[i].x, r.getOffsetY() - 80 - c.players[i].y, 32, 32)
			}
		}
		r.drawImage("player" + c.dir + "Blue", Math.round(window.innerWidth / 2) - 32, Math.round(window.innerHeight / 2) - 32, 64, 64)
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
		r.context.fillStyle = "rgba(221, 221, 221, 0.9)"
		r.context.fillRect(20, 20, 201, 201)
		for (i in c.players) {
			if (c.players[i].name == c.name) {
				r.context.fillStyle = "#3C3"
			}
			else {
				r.context.fillStyle = (c.players[i].team == c.getPlayer(c.name).team ? "#33C" : "#C33")
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
			r.context.fillText(c.players[i].name,r.getOffsetX() - c.players[i].x, r.getOffsetY() - c.players[i].y - 40)
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
	clipBoxes: function() {
		for (i in c.clipBoxes) {
			r.context.fillStyle = "rgba(0, 0, 0, 1)"
			box = c.clipBoxes[i]
			r.drawImage("crate", c.x + window.innerWidth / 2 - box.cx, c.y + window.innerHeight / 2 - box.cy, box.cx - box.rx, box.cy - box.ry)
		}
	},
	health: function() {
		r.context.font = "24px Courier New"
		r.context.textAlign = "left"
		r.context.fillStyle = "#000"
		r.context.fillText(c.health + "/100", 10, window.innerHeight - 10)
	},
	ammo: function() {
		var ammo = [13, 75, 40]
		r.context.font = "24px Courier New"
		r.context.textAlign = "right"
		r.context.fillStyle = "#000"
		r.context.fillText(c.ammo + "/" + ammo[c.getPlayer(c.name).gun], window.innerWidth - 10, window.innerHeight - 10)
	},
	bullets: function () {
		for (i in c.bullets) {
			c.bullets[i].tick()
		 	if (c.bullets[i].render) {
				r.context.strokeStyle = "rgba(127, 127, 127, 1)"
				r.context.beginPath()
				r.context.lineWidth = 5
				let x = c.bullets[i].x - c.x + window.innerWidth / 2
				let y = c.bullets[i].y - c.y + window.innerHeight / 2
				r.context.moveTo(x + c.bullets[i].velX * Math.max(0, c.bullets[i].dist - 3 * c.bullets[i].speed), y + c.bullets[i].velY * Math.max(0, c.bullets[i].dist - 3 * c.bullets[i].speed))
				r.context.lineTo(x + c.bullets[i].velX * Math.min(c.bullets[i].dist, c.bullets[i].end), y + c.bullets[i].velY * Math.min(c.bullets[i].dist, c.bullets[i].end))
				r.context.stroke()
				r.context.lineWidth = 1
				r.context.strokeStyle = "rgba(0, 0, 0, 1)"
			}
		}
		for (var i = c.bullets.length - 1; i > -1; i--) {
			if (!c.bullets[i].render && c.bullets[i].audio.currentTime == c.bullets[i].audio.duration) {
				c.bullets.splice(i, 1)
			}
		}
	},
	background: function() {
		get("body").style.backgroundPosition  = c.x + " " + c.y
		var alpha = 0.3
		r.context.fillStyle = "rgba(" + (c.getPlayer(c.name).team ? "255, 0, 0" : "0, 0, 255") + ", " + alpha + ")"
		r.context.fillRect(0, 0, Math.min(window.innerWidth / 2 + c.x, window.innerWidth), window.innerHeight)
		r.context.fillStyle = "rgba(" + (c.getPlayer(c.name).team ? "0, 0, 255" : "255, 0, 0") + ", " + alpha + ")"
		r.context.fillRect(Math.max(window.innerWidth / 2 + c.x, 0), 0, window.innerWidth, window.innerHeight)

	},
	getOffsetX: function() {
		return Math.round(window.innerWidth / 2) + c.x
	},
	getOffsetY: function() {
		return Math.round(window.innerHeight / 2) + c.y 
	},
	drawImage: function(id, x, y, w, h) {
		if (get(id) != undefined && get(id).tagName == "IMG") {
			r.context.drawImage(get(id), x, y, w, h)
		}
		else {
			console.error("Tried to draw with non-image object: " + id)
		}
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
		r.context.fillText("NAME", window.innerWidth / 2 - (width /2), 170)
		r.context.fillText("KLL", window.innerWidth / 2 + (width /2) - 110, 170)
		r.context.fillText("DTH", window.innerWidth / 2 + (width /2) - 50, 170)
		for (i in c.players) {
			r.context.fillStyle = "rgba(0, 0, 0, 0.5)"
			r.context.fillText(c.players[i].name, window.innerWidth / 2 - (width /2), 195 + (25 * i))
			r.context.fillText(c.players[i].kills, window.innerWidth / 2 + (width /2) - 110, 195 + (25 * i))
			r.context.fillText(c.players[i].deaths, window.innerWidth / 2 + (width /2) - 50, 195 + (25 * i))
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
			r.context.textAlign = "right"
			r.context.fillText(c.killMsgs[i][1] + "   " + c.killMsgs[i][0], window.innerWidth - 20 , 38 + (i * 25))
			r.drawImage(gun[c.killMsgs[i][2]], (window.innerWidth - r.context.measureText(c.killMsgs[i][0]).width - 55), 15 + (i * 25), 32, 32)
			
		}
	},
	points: function() {
		r.context.strokeStyle = (c.points >= 0 ? "#00F" : "#F00")
		r.context.textAlign = "left"
		r.context.fillText(Math.abs(c.points) + " / " + c.players.length * 50, 20, 250)
		r.context.strokeStyle = "#000"
		r.context.beginPath()
		r.context.moveTo(19, 259)
		r.context.lineTo(121, 259)
		r.context.lineTo(121, 286)
		r.context.lineTo(19, 286)
		r.context.lineTo(19, 259)
		r.context.stroke()
		r.context.fillStyle = "#aaa"
		r.context.fillRect(20, 260, 100, 25)
		r.context.fillStyle = (c.points >= 0 ? "#00F" : "#F00")
		r.context.fillRect(20, 260,Math.min(100, Math.abs(c.points)), 25)
	},
	clear: function() {
		r.context.clearRect(0, 0, r.canvas.width, r.canvas.height)
	}
}

var r = Render
window.onresize = r.resize
r.resize()
