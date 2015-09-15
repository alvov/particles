'use strict';

import Space from './Space';

var space: Space = new Space();
space.generateParticle({
    dir: [0, 0, 0],
    pos: space.universeCenter.slice(),
    speed: 0,
    mass: 800 // some kind of a big bang
});
space.render();
space.step();
