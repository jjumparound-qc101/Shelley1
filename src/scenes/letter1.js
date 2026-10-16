// Letter 1: "To Mrs. Saville, England. St. Petersburgh, Dec. 11th, 17—."
// From a seat in the theatre, a 5 s hold, then up the aisle and through the toy stage into
// Walton's lodging, where he writes to his sister; he goes to the window and back as the
// letter turns from the north wind to his old plans and to the sledges in the street.
import { buildTheatre, openingKeys } from '../theatre.js';
import { buildLodging, DESK, ROOM } from '../sets/lodging.js';
import { route, cameraTrack } from '../track.js';
import { thoughts } from '../thoughts.js';
import { poleSun, needle, whalers } from '../vignettes.js';

// The engraved thought pictures (tools/assets_master.mjs names them from their words); the
// drawings in vignettes.js stand in until they load.
const SUN = 'the_sun_is_for_ever_visible_its_broad_disk_just_';
const NEEDLE = 'the_wondrous_power_which_attracts_the_needle';
const WHALE = 'the_whale_fishers_on_an_expedition_to_the_north_';
import { PAPER } from '../ink.js';

export const letter1 = {
  id: 'lodging',
  title: 'St. Petersburgh, December',
  hero: 'walton',
  arts: ['walton_petersburgh'],
  people: ['walton'],
  thoughtArt: [SUN, NEEDLE, WHALE],
  propArt: ['sledge'],
  start: () => 0,
  parts: (cue) => [
    { title: 'The north wind', t: cue.at('walk') - 2 },
    { title: 'Six years', t: cue.at('six') - 0.5 },
    { title: 'The sledges', t: cue.at('favourable') - 1 },
    { title: 'Farewell', t: cue.at('farewell') - 0.5 },
  ],

  build({ group, ai, cue }) {
    const at = cue.at;
    buildTheatre(group, ai, { title: 'FRANKENSTEIN', sub: 'or, The Modern Prometheus · Letter 1' });
    const room = buildLodging(group, ai);
    const T = {
      title: 5.0, // the 5 s hold in the seat (public/data/l01_words.json: lead_silence)
      you: at('you'), walk: at('walk'), sun: at('sun'), needle: at('needle'), refl: at('reflections'),
      visions: at('visions'), six: at('six'), whale: at('whale-fishers'), margaret2: at('margaret', 2),
      fav: at('favourable'), sledges: at('sledges'), depart: at('depart'), farewell: at('farewell'),
    };

    // Where he stands: writing behind the desk; beside it; at the window, looking out.
    const SEAT = { x: DESK.x, z: DESK.z - 0.4 };
    const BY_DESK = { x: DESK.x + 0.95, z: DESK.z - 0.2 };
    const AT_WINDOW = { x: 2.25, z: ROOM.back + 0.5 }; // to the right of the panes, so the street shows past him

    function walton(t) {
      const legs = [
        [0, BY_DESK], [T.walk - 0.6, BY_DESK], [T.walk + 4.5, AT_WINDOW],
        [T.refl, AT_WINDOW], [T.refl + 4.5, BY_DESK],
        [T.fav - 0.4, BY_DESK], [T.fav + 4.0, AT_WINDOW],
        [T.depart, AT_WINDOW], [T.depart + 4.5, BY_DESK],
      ];
      const writing = t < T.walk - 1.2 || (t > T.refl + 5.2 && t < T.fav - 1.0) || t > T.depart + 5.2;
      if (writing) return { pose: 'write', ...SEAT, dir: -1 };
      const s = route(t, legs);
      const atWindow = !s.moving && Math.abs(s.x - AT_WINDOW.x) < 0.01;
      return { pose: atWindow ? 'back' : 'stand', phase: t * 2, idle: s.moving ? undefined : t, ...s, dir: s.moving ? s.dir : atWindow ? 1 : -1 };
    }

    // A sledge passes in the street below as he speaks of them.
    function sledge(t) {
      const k = (t - (T.sledges - 2.5)) / 8;
      room.sledge.visible = k > 0 && k < 1;
      room.sledge.position.x = -2.5 + k * 9;
    }

    const think = thoughts(group, [
      { t0: T.sun - 1.5, t1: T.sun + 11, art: ai[`vignettes/${SUN}`]?.tex ?? poleSun() },
      { t0: T.needle - 1.0, t1: T.needle + 9, art: ai[`vignettes/${NEEDLE}`]?.tex ?? needle() },
      { t0: T.whale - 0.8, t1: T.whale + 11, art: ai[`vignettes/${WHALE}`]?.tex ?? whalers() },
    ]);

    const camera = cameraTrack([
      // The seat, the hold, the push into the room (ends as "You will rejoice" begins).
      ...openingKeys(T.title, T.you, { pos: [0, 1.85, 1.2], look: [-0.4, 1.4, -4] }),
      { t: T.you + 2, dur: 5, pos: [-1.0, 1.55, -0.4], look: [-1.9, 1.15, -3.0] },        // Walton writing
      { t: T.walk - 1, dur: 4, pos: [0.2, 1.7, 0.4], look: [0.6, 1.3, -3.6] },             // he rises and crosses the room
      { t: T.walk + 5, dur: 4, pos: [0.9, 1.75, -1.6], look: [1.8, 1.9, -6] },             // over his shoulder, the street
      { t: T.needle - 4, dur: 10, pos: [1.4, 1.65, -1.9], look: [1.7, 1.8, -6] },
      { t: T.needle + 30, dur: 8, pos: [3.0, 1.6, -1.8], look: [1.5, 1.5, -3.8] },         // beside him at the glass
      { t: T.refl, dur: 4, pos: [0, 1.85, 0.8], look: [-0.2, 1.3, -4] },                   // back to the desk
      { t: T.refl + 8, dur: 5, pos: [-1.3, 1.45, -0.9], look: [-1.95, 1.2, -3.1] },
      { t: T.visions, dur: 8, pos: [-1.9, 1.35, -1.4], look: [-2.3, 1.15, -3.0] },        // the candle
      { t: T.six, dur: 6, pos: [-0.4, 1.6, -0.2], look: [-1.8, 1.2, -3.0] },
      { t: T.margaret2, dur: 12, pos: [-1.4, 1.4, -1.2], look: [-1.9, 1.25, -3.1] },
      { t: T.fav - 0.5, dur: 4, pos: [0.4, 1.7, 0.0], look: [0.9, 1.4, -3.8] },            // to the window again
      { t: T.sledges - 2, dur: 3, pos: [0.9, 1.7, -1.5], look: [1.4, 1.1, -6.6] },          // a sledge in the street
      { t: T.depart, dur: 5, pos: [0, 1.8, 0.9], look: [-0.6, 1.3, -4] },
      { t: T.depart + 6, dur: 5, pos: [-1.1, 1.5, -0.6], look: [-1.9, 1.15, -3.0] },
      { t: T.farewell, dur: 12, pos: [0, 1.95, 12.5], look: [0, 1.7, -3] },                // back out to the toy stage, as at the start
    ]);

    return {
      T,
      bg: PAPER,
      fog: [12, 40],
      bounds: room.bounds,
      hotspots: room.hotspots,
      camera,
      actors: (t) => ({ walton: walton(t) }),
      update(t) { room.update(t); sledge(t); think(t); },
    };
  },
};
