export type Action = 'jump' | 'reload' | 'swap' | 'grenade' | 'pause' | 'slot0' | 'slot1' | 'slot2';
/** Entrada unificada: teclado/mouse (Pointer Lock) e touch (joystick, olhar, botões). O gameplay lê só este objeto. */
export class Input {
  moveX = 0; moveY = 0; lookDX = 0; lookDY = 0;
  fire = false; ads = false; run = false; crouch = false;
  readonly isTouch = window.matchMedia('(pointer: coarse)').matches;
  locked = false; onLockChange: (l: boolean) => void = () => {};
  private pressed = new Set<Action>(); private keys = new Set<string>();
  constructor(private canvas: HTMLCanvasElement) { this.bindDesktop(); this.bindTouch(); }
  consume(a: Action): boolean { return this.pressed.delete(a); }
  reset(): void {
    this.keys.clear(); this.pressed.clear(); this.fire = this.ads = this.run = this.crouch = false; this.moveX = this.moveY = 0; this.lookDX = this.lookDY = 0;
    document.querySelectorAll('#touch .tb.on').forEach(e => e.classList.remove('on'));
    const k = document.getElementById('joyKnob'); if (k) k.style.transform = '';
  }
  requestLock(): void { if (this.isTouch) return; try { const r: any = this.canvas.requestPointerLock(); r?.catch?.(() => {}); } catch { /* ignore */ } }
  exitLock(): void { if (document.pointerLockElement) document.exitPointerLock(); }
  private updateKeys(): void {
    if (this.isTouch) return; const k = this.keys;
    this.moveY = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0); this.moveX = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    this.run = k.has('ShiftLeft') || k.has('ShiftRight'); this.crouch = k.has('KeyC') || k.has('ControlLeft');
  }
  private bindDesktop(): void {
    const map: Record<string, Action> = { Space: 'jump', KeyR: 'reload', KeyQ: 'swap', KeyG: 'grenade', KeyP: 'pause', Digit1: 'slot0', Digit2: 'slot1', Digit3: 'slot2' };
    document.addEventListener('keydown', e => {
      if (e.repeat) return; this.keys.add(e.code); const a = map[e.code]; if (a) { this.pressed.add(a); if (e.code === 'Space') e.preventDefault(); } this.updateKeys();
    });
    document.addEventListener('keyup', e => { this.keys.delete(e.code); this.updateKeys(); });
    this.canvas.addEventListener('mousedown', e => { if (!this.locked) return; if (e.button === 0) this.fire = true; if (e.button === 2) this.ads = true; });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.fire = false; if (e.button === 2) this.ads = false; });
    document.addEventListener('mousemove', e => { if (this.locked) { this.lookDX += e.movementX; this.lookDY += e.movementY; } });
    window.addEventListener('wheel', () => { if (this.locked) this.pressed.add('swap'); });
    window.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === this.canvas; if (!this.locked) this.fire = this.ads = false; this.onLockChange(this.locked); });
  }
  private bindTouch(): void {
    const $ = (s: string) => document.querySelector<HTMLElement>(s)!;
    const joy = $('#joyZone'), base = $('#joyBase'), knob = $('#joyKnob'), look = $('#lookZone');
    const ids = (e: TouchEvent) => Array.from(e.changedTouches);
    let joyId = -1;
    const joyMove = (t: Touch) => {
      const r = base.getBoundingClientRect(); const max = 50; let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
      const l = Math.hypot(dx, dy); if (l > max) { dx = dx / l * max; dy = dy / l * max; }
      knob.style.transform = `translate(${dx}px,${dy}px)`; const dz = 0.15;
      this.moveX = Math.abs(dx / max) < dz ? 0 : dx / max; this.moveY = Math.abs(dy / max) < dz ? 0 : -dy / max;
    };
    joy.addEventListener('touchstart', e => { e.preventDefault(); const t = ids(e)[0]; joyId = t.identifier; joyMove(t); }, { passive: false });
    joy.addEventListener('touchmove', e => { e.preventDefault(); for (const t of ids(e)) if (t.identifier === joyId) joyMove(t); }, { passive: false });
    const joyEnd = (e: TouchEvent) => { for (const t of ids(e)) if (t.identifier === joyId) { joyId = -1; this.moveX = this.moveY = 0; knob.style.transform = ''; } };
    joy.addEventListener('touchend', joyEnd); joy.addEventListener('touchcancel', joyEnd);
    let lookId = -1, lx = 0, ly = 0;
    look.addEventListener('touchstart', e => { e.preventDefault(); const t = ids(e)[0]; lookId = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: false });
    look.addEventListener('touchmove', e => { e.preventDefault(); for (const t of ids(e)) if (t.identifier === lookId) { this.lookDX += t.clientX - lx; this.lookDY += t.clientY - ly; lx = t.clientX; ly = t.clientY; } }, { passive: false });
    const lookEnd = (e: TouchEvent) => { for (const t of ids(e)) if (t.identifier === lookId) lookId = -1; };
    look.addEventListener('touchend', lookEnd); look.addEventListener('touchcancel', lookEnd);
    document.querySelectorAll<HTMLElement>('#touch .tb').forEach(b => {
      const act = b.dataset.act!;
      b.addEventListener('touchstart', e => {
        e.preventDefault();
        if (act === 'fire') { this.fire = true; b.classList.add('on'); }
        else if (act === 'ads' || act === 'run' || act === 'crouch') { const s = this as any; s[act] = !s[act]; b.classList.toggle('on', s[act]); }
        else this.pressed.add(act as Action);
      }, { passive: false });
      const end = () => { if (act === 'fire') { this.fire = false; b.classList.remove('on'); } };
      b.addEventListener('touchend', end); b.addEventListener('touchcancel', end);
    });
    document.addEventListener('gesturestart', e => e.preventDefault());
  }
}
