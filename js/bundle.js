(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Utils_1 = require('./Utils');
var constants_1 = require('./constants');
/**
 * Particle constructor
 * @param {Object} params
 * @constructor
 */
var Particle = (function () {
    function Particle(params, parent) {
        var _this = this;
        this.parent = parent;
        this.state = Utils_1.default.observableValue('new-born'); // ['new-born', 'default', exploding', 'destroyed']
        this.timeouts = {};
        this.pos = params.pos;
        this.oldPos = [];
        this.speed = params.dir.map(function (value) { return value * params.speed; });
        this.mass = params.mass;
        this.oldMass = null;
        this.element = document.createElement('p');
        this.state.onChange(function (state) {
            _this.element.className = state;
        });
        this.render();
    }
    /**
     * Collides particle with another given particle
     * @param {Particle} otherParticle
     */
    Particle.prototype.collision = function (otherParticle) {
        var carrier;
        var provider;
        // particle with bigger mass wins
        if (this.mass > otherParticle.mass) {
            carrier = this;
            provider = otherParticle;
        }
        else {
            carrier = otherParticle;
            provider = this;
        }
        var commonMass = carrier.mass + provider.mass;
        carrier.speed = carrier.speed.map(function (value, i) { return (value * carrier.mass + provider.speed[i] * provider.mass) / commonMass; });
        carrier.oldMass = carrier.mass;
        carrier.mass = commonMass;
        provider.destroy();
    };
    /**
     * Returns value of gravity force relative to given particle
     * @param {Particle} otherParticle
     * @returns {Array}
     */
    Particle.prototype.getForce = function (otherParticle) {
        var distance = Utils_1.default.Vector.getDistance(this.pos, otherParticle.pos);
        if (!distance) {
            return [0, 0, 0];
        }
        else {
            var force = constants_1.default.G * this.mass * otherParticle.mass / Math.pow(distance, 2);
            var dir = this.pos.map(function (value, i) { return otherParticle.pos[i] - value; });
            dir = Utils_1.default.Vector.normalize(dir);
            return dir.map(function (value) { return value * force; });
        }
    };
    /**
     * Calculates particle's new position
     */
    Particle.prototype.move = function () {
        var _this = this;
        this.oldPos = this.pos.slice();
        this.pos = this.pos.map(function (value, i) { return value + _this.speed[i]; });
        // limit particles spread by universe size
        if (Utils_1.default.Vector.getDistance(this.pos, this.parent.universeCenter) >= this.parent.universeSize / 2) {
            this.pos.forEach(function (value, i) {
                if ((value - _this.parent.universeCenter[i]) * _this.speed[i] > 0) {
                    _this.speed[i] = Math.max(0, _this.speed[i] - Math.max(_this.speed[i] * 0.01, _this.speed[i] > 0 ? 0.001 : -0.001));
                }
            });
        }
    };
    /**
     * Renders current particle's position and size
     */
    Particle.prototype.render = function () {
        var _this = this;
        if (this.oldMass !== this.mass) {
            this.element.style.boxShadow = "0 0 3px " + Math.min(4, Math.ceil(this.mass * 0.05)) + "px";
        }
        if (this.pos.some(function (value, i) { return Utils_1.default.round(value, 6) !== Utils_1.default.round(_this.oldPos[i], 6); })) {
            // rotate particles so that they always look "at us"
            this.element.style.transform =
                "translate3d(" + this.pos.map(function (value) { return Utils_1.default.round(value, 0) + 'px'; }).join(',') + ")\n                rotate3d(" + constants_1.default.ROTATION_VECTOR + ", -" + Utils_1.default.round(this.parent.rotationAngle, 2) + "deg)";
        }
    };
    /**
     * Destroys particle
     */
    Particle.prototype.destroy = function () {
        var _this = this;
        Object.keys(this.timeouts).forEach(function (key) {
            if (_this.timeouts[key]) {
                clearTimeout(_this.timeouts[key]);
            }
        });
        this.timeouts = {};
        this.parent.destroyParticle(this);
        this.state.set('destroyed');
    };
    /**
     * Sets particle's delayed explosion
     * @param {number} delay
     */
    Particle.prototype.delayedExplosion = function (delay) {
        delay = delay || constants_1.default.EXPLOSION_TIME;
        this.timeouts.explosion = setTimeout(this.explode.bind(this), delay);
        this.state.set('exploding');
    };
    /**
     * Explodes particle into smaller parts and destroys it
     */
    Particle.prototype.explode = function () {
        var _this = this;
        this.splitMass().forEach(function (mass) {
            _this.parent.generateParticle({
                pos: _this.pos.slice(),
                mass: mass,
                speed: Utils_1.default.Random.number(4, 100) / 100,
                dir: Utils_1.default.Vector.normalize([
                    Utils_1.default.Random.number(-100, 100),
                    Utils_1.default.Random.number(-100, 100),
                    Utils_1.default.Random.number(-100, 100)
                ])
            });
        });
        this.destroy();
    };
    /**
     * Returns a random array of masses, which sum is equal to the particles mass
     * @returns {Array}
     */
    Particle.prototype.splitMass = function () {
        var particlesCount = Math.floor(this.mass / constants_1.default.MIN_MASS);
        var masses = new Array(particlesCount);
        masses.fill(constants_1.default.MIN_MASS);
        var remainingMass = this.mass % constants_1.default.MIN_MASS;
        while (remainingMass) {
            var randomPick = Utils_1.default.Random.number(1, remainingMass);
            masses[Utils_1.default.Random.number(0, particlesCount - 1)] += randomPick;
            remainingMass -= randomPick;
        }
        return masses;
    };
    return Particle;
})();
exports.default = Particle;

},{"./Utils":3,"./constants":4}],2:[function(require,module,exports){
var Particle_1 = require('./Particle');
var Utils_1 = require('./Utils');
var constants_1 = require('./constants');
var rotationStep = (360 / constants_1.default.ROTATION_TIME) * (1 / 60);
/**
 * Space constructor
 * @constructor
 */
var Space = (function () {
    function Space() {
        this.universeSize = Math.min(window.innerWidth, window.innerHeight) / 2;
        this.universeCenter = [this.universeSize / 2, this.universeSize / 2, 0];
        this.particles = [];
        this.rotationAngle = 0;
        var spaceElement = document.createElement('div');
        spaceElement.className = 'space';
        spaceElement.style.perspective = this.universeSize / 2 + 'px';
        this.element = document.createElement('div');
        this.element.style.width = this.universeSize + 'px';
        this.element.style.height = this.universeSize + 'px';
        this.element.className = 'universe';
        spaceElement.appendChild(this.element);
        document.body.appendChild(spaceElement);
    }
    /**
     * Generates particle with given parameters
     * @param {Object} params
     */
    Space.prototype.generateParticle = function (params) {
        var newParticle = new Particle_1.default(params, this);
        this.element.appendChild(newParticle.element);
        this.particles.push(newParticle);
    };
    /**
     * Destroys given particle
     * @param {Particle} particle
     */
    Space.prototype.destroyParticle = function (particle) {
        var particleIndex = this.particles.findIndex(function (curParticle) { return curParticle === particle; });
        this.element.removeChild(particle.element);
        this.particles.splice(particleIndex, 1);
    };
    /**
     * Renders particles and launches cycle
     */
    Space.prototype.render = function () {
        // space rotation
        this.element.style.transform =
            "rotate3d(" + constants_1.default.ROTATION_VECTOR + ", " + Utils_1.default.round(this.rotationAngle, 2) + "deg)";
        // render particles
        this.particles.forEach(function (curParticle) {
            curParticle.render();
        });
        if (this.particles.length) {
            window.requestAnimationFrame(this.render.bind(this));
        }
    };
    /**
     * Calculates new particles position/state
     */
    Space.prototype.step = function () {
        var _this = this;
        // count rotation angle
        this.rotationAngle += rotationStep;
        if (this.rotationAngle > 360) {
            this.rotationAngle -= 360;
        }
        // count speed
        this.particles.forEach(function (curParticle) {
            var forcesList = [];
            var collided = false;
            _this.particles.forEach(function (otherParticle) {
                if (otherParticle === curParticle ||
                    curParticle.state.value === 'destroyed' ||
                    otherParticle.state.value === 'destroyed') {
                    return;
                }
                var distance = Utils_1.default.Vector.getDistance(curParticle.pos, otherParticle.pos);
                if (distance <= constants_1.default.COLLISION_DISTANCE) {
                    collided = true;
                }
                if (curParticle.state.value !== 'new-born' &&
                    otherParticle.state.value !== 'new-born') {
                    if (distance <= constants_1.default.COLLISION_DISTANCE) {
                        curParticle.collision(otherParticle);
                    }
                    else {
                        forcesList.push(curParticle.getForce(otherParticle));
                    }
                }
            });
            if (curParticle.state.value === 'destroyed') {
                return;
            }
            if (curParticle.state.value === 'new-born' && !collided) {
                curParticle.state.set('default');
            }
            if (forcesList.length) {
                var sumForce = forcesList.reduce(Utils_1.default.Vector.add);
                var boost = sumForce.map(function (value) { return value / curParticle.mass; });
                curParticle.speed = Utils_1.default.Vector.add(curParticle.speed, boost);
            }
        });
        // apply speed
        this.particles.forEach(function (curParticle) {
            curParticle.move();
            // explosion
            if (curParticle.mass > constants_1.default.MAX_MASS && ['exploding', 'destroyed'].indexOf(curParticle.state.value) === -1) {
                curParticle.delayedExplosion();
            }
        });
        // next step
        if (this.particles.length) {
            setTimeout(this.step.bind(this), 1000 / 60);
        }
    };
    return Space;
})();
exports.default = Space;

},{"./Particle":1,"./Utils":3,"./constants":4}],3:[function(require,module,exports){
var PubSub = (function () {
    function PubSub() {
        this.pubSubHash = {};
    }
    PubSub.prototype.subscribe = function (event, callback) {
        if (!this.pubSubHash[event]) {
            this.pubSubHash[event] = [];
        }
        this.pubSubHash[event].push(callback);
    };
    PubSub.prototype.unsubscribe = function (event, callback) {
        var _this = this;
        if (callback === undefined) {
            this.pubSubHash[event] = [];
        }
        else if (this.pubSubHash[event]) {
            this.pubSubHash[event].forEach(function (value, i) {
                if (value === callback) {
                    _this.pubSubHash[event].splice(i, 1);
                }
            });
        }
    };
    PubSub.prototype.publish = function (event, data) {
        if (this.pubSubHash[event]) {
            this.pubSubHash[event].forEach(function (value) {
                value(data);
            });
        }
    };
    return PubSub;
})();
var ObservableValue = (function () {
    function ObservableValue(value) {
        this.value = value;
        this.observableValueCallbacks = [];
    }
    ObservableValue.prototype.set = function (value) {
        var _this = this;
        this.value = value;
        this.observableValueCallbacks.forEach(function (callback) {
            callback(_this.value);
        });
    };
    ObservableValue.prototype.onChange = function (callback) {
        callback(this.value);
        this.observableValueCallbacks.push(callback);
    };
    return ObservableValue;
})();
var Dataset = (function () {
    function Dataset(params) {
        if (params) {
            this.datasetState = params;
        }
    }
    Dataset.prototype.get = function (key) {
        if (key === undefined) {
            return Object.assign({}, this.datasetState);
        }
        return this.datasetState[key];
    };
    Dataset.prototype.set = function (newData) {
        var _this = this;
        var delta = {};
        Object.keys(newData).forEach(function (key) {
            if (_this.datasetState[key] !== newData[key]) {
                _this.datasetState[key] = newData[key];
                delta[key] = newData[key];
            }
        });
        return delta;
    };
    return Dataset;
})();
var Random = (function () {
    function Random() {
    }
    Random.number = function (min, max) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = 1; }
        if (Array.isArray(min)) {
            return min[Random.number(0, min.length - 1)];
        }
        else {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    };
    Random.color = function () {
        var color = [];
        for (var i = -1; ++i < 3;) {
            color.push(Random.number(0, 255));
        }
        return 'rgb(' + color.join() + ')';
    };
    return Random;
})();
var Vector = (function () {
    function Vector() {
    }
    Vector.add = function (v1, v2) {
        return v1.map(function (value, i) { return value + v2[i]; });
    };
    Vector.intersect = function (v1, v2) {
        return v1.reduce(function (prev, cur) { return prev || v2.indexOf(cur) !== -1; }, false);
    };
    Vector.getDistance = function (vector1, vector2) {
        return Math.sqrt(vector1
            .map(function (value, i) { return Math.pow(value - vector2[i], 2); })
            .reduce(function (prev, current) { return prev + current; }));
    };
    Vector.normalize = function (vector) {
        var vectorSize = Math.sqrt(vector.reduce(function (result, value) { return result + Math.pow(value, 2); }, 0));
        return vector.map(function (value) { return value / vectorSize; });
    };
    return Vector;
})();
var Angle = (function () {
    function Angle() {
    }
    Angle.toRad = function (deg) {
        return deg * Angle.PI / 180;
    };
    Angle.toDeg = function (rad) {
        return rad * 180 / Angle.PI;
    };
    Angle.PI = 3.1415;
    return Angle;
})();
var Utils = (function () {
    function Utils() {
    }
    Utils.round = function (value, precision) {
        return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
    };
    Utils.observableValue = function (value) {
        return new ObservableValue(value);
    };
    Utils.dataset = function (params) {
        return new Dataset(params);
    };
    Utils.Random = Random;
    Utils.Vector = Vector;
    Utils.pubSub = new PubSub();
    Utils.Angle = Angle;
    return Utils;
})();
exports.default = Utils;

},{}],4:[function(require,module,exports){
exports.default = {
    COLLISION_DISTANCE: 3,
    EXPLOSION_TIME: 2000,
    ROTATION_TIME: 30,
    MIN_MASS: 5,
    MAX_MASS: 90,
    ROTATION_VECTOR: '0, 1, 0',
    G: 0.00667384 // IRL: G / Math.pow(10, 10)
};

},{}],5:[function(require,module,exports){
'use strict';
var Space_1 = require('./Space');
var space = new Space_1.default();
space.generateParticle({
    dir: [0, 0, 0],
    pos: space.universeCenter.slice(),
    speed: 0,
    mass: 800 // some kind of a big bang
});
space.render();
space.step();

},{"./Space":2}],6:[function(require,module,exports){

},{}]},{},[6,5]);
