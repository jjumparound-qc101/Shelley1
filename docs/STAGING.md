# Staging a section as data

Each section (l02-l04, ch01-ch23; the 1818 text, chapters numbered straight through) is staged in `src/scenes/data/<id>.js`, which exports a list of
scenes. `src/stagebook.js` turns them into playable scenes; `tools/assets_master.mjs` reads them to
build the master asset list. Letter 1 is hand-written (`src/scenes/letter1.js`) and is the model
for the feel: calm camera moves, the narrator visible most of the time, a thought vignette when the
text dwells on something not on stage.

```js
// src/scenes/data/ch05.js
export default [
  {
    id: 'lab',                         // short, unique in the section
    title: 'The creation',             // shown in Contents
    hero: 'victor',                    // the camera keeps this person in frame
    start: 0,                          // first scene: 0; later scenes: a cue (see below)
    turn: 'dark',                      // optional scene change: 'paper' (default) or 'dark'
    set: { kind: 'room', wall: 'stone', floor: 'flags', window: true, view: 'town', weather: 'storm',
           door: 'right', furniture: ['lab', ['slab', { x: -0.6, z: -2.4 }]], light: 'candle' },
    setNote: 'Victor\'s workshop at the top of the house in Ingolstadt, a solitary garret ...',
    cast: { victor: { at: 'L', pose: 'stand' } },          // who is on stage when the scene opens
    beats: [
      { at: 'November', shot: 'wide', dur: 4 },
      { at: 'instruments', who: 'victor', to: 'lab' },
      { at: 'yellow', who: 'creature', show: 'slab', pose: 'lie' },
      { at: 'yellow', shot: 'close', on: 'creature', dur: 3 },
      { at: 'rushed', who: 'victor', exit: 'door' },
      { at: 'Elizabeth', think: 'Elizabeth in the streets of Ingolstadt', dur: 10 },
    ],
    parts: [['The creature wakes', 'yellow']],             // optional named moments for Contents
    props: [['lab_apparatus', 'chemical apparatus and instruments of life on a workbench']],
  },
];
```

## Cues (`at`, `start`, parts)
A cue is a word of the text, counted from the scene's start:
- `'walk'` the first "walk"; `'walk#2'` the second; `'walk+1.5'` 1.5 s after it; `'walk#2-1'`.
- `'^I am already far'` the start of the paragraph that begins with those words (exact text).
- A number: seconds from the start of the section audio (avoid; words survive re-timing).
Words are matched case-insensitively with punctuation stripped; hyphenated words keep the hyphen
(`'whale-fishers'`). A later scene's `start` is counted from the start of the section.
The section audio has 5 s of quiet before the first word.

## Sets
- Room: `{ kind: 'room', wall: 'plaster'|'panel'|'stone'|'rough'|'timber'|'cell'|'court',
  floor: 'boards'|'flags'|'earth'|'straw', window: true|false, view: 'town'|'alps'|'lake'|'sea'|'ice'|'forest'|'hills',
  weather: 'snow'|'storm'|'night'|'moon'|'clouds', door: 'left'|'right'|'back', fire: 'back'|'left'|'right',
  shelf: true, furniture: [...], light: 'day'|'candle'|'night' }`
  Furniture: desk, table, chair, bed, bench, shelf, lab, slab, dock, bars, coffin, guitar; each as a
  name or `[name, { x, z }]` (positions are written for an 8.4 m room, x -4..4; back wall at z -4.2, front at z 2. The room is built 5.85 m wide and 3.4 m high to match its wall drawings, so every x is drawn in by 0.7: ROOM_SX in src/sets/library.js).
- Outdoor: `{ kind: 'outdoor', ground: 'grass'|'snow'|'ice'|'rock'|'sand'|'street'|'water'|'deck'|'earth',
  far: 'alps'|'glacier'|'hills'|'sea'|'lake'|'ice'|'town'|'forest', mid: [...], wings: 'trees'|'rocks'|null,
  weather: ..., light }` Mid pieces: trees, cottage, hovel, church, rocks, boat, ship, glacier, wall,
  gate; each as a name or `[name, { x, z, flip }]` (x -8..8, z -4 to -12).
