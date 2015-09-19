import Space from './Space';
import Info from './Info';
import Utils from './Utils';

var space: Space = new Space();
space.generateParticle({
    dir: [0, 0, 0],
    pos: space.universeCenter.slice(),
    speed: 0,
    mass: 1000 // some kind of a big bang
});
space.render();
space.step();

// statistics info
var info: Info = new Info();

// particles count
info.createDataItem({
    label: 'count',
    getter: function() {
        return space.particles.length;
    },
    interval: 500
});

// particles median distance relative to universe size
info.createDataItem({
    label: 'distance',
    getter: function() {
        var distances: number[] = [];
        for (let i = 0; i < space.particles.length; i++) {
            for (let j = i + 1; j < space.particles.length; j++) {
                distances.push(Utils.Vector.getDistance(space.particles[i].pos, space.particles[j].pos));
            }
        }
        if (distances.length) {
            distances.sort((a, b) => a - b);
            return Math.floor(100 * distances[Math.floor(distances.length / 2)] / space.universeSize) + '%';
        } else {
            return '0%';
        }
    },
    interval: 500
});
