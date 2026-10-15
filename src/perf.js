// Performance readout (F3, or open the page with #fps): frames per second,
// average and worst frame time over the last second, and the GPU in use.
// Used for the Steam packaging test on real hardware.

export class PerfMeter {
  constructor(renderer) {
    this.el = document.createElement('pre');
    this.el.id = 'perf';
    this.el.hidden = !location.hash.includes('fps');
    document.body.append(this.el);
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    this.gpu = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    this.frames = [];
    this.last = performance.now();
    this.steam = '';
    window.desktop?.steamStatus().then((st) => {
      this.steam = st.connected
        ? `Steam: connected as ${st.user} (app ${st.appId}) · Shift+Tab opens the overlay`
        : `Steam: not connected (${st.reason})`;
    });
    addEventListener('keydown', (e) => { if (e.code === 'F3') { e.preventDefault(); this.el.hidden = !this.el.hidden; } });
  }

  tick(now) {
    this.frames.push(now - this.last);
    this.last = now;
    let sum = 0;
    for (const f of this.frames) sum += f;
    if (sum < 1000) return;
    const n = this.frames.length;
    const worst = Math.max(...this.frames);
    this.stats = { fps: (n * 1000) / sum, avg: sum / n, worst };
    if (!this.el.hidden) {
      this.el.textContent = `${this.stats.fps.toFixed(0)} fps · avg ${this.stats.avg.toFixed(1)} ms · worst ${worst.toFixed(1)} ms\n${this.gpu}${this.steam ? `\n${this.steam}` : ''}`;
    }
    this.frames = [];
  }
}
