// One registry for every 3D friend a level can show: animals first, then objects from things.js.
import { makeAnimal, ANIMAL_IDS } from './animals.js';
import { makeThing } from './things.js';
const ANIMALS = new Set(ANIMAL_IDS);
export const isAnimal = id => ANIMALS.has(id);
export const makeFriend = id => (ANIMALS.has(id) ? makeAnimal(id) : makeThing(id));
