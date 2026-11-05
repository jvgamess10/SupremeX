const $ = (id: string) => document.getElementById(id)!;
export type ScreenName = 'menu' | 'settings' | 'pause' | 'end' | 'loading';
/** Camada de UI (DOM). Só escreve no DOM quando o valor muda. */
export class HUD {
  private cache = new Map<string, string>(); private msgT = 0; private hitT = 0;
  private set(id: string, v: string) { if (this.cache.get(id) !== v) { this.cache.set(id, v); $(id).textContent = v; } }
  show(name: ScreenName | null): void { for (const s of ['menu', 'settings', 'pause', 'end', 'loading']) $('screen-' + s).classList.toggle('hidden', s !== name); }
  showHud(on: boolean, touch: boolean): void { $('hud').classList.toggle('hidden', !on); $('touch').classList.toggle('hidden', !(on && touch)); }
  setRotate(on: boolean): void { $('screen-rotate').classList.toggle('hidden', !on); }
  setHealth(h: number, max: number): void { this.set('hpText', String(Math.ceil(h))); $('hpFill').style.width = (100 * h / max) + '%'; }
  setWeapon(name: string, mag: number, reserve: number, reloading: boolean, gren: number): void {
    this.set('weaponName', name); this.set('ammo', reloading ? 'RECARREGANDO' : `${mag} / ${reserve}`); this.set('gren', `GRANADAS: ${gren}`);
  }
  setObjectives(list: { text: string; done: boolean }[]): void {
    const key = list.map(o => (o.done ? '1' : '0') + o.text).join('|'); if (this.cache.get('obj') === key) return; this.cache.set('obj', key);
    $('objList').innerHTML = list.map(o => `<li class="${o.done ? 'done' : ''}">${o.done ? '✓' : '•'} ${o.text}</li>`).join('');
  }
  setScope(on: boolean): void { $('scope').classList.toggle('hidden', !on); $('crosshair').style.display = on ? 'none' : ''; }
  hit(kill: boolean): void { const h = $('hitmark'); h.classList.toggle('kill', kill); h.style.opacity = '1'; this.hitT = 0.15; }
  damage(): void { const v = $('vignette'); v.style.transition = 'none'; v.style.opacity = '1'; void v.offsetWidth; v.style.transition = 'opacity .5s'; v.style.opacity = '0'; }
  message(t: string, sec = 2.5): void { const m = $('msg'); m.textContent = t; m.style.opacity = '1'; this.msgT = sec; }
  hint(t: string): void { this.set('hint', t); }
  setFps(f: number): void { this.set('fps', f + ' FPS'); }
  tick(dt: number): void {
    if (this.hitT > 0) { this.hitT -= dt; if (this.hitT <= 0) $('hitmark').style.opacity = '0'; }
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) $('msg').style.opacity = '0'; }
  }
  setEnd(title: string, info: string): void { $('endTitle').textContent = title; $('endInfo').textContent = info; }
}
