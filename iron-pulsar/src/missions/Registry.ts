import type { MissionDef } from './Mission';
const planned = (id: string, name: string, briefing: string): MissionDef => ({ id, name, briefing, implemented: false, load: async () => { throw new Error(`Operação "${name}" ainda não foi implementada.`); } });
/** Registro das 4 operações. Carregamento por import dinâmico (cada fase vira um chunk separado). */
export const MISSIONS: MissionDef[] = [
  { id: 'hospital', name: '1. HOSPITAL', briefing: 'Invasão e neutralização de ameaças.', implemented: true, load: async d => (await import('./Hospital')).buildHospital(d) },
  planned('garagem', '2. GARAGEM', 'Combate em ambiente fechado e destruição de objetivos.'),
  planned('rua', '3. RUA DE FUGA', 'Confronto urbano e deslocamento tático.'),
  planned('comunicacoes', '4. CENTRAL DE COM.', 'Infiltração e sabotagem de equipamentos.'),
];
