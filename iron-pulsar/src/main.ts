import { Game } from './core/Game';
import { Input } from './input/Input';
import { AudioManager } from './audio/AudioManager';
import { HUD } from './ui/HUD';
import { FPS_LIMITS, PRESETS, PRESET_LABELS, PresetName, loadSettings, saveSettings } from './core/Settings';
import { MISSIONS } from './missions/Registry';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('c');
const gl2 = document.createElement('canvas').getContext('webgl2');
if (!gl2) {
  $('screen-menu').innerHTML = '<h2>WebGL2 indisponível</h2><div class="sub">Este navegador/dispositivo não suporta WebGL2, requisito do jogo.</div>';
} else {
  const settings = loadSettings(); const input = new Input(canvas); const audio = new AudioManager(); const hud = new HUD();
  const game = new Game({ canvas, input, audio, hud, settings });
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) document.addEventListener(ev, () => audio.unlock());
  (window as any).__game = game; // depuração

  let selected = 'hospital';
  const ops = $('ops');
  MISSIONS.forEach(m => {
    const d = document.createElement('div'); d.className = 'op' + (m.implemented ? '' : ' off') + (m.id === selected ? ' sel' : '');
    d.innerHTML = `<b>${m.name}</b><br><small>${m.implemented ? m.briefing : 'EM DESENVOLVIMENTO'}</small>`;
    d.onclick = () => { if (!m.implemented) return; selected = m.id; ops.querySelectorAll('.op').forEach(x => x.classList.remove('sel')); d.classList.add('sel'); };
    ops.appendChild(d);
  });
  const selP = $<HTMLSelectElement>('selPreset'), selF = $<HTMLSelectElement>('selFps'), rng = $<HTMLInputElement>('rngSens');
  (Object.keys(PRESETS) as PresetName[]).forEach(k => selP.add(new Option(PRESET_LABELS[k], k)));
  FPS_LIMITS.forEach(f => selF.add(new Option(f === 0 ? 'Livre' : f + ' FPS', String(f))));
  selP.value = settings.preset; selF.value = String(settings.fpsLimit); rng.value = String(settings.sensitivity);
  const aaNote = $('aaNote');
  const bootAA = PRESETS[settings.preset].antialias;
  const commit = () => {
    settings.preset = selP.value as PresetName; settings.fpsLimit = Number(selF.value); settings.sensitivity = Number(rng.value);
    saveSettings(settings); game.applySettings();
    aaNote.textContent = PRESETS[settings.preset].antialias !== bootAA ? 'Antialiasing só muda após recarregar a página.' : '';
  };
  selP.onchange = selF.onchange = rng.oninput = commit;
  let back: 'menu' | 'pause' = 'menu';
  $('btnStart').onclick = () => { audio.unlock(); void game.startMission(selected); };
  $('btnSettings').onclick = () => { back = 'menu'; hud.show('settings'); };
  $('btnSettings2').onclick = () => { back = 'pause'; hud.show('settings'); };
  $('btnBack').onclick = () => hud.show(back);
  $('btnResume').onclick = () => game.resume();
  $('btnRestart').onclick = () => { void game.startMission(game.currentMission); };
  $('btnMenu').onclick = $('btnMenu2').onclick = () => game.toMenu();
  $('btnRetry').onclick = () => { void game.startMission(game.currentMission); };
  canvas.addEventListener('click', () => { if (game.state === 'playing' && !input.locked) input.requestLock(); });
  hud.show('menu');
}
