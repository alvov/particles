import Particle from './Particle';
import Utils from './Utils';
import { ParticleParams } from './Particle';
import constants from './constants';

var rotationStep: number = (360 / constants.ROTATION_TIME) * (1 / 60);

/**
 * Space constructor
 * @constructor
 */
export default class Space {
    universeSize: number;
    universeCenter: number[];
    particles: Particle[];
    rotationAngle: number;
    element: HTMLElement;
    constructor() {
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
    generateParticle(params: ParticleParams) {
        var newParticle = new Particle(params, this);
        this.element.appendChild(newParticle.element);
        this.particles.push(newParticle);
    }

    /**
     * Destroys given particle
     * @param {Particle} particle
     */
    destroyParticle(particle: Particle) {
        var particleIndex = this.particles.findIndex(curParticle => curParticle === particle);
        this.element.removeChild(particle.element);
        this.particles.splice(particleIndex, 1);
    }

    /**
     * Renders particles and launches cycle
     */
    render() {
        // space rotation
        this.element.style.transform =
            `rotate3d(${constants.ROTATION_VECTOR}, ${Utils.round(this.rotationAngle, 2)}deg)`;

        // render particles
        this.particles.forEach(curParticle => {
            curParticle.render();
        });
        if (this.particles.length) {
            window.requestAnimationFrame(this.render.bind(this));
        }
    }

    /**
     * Calculates new particles position/state
     */
    step() {
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
        for (let i = 0; i < this.particles.length; i++) {
            let curParticle = this.particles[i];
            let forcesList = [];
            let collided = false;
            for (let j = 0; j < this.particles.length; j++) {
                let otherParticle = this.particles[j];
                if (
                    otherParticle === curParticle ||
                    curParticle.state.value === 'destroyed' ||
                    otherParticle.state.value === 'destroyed'
                ) {
                    break;
                }
                var distance = Utils.Vector.getDistance(curParticle.pos, otherParticle.pos);
                if (distance <= constants.COLLISION_DISTANCE) {
                    collided = true;
                }
                if (
                    curParticle.state.value !== 'new-born' &&
                    otherParticle.state.value !== 'new-born'
                ) {
                    if (distance <= constants.COLLISION_DISTANCE) {
                        curParticle.collision(otherParticle);
                    } else {
                        forcesList.push(curParticle.getForce(otherParticle, distance));
                    }
                }
            }
            if (curParticle.state.value === 'destroyed') {
                break;
            }
            if (curParticle.state.value === 'new-born' && !collided) {
                curParticle.state.set('default');
            }
            if (forcesList.length) {
                let sumForce = forcesList.reduce(Utils.Vector.add);
                let boost = [];
                for (let k = 0; k < sumForce.length; k++) {
                    boost.push(sumForce[k] / curParticle.mass);
                }
                curParticle.speed = Utils.Vector.add(curParticle.speed, boost);
            }
        }

        // apply speed
        this.particles.forEach(curParticle => {
            curParticle.move();
            // explosion
            if (curParticle.mass > constants.MAX_MASS && ['exploding', 'destroyed'].indexOf(curParticle.state.value) === -1) {
                curParticle.delayedExplosion();
            }
        });
    }
}
