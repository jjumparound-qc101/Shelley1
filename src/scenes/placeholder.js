// A chapter whose scenes aren't built yet: its title page, engraved on paper, with a
// slow drift of the camera, so the chapter can still be read and heard in full.
import { paperFlat } from '../stage.js';
import { canvas, texture, hatch, grain, INK, PAPER } from '../ink.js';

function titlePage(ch) {
  const { c, g } = canvas(1600, 1000);
  g.fillStyle = PAPER; g.fillRect(0, 0, 1600, 1000);
  const frame = new Path2D(); frame.rect(60, 60, 1480, 880);
  const band = new Path2D(); band.rect(60, 60, 1480, 880); band.rect(90, 90, 1420, 820);
  g.save(); g.clip(band, 'evenodd'); hatch(g, frame, { angle: 0.8, gap: 5, seed: 7, alpha: 0.8 }); g.restore();
  g.strokeStyle = INK; g.lineWidth = 3; g.stroke(frame); g.strokeRect(90, 90, 1420, 820);
  g.fillStyle = INK; g.textAlign = 'center';
  g.font = 'italic 64px "IM Fell English", Georgia, serif';
  g.fillText('Frankenstein', 800, 380);
  g.font = '110px "IM Fell English", Georgia, serif';
  g.fillText(ch.title, 800, 530, 1300);
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(560, 610); g.lineTo(1040, 610); g.stroke();
  g.font = 'italic 40px "IM Fell English", Georgia, serif';
  g.fillText('(the pictures for this part are still being drawn)', 800, 700);
  grain(g, 0.04, 3);
  return c;
}

export function placeholder(ch) {
  return {
    id: 'title',
    title: ch.title,
    start: () => 0,
    build({ group, cue }) {
      const page = paperFlat(texture(titlePage(ch)), 4.8, 3, { anchor: 'center' });
      page.position.set(0, 1.5, -3);
      group.add(page);
      const end = cue.end;
      return {
        T: {}, bg: PAPER, fog: [20, 60], bounds: null, hotspots: [],
        camera: (t) => {
          const k = Math.min(1, t / Math.max(1, end));
          return { pos: [Math.sin(k * Math.PI * 2) * 0.4, 1.5, 2.6 - k * 0.6], look: [0, 1.5, -3] };
        },
        actors: () => ({}),
      };
    },
  };
}