- `setNote`: one or two sentences from the book about the place (it becomes the image prompt).
- `art`: optional shared art name when two scenes (or sections) use the same place, e.g.
  `'geneva_house'`, `'ingolstadt_garret'`, `'delacey_cottage'`: the same name means the same drawings.

- `props`: `[[name, description], ...]`, objects the text mentions. Each is drawn once
  (public/art/ai/props/<name>) and set on stage for the whole scene by src/props.js, which gives
  every prop a height and a kind of place: on the room's desk or table, on the floor at the back
  and sides, hung on the back wall, out in the middle distance (big outdoor things), or not at all
  (held, worn or marked on the ground). A new prop needs a line there.

## Marks (where people stand)
Rooms: C, L, R, BL, BR, BC, FL, FR, FC, door, window, off (outside the door), and one per piece
of furniture (beside it; on it for bed, slab, coffin). Outdoors: C, L, R, FL, FR, FC, BL, BR, BC,
farL, farR, offL, offR, off. Or `{ x, z }` directly.

## Beats
- Move: `{ at, who, to: mark, dur?, pose? }` (pose taken when the walk ends)
- Pose: `{ at, who, pose }` poses: stand, back, sit, kneel, lie, point, grieve
- Enter / exit: `{ at, who, enter: mark, to: mark }`, `{ at, who, exit: mark }` (walks there, then gone)
- Appear / vanish: `{ at, who, show: mark|true }`, `{ at, who, hide: true }`
- Face someone: add `face: 'creature'` to any beat (or to a `cast` entry)
- Shot: `{ at, shot: 'wide'|'mid'|'close'|'low'|'over'|'high', on: who | [who, who], dur? }`
  (`over`: over the first person's shoulder toward the second)
- Thought: `{ at, think: 'caption from the text', dur?, art?: 'vignette_name' }`

## Cast ids
walton, victor, creature, elizabeth, clerval, alphonse, caroline, william, justine, ernest,
waldman, krempe, delacey, felix, agatha, safie, kirwin, beaufort, turk, sailor, townsman,
townswoman, peasant, child, judge, nurse, daniel (src/cast.js). Two of the same extra in one scene:
not supported yet; use different extras.

## Who is the narrator
Letters 1-4 and the end of Chapter 23: Walton writing (hero: walton). Chapters 1-9 and 16-23:
Victor tells his story (hero: victor). Chapters 10-15: the creature tells his (hero: creature).
Keep the teller in the picture most of the time; when the text recalls something far away, use a
thought vignette rather than leaving the scene.

## Shared place names (`art`)
Use these for places that recur, so they are drawn once:
walton_cabin (Walton's cabin on the ship), walton_deck (the ship's deck, frozen in the ice),
geneva_house (the Frankenstein family's drawing room in Geneva), belrive (the house at Belrive and
its garden on the lake), ingolstadt_lecture (lecture room), ingolstadt_lodging (Victor's rooms),
ingolstadt_workshop (the garret workshop), ingolstadt_street, plainpalais (the fields where William
dies, and the storm), geneva_prison, geneva_court, chamounix_valley (Arve valley, Servox, Chamounix),
montanvert (the Mer de Glace and the summit), creature_hut (the hut on the glacier),
ingolstadt_forest (the forest where the creature wakes), delacey_cottage (interior),
delacey_outside (the cottage and the hovel from outside), creature_hovel (inside the lean-to),
orkney_hut, orkney_shore, irish_shore, irish_court (Mr. Kirwin's), irish_prison, evian_inn,
lake_geneva (on the water, in a boat), geneva_cemetery, arctic_ice (the chase over the ice).
One-off places get their own name, e.g. `lucerne_garret`, `london_street`, `perth_road`.
