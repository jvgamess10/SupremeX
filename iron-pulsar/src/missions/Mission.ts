import type { Box3, Group, Mesh, PointLight, Vector3 } from 'three';
import type { NavGraph } from '../physics/Nav';
import type { MaterialLibrary } from '../rendering/MaterialLibrary';
import type { AssetLoader } from '../assets/AssetLoader';
import type { Player } from '../player/Player';
export interface LevelDeps { materials: MaterialLibrary; assets: AssetLoader }
export interface EnemySpawn { pos: Vector3; patrol: Vector3[]; yaw?: number }
export interface Pickup { type: 'health' | 'ammo' | 'intel'; pos: Vector3; mesh: Mesh; active: boolean }
export interface Objective { id: string; text: string; done: boolean }
export interface LevelFrame { dt: number; time: number; player: Player; enemiesAlive: number; enemiesTotal: number }
/** Contrato de uma fase. Para criar uma nova operação, implemente esta interface e registre em Registry.ts. */
export interface Level {
  group: Group; solids: Box3[]; solidMeshes: Mesh[]; nav: NavGraph; lights: PointLight[];
  spawn: { pos: Vector3; yaw: number }; enemySpawns: EnemySpawn[]; pickups: Pickup[]; objectives: Objective[];
  complete: boolean; update(f: LevelFrame): void; onPickup(type: Pickup['type']): void;
}
export interface MissionDef { id: string; name: string; briefing: string; implemented: boolean; load(deps: LevelDeps): Promise<Level> }
