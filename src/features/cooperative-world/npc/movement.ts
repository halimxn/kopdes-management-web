import * as THREE from 'three';
import type { Item } from '../../records/schemas';
import { meetingSeats, officeInterior, sectionSeat, warehouseInterior } from '../layout';
import type { WorldLocation, WorldModel } from '../world-model';
import {
  animateCharacter,
  createCharacter,
  type CharacterPose,
  type WorldCharacter,
} from '../objects/characters';
import type { NpcPlan } from './schedule';

const outfits: Record<string, string> = {
  biru: '#3866f6',
  hijau: '#2f9e6e',
  oranye: '#e07b39',
  lavender: '#a18ae0',
  abu: '#7b8798',
};
const hairVariant: Record<string, number> = { pendek: 0, panjang: 1, topi: 2, berkerudung: 3 };
const speed = 2.2;

export type NpcActor = {
  id: string;
  character: WorldCharacter;
  loop: number;
};

/** Maksimal 12 karakter agar ponsel tetap ringan; sisanya tetap ada di daftar Tim. */
export function createNpcs(parent: THREE.Group, staff: Item[]): NpcActor[] {
  return staff
    .filter((row) => ['aktif', 'ditunjuk'].includes(String(row.data.status)))
    .slice(0, 12)
    .map((row, index) => {
      const character = createCharacter(
        parent,
        [0, 0.1, 0],
        outfits[String(row.data.outfit)] || outfits.biru,
        hairVariant[String(row.data.hair)] ?? 0,
      );
      character.group.userData.selection = `staf-${row.id}`;
      character.group.visible = false;
      return { id: row.id, character, loop: index % officeInterior.walkLoop.length };
    });
}

type Goal = { x: number; z: number; facing: number; pose: CharacterPose };

/** Tujuan tiap karakter menurut kegiatan; kursi dibagi berurutan agar tidak bertumpuk. */
function goalsFor(
  plans: NpcPlan[],
  location: WorldLocation,
  model: WorldModel,
  actors: NpcActor[],
) {
  const goals = new Map<string, Goal | 'walk'>();
  const seatCount: Record<string, number> = {};
  const take = (key: string) => (seatCount[key] = (seatCount[key] ?? -1) + 1);
  for (const actor of actors) {
    const plan = plans.find((item) => item.staff.id === actor.id);
    if (!plan || plan.location !== location) continue;
    const section = String(plan.staff.data.section || 'umum');
    if (plan.activity === 'keliling' && location === 'dalam') {
      goals.set(actor.id, 'walk');
      continue;
    }
    if (location === 'dalam') {
      if (plan.activity === 'rapat') {
        const seat = meetingSeats[take('rapat') % meetingSeats.length];
        goals.set(actor.id, { x: seat[0], z: seat[1], facing: seat[2], pose: 'meeting' });
      } else if (plan.activity === 'istirahat') {
        const i = take('pantry');
        const [px, pz] = officeInterior.pantry;
        goals.set(actor.id, {
          x: px - 1.2 + (i % 3) * 1.2,
          z: pz + 0.4 + Math.floor(i / 3) * 0.8,
          facing: Math.PI,
          pose: 'idle',
        });
      } else {
        const index = take(section);
        const [x, z, facing] = sectionSeat(
          section in officeInterior.sections ? section : 'umum',
          index,
        );
        goals.set(actor.id, { x, z, facing, pose: index < 2 ? 'desk' : 'work' });
      }
    } else if (location === 'gudang') {
      const i = take('gudang');
      const [sx, sz] = warehouseInterior.staging;
      goals.set(actor.id, { x: sx - 2 + (i % 4) * 1.3, z: sz - 2.4, facing: 0, pose: 'work' });
    } else {
      const plot = model.plots.find(
        (item) => item.unit && item.unit.id === plan.staff.data.unit_id,
      );
      const i = take(plot?.id || 'gerai');
      const [x, z] = plot?.position || [-12, 11.6];
      goals.set(actor.id, { x: x - 1 + i * 1, z: z + 3.1, facing: Math.PI, pose: 'idle' });
    }
  }
  return goals;
}

/**
 * Gerakkan karakter ke tujuan dengan pose jalan, lalu ganti ke pose kegiatan. snap menaruh
 * karakter langsung di tujuan (saat scene dibangun atau gerak minimal).
 */
export function updateNpcs(
  actors: NpcActor[],
  plans: NpcPlan[],
  location: WorldLocation,
  model: WorldModel,
  delta: number,
  time: number,
  reduced: boolean,
  snap: boolean,
) {
  const goals = goalsFor(plans, location, model, actors);
  const loop = officeInterior.walkLoop;
  actors.forEach((actor, index) => {
    const goal = goals.get(actor.id);
    const { group, base } = actor.character;
    group.visible = Boolean(goal);
    if (!goal) return;
    let target: Goal;
    if (goal === 'walk') {
      const [x, z] = loop[actor.loop];
      if (Math.hypot(base.x - x, base.z - z) < 0.15) actor.loop = (actor.loop + 1) % loop.length;
      target = { x, z, facing: 0, pose: 'walk' };
    } else target = goal;
    const dx = target.x - base.x;
    const dz = target.z - base.z;
    const distance = Math.hypot(dx, dz);
    if (snap || reduced || distance < 0.05) {
      if (snap || reduced) base.set(target.x, base.y, target.z);
      const resting = goal !== 'walk';
      if (resting) group.rotation.y = target.facing;
      animateCharacter(actor.character, time + index, resting ? target.pose : 'idle', reduced);
      return;
    }
    const step = Math.min(distance, speed * delta);
    base.x += (dx / distance) * step;
    base.z += (dz / distance) * step;
    group.rotation.y = Math.atan2(dx, dz);
    animateCharacter(actor.character, time + index, 'walk', reduced);
  });
}
