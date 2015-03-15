(function(){
    'use strict';
    
    const UNIVERSE_SIZE = 400,
        COLLISION_DISTANCE = 3,
        EXPLOSION_TIME = 2000,
        MIN_MASS = 5,
        MAX_MASS = 90,
        G = 0.00667384; // IRL: G / Math.pow(10, 10)
    
    var Space,
        space,
        Particle;
    
    // Space constructor
    Space = function(){
        var spaceElement;
        this.params = {
            window: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
        this.params.window.center = {
            x: Math.round(this.params.window.width / 2),
            y: Math.round(this.params.window.height / 2)
        };  
        this.particles = [];

        spaceElement = document.createElement('div');
        spaceElement.className = 'space';
        this.element = document.createElement('div');
        this.element.style.width = this.params.window.width + 'px';
        this.element.style.height = this.params.window.height + 'px';
        this.element.className = 'canvas';
        spaceElement.appendChild(this.element);
        document.body.appendChild(spaceElement);

        this.render();
        this.step();
    };
    // Generates particle with given parameters
    Space.prototype.generateParticle = function(params) {
        var newParticle = new Particle(utils.extend(params, {
            parent: this
        }));
        this.element.appendChild(newParticle.element);
        this.particles.push(newParticle);
        if (this.particles.length === 1) {
            this.render();
            this.step();
        }
    };
    // Destroys given particle
    Space.prototype.destroyParticle = function(particle){
        this.particles.every(function(curParticle, i) {
            if (curParticle === particle) {
                particle.element.remove();
                this.particles.splice(i, 1);
                return false;
            }
            return true;
        }.bind(this));
    };
    // Returns sum of vector-like objects
    Space.prototype.sumProjections = function(obj1, obj2) {
        return {
            x: obj1.x + obj2.x,
            y: obj1.y + obj2.y
        };
    };
    // Returns distance between points
    Space.prototype.getDistance = function(obj1, obj2) {
        return Math.sqrt(Math.pow(obj1.x - obj2.x, 2) + Math.pow(obj1.y - obj2.y, 2));
    };
    // Renders particles and launches cycle
    Space.prototype.render = function() {
        this.particles.forEach(function(curParticle) {
            curParticle.render();
        });
        if (this.particles.length) {
            window.requestAnimationFrame(this.render.bind(this));
        }
    };
    // Calculates new particles position/state
    Space.prototype.step = function() {
        // count speed
        this.particles.forEach(function(curParticle) {
            var forcesList = [];
            var collided = false;
            this.particles.forEach(function(otherParticle) {
                var distance;
                if (
                    otherParticle === curParticle ||
                    curParticle.state.value === 'destroyed' ||
                    otherParticle.state.value === 'destroyed'
                ) {
                    return;
                }
                distance = curParticle.parent.getDistance(curParticle, otherParticle);
                if (distance <= COLLISION_DISTANCE) {
                    collided = true;
                }
                if (
                    curParticle.state.value !== 'newBorn' &&
                    otherParticle.state.value !== 'newBorn'
                ) {
                    if (distance <= COLLISION_DISTANCE) {
                        curParticle.collision(otherParticle);
                    } else {
                        forcesList.push(curParticle.getForce(otherParticle));
                    }
                }
            });
            if (curParticle.state.value === 'destroyed') {
                return;
            }
            if (curParticle.state.value === 'newBorn' && !collided) {
                curParticle.state.set('default');
            }
            if (forcesList.length) {
                var sumForce = forcesList.reduce(this.sumProjections),
                    boost = {
                        x: sumForce.x / curParticle.mass,
                        y: sumForce.y / curParticle.mass
                    };
                curParticle.speed = this.sumProjections(curParticle.speed, boost);
            }
        }.bind(this));
        // apply speed
        this.particles.forEach(function(curParticle) {
            curParticle.move();
            // explosion
            if (curParticle.mass > MAX_MASS && ['exploding', 'destroyed'].indexOf(curParticle.state.value) === -1) {
                curParticle.delayedExplosion();
            }
        });
        // next step
        if (this.particles.length) {
            setTimeout(this.step.bind(this), 1000 / 60);
        }
    };

    // Particle constructor
    Particle = function(params) {
        this.parent = params.parent;
        this.state = utils.observableValue('newBorn'); // ['newBorn', 'default', exploding', 'destroyed']
        this.timeouts = {};
        this.x = params.x;
        this.y = params.y;
        this._oldX = null;
        this._oldY = null;
        this.speed = this.getProjectionValue(params.speed, utils.angle.toRad(params.dir));
        this.mass = params.mass;
        this._oldMass = null;
        this.element = document.createElement('p');
        this.state.onChange(function(state){
            this.element.className = state;
        }.bind(this));
        this.render();
    };
    // Collides particle with another given particle
    Particle.prototype.collision = function(otherParticle) {
        var carrier,
            provider;
        // particle with bigger mass wins
        if (this.mass > otherParticle.mass) {
            carrier = this;
            provider = otherParticle;
        } else {
            carrier = otherParticle;
            provider = this;
        }
        
        carrier.speed.x = (this.speed.x * this.mass + otherParticle.speed.x * otherParticle.mass) / (this.mass + otherParticle.mass);
        carrier.speed.y = (this.speed.y * this.mass + otherParticle.speed.y * otherParticle.mass) / (this.mass + otherParticle.mass);
        
        carrier._oldMass = carrier.mass;
        carrier.mass += provider.mass;
        provider.destroy();
    };
    // Returns value of gravity force relative to given particle
    Particle.prototype.getForce = function(otherParticle) {
        var distance = this.parent.getDistance(this, otherParticle),
            force,
            dir;
        if (!distance) {
            force = 0;
        } else {
            force = G * this.mass * otherParticle.mass / Math.pow(distance, 2);
            dir = Math.atan((this.y - otherParticle.y) / (this.x - otherParticle.x));
            if (this.x > otherParticle.x) {
                dir += utils.angle.PI;
            }
        }
        return this.getProjectionValue(force, dir);
    };
    // Calculates new particle's position
    Particle.prototype.move = function() {
        this._oldX = this.x;
        this._oldY = this.y;
        this.x += this.speed.x;
        this.y += this.speed.y;
        // limit particles spread by UNIVERSE_SIZE
        if (this.parent.getDistance(this, this.parent.params.window.center) >= UNIVERSE_SIZE) {
            ['x', 'y'].forEach(function(axis) {
                if ((this[axis] - this.parent.params.window.center[axis]) * this.speed[axis] > 0) {
                    if (this.speed[axis] > 0) {
                        this.speed[axis] = Math.max(0, this.speed[axis] - Math.max(this.speed[axis] * 0.01, 0.001));
                    } else {
                        this.speed[axis] = Math.min(0, this.speed[axis] - Math.min(this.speed[axis] * 0.01, -0.001));
                    }
                }
            }.bind(this));
        }
    };
    // Returns section's projection on a given axis
    Particle.prototype.getProjectionValue = function(value, angleRad, axis) {
        var result = {};
        if (!axis || axis === 'x') {
            result.x = value * Math.cos(angleRad);
        }
        if (!axis || axis === 'y') {
            result.y = value * Math.sin(angleRad);
        }
        return result;
    };
    // Renders current particle's position and size
    Particle.prototype.render = function() {
        if (this._oldMass !== this.mass) {
            this.element.style.boxShadow = '0 0 3px ' + Math.min(4, Math.ceil(this.mass * 0.05, 0)) + 'px';
        }
        if (
            utils.round(this._oldX, 6) !== utils.round(this.x, 6) ||
            utils.round(this._oldY, 6) !== utils.round(this.y, 6)
        ) {
            this.element.style.transform = 'translate(' + utils.round(this.x, 0) + 'px,' + utils.round(this.y, 0) + 'px)';
        }
    };
    // Destroys particle
    Particle.prototype.destroy = function() {
        Object.keys(this.timeouts).forEach(function(key){
            if (this.timeouts[key]) {
                clearTimeout(this.timeouts[key]);
            }
        }.bind(this));
        this.timeouts = {};
        this.parent.destroyParticle(this);
        this.state.set('destroyed');
    };
    // Sets particle's delayed wxplosion
    Particle.prototype.delayedExplosion = function(delay){
        delay = delay || EXPLOSION_TIME;
        this.timeouts.explosion = setTimeout(this.explode.bind(this), delay);
        this.state.set('exploding');
    };
    // Explodes particle into smaller parts and destroys it
    Particle.prototype.explode = function(){
        this.splitMass().forEach(function(mass){
            this.parent.generateParticle({
                x: this.x,
                y: this.y,
                mass: mass,
                speed: utils.random.number(4, 50) / 100,
                dir: utils.random.number(0, 360)
            });
        }.bind(this));
        this.destroy();
    };
    // Returns a random array of masses, which sum is equal to the particles mass
    Particle.prototype.splitMass = function(){
        var masses = [],
            particlesCount = Math.floor(this.mass / MIN_MASS),
            remainingMass = this.mass % MIN_MASS,
            randomPick;
        for (var i = 0; i < particlesCount; i++) {
            masses.push(MIN_MASS);
        }
        while (remainingMass) {
            randomPick = utils.random.number(1, remainingMass);
            masses[utils.random.number(0, particlesCount - 1)] += randomPick;
            remainingMass -= randomPick;
        }
        return masses;
    };
    
    space = new Space();
    
    space.generateParticle({
        x: space.params.window.center.x,
        y: space.params.window.center.y,
        dir: 0,
        speed: 0,
        mass: 800 // some kind of a big bang
    });
    
})();
