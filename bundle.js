(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Timer constructor
 */
var Timer = (function () {
    function Timer() {
        var _this = this;
        this.element = document.createElement('div');
        this.element.className = 'timer';
        this.startTime = Date.now();
        this.worker = new Worker('js/timerWorker.js');
        this.worker.addEventListener('message', function () {
            _this.tick();
        }, false);
        this.worker.postMessage('start');
        this.tick();
    }
    /**
     * Updates time string
     */
    Timer.prototype.tick = function () {
        var delta = new Date(Date.now() - this.startTime);
        var hours = ('0' + delta.getUTCHours()).substr(-2);
        var minutes = ('0' + delta.getMinutes()).substr(-2);
        var seconds = ('0' + delta.getSeconds()).substr(-2);
        this.element.innerHTML = (hours || '00') + ":" + minutes + ":" + seconds;
    };
    return Timer;
})();
/**
 * Data row constructor
 */
var DataItem = (function () {
    function DataItem(params) {
        var _this = this;
        this.element = document.createElement('div');
        this.element.className = 'data-item';
        this.element.innerHTML = params.label + ':';
        this.dataContainerElement = document.createElement('div');
        this.dataContainerElement.className = 'data-container';
        this.element.appendChild(this.dataContainerElement);
        // periodically updating data
        this.timer = setInterval(function () {
            _this.dataContainerElement.innerHTML = params.getter();
        }, params.interval);
    }
    return DataItem;
})();
/**
 * Info block constructor
 */
var Info = (function () {
    function Info() {
        this.element = document.createElement('div');
        this.element.className = 'info';
        this.timer = new Timer();
        this.element.appendChild(this.timer.element);
        document.body.appendChild(this.element);
    }
    /**
     * Creates new data row
     * @param {Object} params
     */
    Info.prototype.createDataItem = function (params) {
        var dataItem = new DataItem(params);
        this.element.appendChild(dataItem.element);
    };
    return Info;
})();
exports.default = Info;

},{}],2:[function(require,module,exports){
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
        carrier.mass = commonMass;
        provider.destroy();
    };
    /**
     * Returns value of gravity force relative to given particle
     * @param {Particle} otherParticle
     * @param {number} distance
     * @returns {Array}
     */
    Particle.prototype.getForce = function (otherParticle, distance) {
        if (!distance) {
            return [0, 0, 0];
        }
        else {
            var force = constants_1.default.G * this.mass * otherParticle.mass / Math.pow(distance, 2);
            var result = [];
            for (var i = 0; i < this.pos.length; i++) {
                result.push(otherParticle.pos[i] - this.pos[i]);
            }
            // direction
            result = Utils_1.default.Vector.normalize(result);
            for (var i = 0; i < result.length; i++) {
                result[i] *= force;
            }
            return result;
        }
    };
    /**
     * Calculates particle's new position
     */
    Particle.prototype.move = function () {
        var _this = this;
        this.pos = Utils_1.default.Vector.add(this.pos, this.speed);
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
        if (this.oldMass !== this.mass) {
            this.element.style.boxShadow = "0 0 3px " + Math.min(4, Math.ceil(this.mass * 0.05)) + "px";
            this.oldMass = this.mass;
        }
        // rotate particles so that they always look "at us"
        this.element.style.transform =
            "translate3d(" + this.pos.map(function (value) { return Utils_1.default.round(value, 1) + 'px'; }).join(',') + ")\n            rotate3d(" + constants_1.default.ROTATION_VECTOR + ", -" + Utils_1.default.round(this.parent.rotationAngle, 2) + "deg)";
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

},{"./Utils":4,"./constants":5}],3:[function(require,module,exports){
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
        this.updatedStep = true;
        this.spaceElement = document.createElement('div');
        this.spaceElement.className = 'space';
        this.spaceElement.style.perspective = this.universeSize / 2 + 'px';
        this.universeElement = document.createElement('div');
        this.universeElement.style.width = this.universeSize + 'px';
        this.universeElement.style.height = this.universeSize + 'px';
        this.universeElement.className = 'universe';
        this.spaceElement.appendChild(this.universeElement);
        document.body.appendChild(this.spaceElement);
    }
    /**
     * Generates particle with given parameters
     * @param {Object} params
     */
    Space.prototype.generateParticle = function (params) {
        var newParticle = new Particle_1.default(params, this);
        this.universeElement.appendChild(newParticle.element);
        this.particles.push(newParticle);
    };
    /**
     * Destroys given particle
     * @param {Particle} particle
     */
    Space.prototype.destroyParticle = function (particle) {
        this.universeElement.removeChild(particle.element);
    };
    /**
     * Renders particles and launches cycle
     */
    Space.prototype.render = function () {
        if (this.updatedStep) {
            this.updatedStep = false;
            // space rotation
            this.universeElement.style.transform =
                "rotate3d(" + constants_1.default.ROTATION_VECTOR + ", " + Utils_1.default.round(this.rotationAngle, 2) + "deg)";
            // render particles
            this.particles.forEach(function (curParticle) {
                curParticle.render();
            });
        }
        if (this.particles.length) {
            window.requestAnimationFrame(this.render.bind(this));
        }
    };
    /**
     * Calculates new particles position/state
     */
    Space.prototype.step = function () {
        // next step
        if (this.particles.length) {
            setTimeout(this.step.bind(this), 1000 / 60);
        }
        // count rotation angle
        this.rotationAngle += rotationStep;
        if (this.rotationAngle > 360) {
            this.rotationAngle -= 360;
        }
        // count speed
        for (var i = 0; i < this.particles.length; i++) {
            var curParticle = this.particles[i];
            var forcesList = [];
            var collided = false;
            for (var j = 0; j < this.particles.length; j++) {
                var otherParticle = this.particles[j];
                if (otherParticle === curParticle ||
                    curParticle.state.value === 'destroyed' ||
                    otherParticle.state.value === 'destroyed') {
                    continue;
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
                        forcesList.push(curParticle.getForce(otherParticle, distance));
                    }
                }
            }
            if (curParticle.state.value === 'destroyed') {
                continue;
            }
            if (curParticle.state.value === 'new-born' && !collided) {
                curParticle.state.set('default');
            }
            if (forcesList.length) {
                var sumForce = forcesList.reduce(Utils_1.default.Vector.add);
                var boost = [];
                for (var k = 0; k < sumForce.length; k++) {
                    boost.push(sumForce[k] / curParticle.mass);
                }
                curParticle.speed = Utils_1.default.Vector.add(curParticle.speed, boost);
            }
        }
        this.particles = this.particles.filter(function (particle) { return particle.state.value !== 'destroyed'; });
        // apply speed
        this.particles.forEach(function (curParticle) {
            curParticle.move();
            // explosion
            if (curParticle.mass > constants_1.default.MAX_MASS && curParticle.state.value !== 'exploding') {
                curParticle.delayedExplosion();
            }
        });
        this.updatedStep = true;
    };
    return Space;
})();
exports.default = Space;

},{"./Particle":2,"./Utils":4,"./constants":5}],4:[function(require,module,exports){
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
        var result = [];
        for (var i = 0; i < v1.length; i++) {
            result.push(v1[i] + v2[i]);
        }
        return result;
    };
    Vector.intersect = function (v1, v2) {
        var result = false;
        for (var i = 0; i < v1.length; i++) {
            if (v2.indexOf(v1[i]) !== -1) {
                result = true;
                break;
            }
        }
        return result;
    };
    Vector.getDistance = function (vector1, vector2) {
        var tmp = 0;
        for (var i = 0; i < vector1.length; i++) {
            tmp += Math.pow(vector1[i] - vector2[i], 2);
        }
        return Math.sqrt(tmp);
    };
    Vector.normalize = function (vector) {
        var vectorSize = 0;
        var result = [];
        for (var i = 0; i < vector.length; i++) {
            vectorSize += Math.pow(vector[i], 2);
        }
        vectorSize = Math.sqrt(vectorSize);
        for (var i = 0; i < vector.length; i++) {
            result.push(vector[i] / vectorSize);
        }
        return result;
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

},{}],5:[function(require,module,exports){
exports.default = {
    COLLISION_DISTANCE: 3,
    EXPLOSION_TIME: 2000,
    ROTATION_TIME: 30,
    MIN_MASS: 5,
    MAX_MASS: 90,
    ROTATION_VECTOR: '0, 1, 0',
    G: 0.00667384 // IRL: G / Math.pow(10, 10)
};

},{}],6:[function(require,module,exports){
var Space_1 = require('./Space');
var Info_1 = require('./Info');
var Utils_1 = require('./Utils');
var space = new Space_1.default();
space.generateParticle({
    dir: [0, 0, 0],
    pos: space.universeCenter.slice(),
    speed: 0,
    mass: 1000 // some kind of a big bang
});
space.render();
space.step();
// statistics info
var info = new Info_1.default();
// particles count
info.createDataItem({
    label: 'count',
    getter: function () {
        return space.particles.length;
    },
    interval: 500
});
// particles median distance relative to universe size
info.createDataItem({
    label: 'distance',
    getter: function () {
        var distances = [];
        for (var i = 0; i < space.particles.length; i++) {
            for (var j = i + 1; j < space.particles.length; j++) {
                distances.push(Utils_1.default.Vector.getDistance(space.particles[i].pos, space.particles[j].pos));
            }
        }
        if (distances.length) {
            distances.sort(function (a, b) { return a - b; });
            return Math.floor(100 * distances[Math.floor(distances.length / 2)] / space.universeSize) + '%';
        }
        else {
            return '0%';
        }
    },
    interval: 500
});

},{"./Info":1,"./Space":3,"./Utils":4}],7:[function(require,module,exports){

},{}]},{},[7,6]);
