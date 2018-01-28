var Bullet = function(name, a, gun, end) {
	var sounds = ["pistol", "smg", "rifle"]
	this.x = c.getPlayer(name).x
	this.y = c.getPlayer(name).y
	this.relX = 0
	this.relY = 0
	this.name = name
	this.audio = document.createElement("audio")
	this.audio.innerHTML = "<source  src='Sounds/" + sounds[gun]  +".wav'>"
	this.audio.volume = Math.pow(750 / ((Math.pow(Math.pow((c.x - c.getPlayer(name).x), 2) + Math.pow((c.y - c.getPlayer(name).y), 2), 1/2)) + 750), 2)
	this.speed = 150
	this.velX = Math.cos(a + Math.PI)
	this.velY = Math.sin(a + Math.PI)
	this.dist = 0
	this.render = c.getPlayer(this.name) != false
	this.end = end
	this.audio.play()
}

Bullet.prototype = {
	tick: function() {
		if (this.dist == this.end) {
			this.render = false
		}
		this.dist = Math.min(this. dist + this.speed, this.end)			
	}
}
