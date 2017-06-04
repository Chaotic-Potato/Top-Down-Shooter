var Bullet = function(name, a, gun, dist) {
	var sounds = ["pistol", "smg", "rifle"]
	this.x = 0
	this.y = 0
	this.relX = 0
	this.relY = 0
	this.name = name
	this.audio = document.createElement("audio")
	this.audio.innerHTML = "<source  src='Sounds/" + sounds[gun]  +".wav'>"
	this.audio.volume = Math.pow(750 / ((Math.pow(Math.pow((c.x - c.getPlayer(name).x), 2) + Math.pow((c.y - c.getPlayer(name).y), 2), 1/2)) + 750), 2)
	this.velX = Math.cos(a) * 300
	this.velY = Math.sin(a) * 300
	this.age = 0
	this.dist = dist
	this.audio.play()
}

Bullet.prototype = {
	tick: function() {
		this.age++
		this.relX += this.velX
		this.relY += this.velY
		if (c.getPlayer(this.name) != false) {
			this.x = this.relX + c.getPlayer(this.name).x
			this.y = this.relY + c.getPlayer(this.name).y
		}
		else {
			this.age = 100
		}
	}
}
