(function() {
    'use strict';

    const COLLISION_DISTANCE = 3,
        EXPLOSION_TIME = 2000,
        MIN_MASS = 5,
        MAX_MASS = 90,
        G = 0.00667384; // IRL: G / Math.pow(10, 10)

    /**
     * Space constructor
     * @constructor
     */
    var Space = function() {
        this.universeSize = Math.min(window.innerWidth, window.innerHeight);
        this.universeCenter = [this.universeSize / 2, this.universeSize / 2, 0];
        this.particles = [];

        var spaceElement = document.createElement('div');
        spaceElement.className = 'space';
        this.element = document.createElement('div');
        this.element.style.width = this.universeSize + 'px';
        this.element.style.height = this.universeSize + 'px';
        this.element.className = 'universe';
        spaceElement.appendChild(this.element);
        document.body.appendChild(spaceElement);
    };

    /**
     * Generates particle with given parameters
     * @param {Object} params
     */
    Space.prototype.generateParticle = function(params) {
        var newParticle = new Particle(Object.assign(params, {
            parent: this
        }));
        this.element.appendChild(newParticle.element);
        this.particles.push(newParticle);
    };

    /**
     * Destroys given particle
     * @param {Particle} particle
     */
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

    /**
     * Returns distance between points
     * @param {Array} vector1
     * @param {Array} vector2
     * @returns {number}
     */
    Space.prototype.getDistance = function(vector1, vector2) {
        return Math.sqrt(
            vector1
                .map(function(value, i) {
                    return Math.pow(value - vector2[i], 2);
                })
                .reduce(function(prev, current) {
                    return prev + current;
                })
        );
    };

    /**
     * Renders particles and launches cycle
     */
    Space.prototype.render = function() {
        this.particles.forEach(function(curParticle) {
            curParticle.render();
        });
        if (this.particles.length) {
            window.requestAnimationFrame(this.render.bind(this));
        }
    };

    /**
     * Calculates new particles position/state
     */
    Space.prototype.step = function() {
        // count speed
        this.particles.forEach(function(curParticle) {
            var forcesList = [];
            var collided = false;
            this.particles.forEach(function(otherParticle) {
                if (
                    otherParticle === curParticle ||
                    curParticle.state.value === 'destroyed' ||
                    otherParticle.state.value === 'destroyed'
                ) {
                    return;
                }
                var distance = this.getDistance(curParticle.pos, otherParticle.pos);
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
            }, this);
            if (curParticle.state.value === 'destroyed') {
                return;
            }
            if (curParticle.state.value === 'newBorn' && !collided) {
                curParticle.state.set('default');
            }
            if (forcesList.length) {
                var sumForce = forcesList.reduce(utils.vectors.add);
                var boost = sumForce.map(function(value) {
                    return value / curParticle.mass;
                });
                curParticle.speed = utils.vectors.add(curParticle.speed, boost);
            }
        }, this);
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

    /**
     * Particle constructor
     * @param {Object} params
     * @constructor
     */
    var Particle = function(params) {
        this.parent = params.parent;
        this.state = utils.observableValue('newBorn'); // ['newBorn', 'default', exploding', 'destroyed']
        this.timeouts = {};
        this.pos = params.pos;
        this._oldPos = [];
        this.speed = params.dir.map(function(value) {
            return value * params.speed
        });

        this.mass = params.mass;
        this._oldMass = null;
        this.element = document.createElement('p');
        this.state.onChange(function(state){
            this.element.className = state;
        }.bind(this));
        this.render();
    };

    /**
     * Collides particle with another given particle
     * @param {Particle} otherParticle
     */
    Particle.prototype.collision = function(otherParticle) {
        var carrier;
        var provider;
        // particle with bigger mass wins
        if (this.mass > otherParticle.mass) {
            carrier = this;
            provider = otherParticle;
        } else {
            carrier = otherParticle;
            provider = this;
        }

        var commonMass = carrier.mass + provider.mass;
        carrier.speed = carrier.speed.map(function(value, i) {
            return (value * carrier.mass + provider.speed[i] * provider.mass) / commonMass;
        });

        carrier._oldMass = carrier.mass;
        carrier.mass = commonMass;
        provider.destroy();
    };

    /**
     * Returns value of gravity force relative to given particle
     * @param {Particle} otherParticle
     * @returns {Array}
     */
    Particle.prototype.getForce = function(otherParticle) {
        var distance = this.parent.getDistance(this.pos, otherParticle.pos);
        if (!distance) {
            return [0, 0, 0];
        } else {
            var force = G * this.mass * otherParticle.mass / Math.pow(distance, 2);
            var dir = this.pos.map(function(value, i) {
                return otherParticle.pos[i] - value;
            });
            dir = this.getNormalizedVector(dir);

            return dir.map(function(value) {
                return value * force;
            });
        }
    };

    /**
     * Calculates particle's new position
     */
    Particle.prototype.move = function() {
        this._oldPos = this.pos.slice();
        this.pos = this.pos.map(function(value, i) {
            return value + this.speed[i];
        }, this);
        // limit particles spread by universe size
        if (this.parent.getDistance(this.pos, this.parent.universeCenter) >= this.parent.universeSize / 2) {
            this.pos.forEach(function(value, i) {
                if ((value - this.parent.universeCenter[i]) * this.speed[i] > 0) {
                    this.speed[i] = Math.max(
                        0,
                        this.speed[i] - Math.max(this.speed[i] * 0.01, this.speed[i] > 0 ? 0.001 : -0.001)
                    );
                }
            }, this);
        }
    };

    /**
     * Returns normalized vector
     * @param {Array} vector
     * @returns {Array}
     */
    Particle.prototype.getNormalizedVector = function(vector) {
        var vectorSize = Math.sqrt(vector.reduce(function(result, value) {
            return result + Math.pow(value, 2);
        }, 0));
        return vector.map(function(value) {
            return value / vectorSize;
        });
    };

    /**
     * Renders current particle's position and size
     */
    Particle.prototype.render = function() {
        if (this._oldMass !== this.mass) {
            this.element.style.boxShadow = '0 0 3px ' + Math.min(4, Math.ceil(this.mass * 0.05)) + 'px';
        }
        if (
            this.pos.some(function(value, i) {
                return utils.round(value, 6) !== utils.round(this._oldPos[i], 6);
            }, this)
        ) {
            this.element.style.transform = 'translate3d(' +
                this.pos.map(function(value) {
                    return utils.round(value, 0) + 'px';
                }).join(',') +
            ')';
        }
    };

    /**
     * Destroys particle
     */
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

    /**
     * Sets particle's delayed explosion
     * @param {number} delay
     */
    Particle.prototype.delayedExplosion = function(delay){
        delay = delay || EXPLOSION_TIME;
        this.timeouts.explosion = setTimeout(this.explode.bind(this), delay);
        this.state.set('exploding');
    };

    /**
     * Explodes particle into smaller parts and destroys it
     */
    Particle.prototype.explode = function(){
        this.splitMass().forEach(function(mass){
            this.parent.generateParticle({
                pos: this.pos.slice(),
                mass: mass,
                speed: utils.random.number(4, 100) / 100,
                dir: this.getNormalizedVector([
                    utils.random.number(-100, 100),
                    utils.random.number(-100, 100),
                    utils.random.number(-100, 100)
                ])
            });
        }, this);
        this.destroy();
    };

    /**
     * Returns a random array of masses, which sum is equal to the particles mass
     * @returns {Array}
     */
    Particle.prototype.splitMass = function() {
        var masses = [];
        var particlesCount = Math.floor(this.mass / MIN_MASS);
        var remainingMass = this.mass % MIN_MASS;
        for (var i = 0; i < particlesCount; i++) {
            masses.push(MIN_MASS);
        }
        while (remainingMass) {
            var randomPick = utils.random.number(1, remainingMass);
            masses[utils.random.number(0, particlesCount - 1)] += randomPick;
            remainingMass -= randomPick;
        }
        return masses;
    };

    var space = new Space();
    space.generateParticle({
        dir: [0, 0, 0],
        pos: space.universeCenter.slice(),
        speed: 0,
        mass: 800 // some kind of a big bang
    });
    space.render();
    space.step();
})();
