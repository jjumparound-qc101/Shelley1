// Letter 3: a few lines in haste from the high latitudes, sent home by a merchantman.
const CABIN = { kind: 'room', wall: 'timber', floor: 'boards', window: true, view: 'sea', weather: 'clouds', door: 'right',
  furniture: [['desk', { x: -1.6, z: -3.0 }], 'chair', ['bed', { x: 2.6, z: -3.0 }], ['shelf', { x: 0.6, z: -3.9 }]], light: 'day' };

export default [
  {
    id: 'cabin', title: 'Safe, and well advanced', hero: 'walton', art: 'walton_cabin',
    set: CABIN,
    setNote: 'Walton\'s small timber cabin aboard his ship: a writing desk under the stern window, a narrow bunk, charts and books on a shelf; floating sheets of ice pass outside in the long summer light.',
    cast: { walton: { at: 'desk', pose: 'sit' } },
    beats: [
      { at: 'haste', shot: 'wide', dur: 5 },
      { at: 'merchantman', think: 'a merchantman on its homeward voyage from Archangel', dur: 8 },
      { at: 'spirits', shot: 'close', on: 'walton', dur: 4 },
      { at: 'floating', think: 'the floating sheets of ice that continually pass us', dur: 9 },
      { at: 'summer', shot: 'mid', on: 'walton', dur: 4 },
      { at: '^No incidents', who: 'walton', to: 'window', pose: 'stand' },
      { at: 'leak', think: 'One or two stiff gales and the springing of a leak', dur: 7 },
      { at: '^Adieu', who: 'walton', to: 'desk', pose: 'sit' },
      { at: 'prudent', shot: 'close', on: 'walton', dur: 3 },
    ],
    props: [['walton_charts', 'sea charts, a sextant and books of voyages on the cabin shelf']],
  },
  {
    id: 'deck', title: 'What can stop the determined heart?', hero: 'walton', start: '^But success', art: 'walton_deck',
    set: { kind: 'outdoor', ground: 'deck', far: 'sea', mid: [['rocks', { x: -6, z: -11 }], ['glacier', { x: 5, z: -12 }]], wings: null, weather: 'moon', light: 'night' },
    setNote: 'The deck of Walton\'s ship in the Arctic summer night, sailing north before the southern gales over the pathless seas, the stars overhead, floating ice on the water.',
    cast: { walton: { at: 'C', pose: 'stand' }, sailor: { at: 'BR', pose: 'back' } },
    beats: [
      { at: 'crown', shot: 'low', on: 'walton', dur: 5 },
      { at: 'stars', think: 'the very stars themselves being witnesses and testimonies of my triumph', dur: 8 },
      { at: 'determined', who: 'walton', to: 'FC', pose: 'point' },
      { at: 'swelling', shot: 'wide', dur: 5 },
      { at: 'bless', who: 'walton', pose: 'stand' },
    ],
  },
];
