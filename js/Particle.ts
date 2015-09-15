import Space from './Space';
import Utils from './Utils';
import constants from './constants';

export interface ParticleParams {
    pos: number[],
    dir: number[]
    mass: number,
    speed: number
}

/**
 * Particle constructor
 * @param {Object} params
 * @constructor
 */
export default class Particle {
    state: any;
    pos: number[];
    mass: number;
    speed: number[];
    element: HTMLElement;
    private oldPos: number[];
    private oldMass: number;
    private timeouts: any;
    constructor(params: ParticleParams, private parent: Space) {
        this.state = Utils.observableValue('new-born'); // ['new-born', 'default', exploding', 'destroyed']
        this.timeouts = {};
        this.pos = params.pos;
        this.oldPos = [];
        this.speed = params.dir.map(value => value * params.speed);

        this.mass = params.mass;
        this.oldMass = null;
        this.element = document.createElement('p');
        this.state.onChange(state => {
            this.element.className = state;
        });
        this.render();
    }

    /**
     * Collides particle with another given particle
     * @param {Particle} otherParticle
     */
    collision(otherParticle: Particle): void {
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
        carrier.speed = carrier.speed.map(
            (value, i) => (value * carrier.mass + provider.speed[i] * provider.mass) / commonMass
        );

        carrier.oldMass = carrier.mass;
        carrier.mass = commonMass;
        provider.destroy();
    }

    /**
     * Returns value of gravity force relative to given particle
     * @param {Particle} otherParticle
     * @returns {Array}
     */
    getForce(otherParticle: Particle): number[] {
        var distance = Utils.Vector.getDistance(this.pos, otherParticle.pos);
        if (!distance) {
            return [0, 0, 0];
        } else {
            var force = constants.G * this.mass * otherParticle.mass / Math.pow(distance, 2);
            var dir = this.pos.map((value, i) => otherParticle.pos[i] - value);
            dir = Utils.Vector.normalize(dir);

            return dir.map(value => value * force);
        }
    }

    /**
     * Calculates particle's new position
     */
    move(): void {
        this.oldPos = this.pos.slice();
        this.pos = this.pos.map((value, i) => value + this.speed[i]);
        // limit particles spread by universe size
        if (Utils.Vector.getDistance(this.pos, this.parent.universeCenter) >= this.parent.universeSize / 2) {
            this.pos.forEach((value, i) => {
                if ((value - this.parent.universeCenter[i]) * this.speed[i] > 0) {
                    this.speed[i] = Math.max(
                        0,
                        this.speed[i] - Math.max(this.speed[i] * 0.01, this.speed[i] > 0 ? 0.001 : -0.001)
                    );
                }
            });
        }
    }

    /**
     * Renders current particle's position and size
     */
    render(): void {
        if (this.oldMass !== this.mass) {
            this.element.style.boxShadow = `0 0 3px ${Math.min(4, Math.ceil(this.mass * 0.05))}px`;
        }
        if (this.pos.some((value, i) => Utils.round(value, 6) !== Utils.round(this.oldPos[i], 6))) {
            // rotate particles so that they always look "at us"
            this.element.style.transform =
                `translate3d(${this.pos.map(value => Utils.round(value, 0) + 'px').join(',')})
                rotate3d(${constants.ROTATION_VECTOR}, -${Utils.round(this.parent.rotationAngle, 2)}deg)`;
        }
    }

    /**
     * Destroys particle
     */
    destroy(): void {
        Object.keys(this.timeouts).forEach(key => {
            if (this.timeouts[key]) {
                clearTimeout(this.timeouts[key]);
            }
        });
        this.timeouts = {};
        this.parent.destroyParticle(this);
        this.state.set('destroyed');
    }

    /**
     * Sets particle's delayed explosion
     * @param {number} delay
     */
    delayedExplosion(delay?: number): void {
        delay = delay || constants.EXPLOSION_TIME;
        this.timeouts.explosion = setTimeout(this.explode.bind(this), delay);
        this.state.set('exploding');
    }

    /**
     * Explodes particle into smaller parts and destroys it
     */
    explode(): void {
        this.splitMass().forEach(mass => {
            this.parent.generateParticle({
                pos: this.pos.slice(),
                mass,
                speed: Utils.Random.number(4, 100) / 100,
                dir: Utils.Vector.normalize([
                    Utils.Random.number(-100, 100),
                    Utils.Random.number(-100, 100),
                    Utils.Random.number(-100, 100)
                ])
            });
        });
        this.destroy();
    }

    /**
     * Returns a random array of masses, which sum is equal to the particles mass
     * @returns {Array}
     */
    splitMass(): number[] {
        var particlesCount = Math.floor(this.mass / constants.MIN_MASS);
        var masses = new Array(particlesCount);
        masses.fill(constants.MIN_MASS);
        var remainingMass = this.mass % constants.MIN_MASS;
        while (remainingMass) {
            var randomPick = Utils.Random.number(1, remainingMass);
            masses[Utils.Random.number(0, particlesCount - 1)] += randomPick;
            remainingMass -= randomPick;
        }
        return masses;
    }
}
