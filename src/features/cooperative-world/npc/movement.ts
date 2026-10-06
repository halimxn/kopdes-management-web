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
  /** Kardus yang dibawa saat bongkar muat. */
  carry: THREE.Object3D;
  /** Sisa detik berhenti mengobrol dan jeda sebelum boleh mengobrol lagi. */
  pause: number;
  cooldown: number;
};

/** Titik briefing di lorong tengah kantor; manajer berdiri menghadap barisan staf. */
export const briefingSpot = { manager: [2, -3.1] as [number, number], lineZ: -1.9 };

/** Langkah berjalan menuju titik; mengembalikan true bila sudah sampai. */
export function walkToward(character: WorldCharacter, x: number, z: number, delta: number) {
  const dx = x - character.base.x;
  const dz = z - character.base.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.05) return true;
  const step = Math.min(distance, speed * delta);
  character.base.x += (dx / distance) * step;
  character.base.z += (dz / distance) * step;
  character.group.rotation.y = Math.atan2(dx, dz);
  return false;
}

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
      const carry = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.42, 0.45),
        new THREE.MeshStandardMaterial({ color: '#f2b36b', roughness: 0.8 }),
      );
      carry.position.set(0, 1.05, 0.42);
      carry.visible = false;
      character.group.add(carry);
      return {
        id: row.id,
        character,
        loop: index % officeInterior.walkLoop.length,
        carry,
        pause: 0,
        cooldown: 5 + index * 3,
      };
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
      if (plan.activity === 'briefing') {
        const i = take('briefing');
        const x = briefingSpot.manager[0] - 3 + i * 1.1;
        const [mx, mz] = briefingSpot.manager;
        goals.set(actor.id, {
          x,
          z: briefingSpot.lineZ,
          facing: Math.atan2(mx - x, mz - briefingSpot.lineZ),
          pose: 'idle',
        });
      } else if (plan.activity === 'rapat') {
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
  const walkers = actors.filter((actor) => goals.get(actor.id) === 'walk');
  // Dua karakter keliling yang berpapasan berhenti sebentar dan saling menghadap.
  if (!reduced)
    for (let i = 0; i < walkers.length; i++)
      for (let j = i + 1; j < walkers.length; j++) {
        const a = walkers[i];
        const b = walkers[j];
        if (a.pause > 0 || b.pause > 0 || a.cooldown > 0 || b.cooldown > 0) continue;
        const pa = a.character.base;
        const pb = b.character.base;
        if (Math.hypot(pa.x - pb.x, pa.z - pb.z) > 1.4) continue;
        a.pause = b.pause = 3;
        a.cooldown = b.cooldown = 20;
        a.character.group.rotation.y = Math.atan2(pb.x - pa.x, pb.z - pa.z);
        b.character.group.rotation.y = Math.atan2(pa.x - pb.x, pa.z - pb.z);
      }
  actors.forEach((actor, index) => {
    actor.cooldown = Math.max(0, actor.cooldown - delta);
    actor.pause = Math.max(0, actor.pause - delta);
    const goal = goals.get(actor.id);
    const { group, base } = actor.character;
    group.visible = Boolean(goal);
    const plan = plans.find((item) => item.staff.id === actor.id);
    actor.carry.visible = Boolean(goal) && plan?.activity === 'bongkar';
    if (!goal) return;
    if (actor.pause > 0) {
      animateCharacter(actor.character, time + index, 'idle', reduced);
      return;
    }
    let target: Goal;
    if (goal === 'walk') {
      const [x, z] = loop[actor.loop];
      if (Math.hypot(base.x - x, base.z - z) < 0.15) actor.loop = (actor.loop + 1) % loop.length;
      target = { x, z, facing: 0, pose: 'walk' };
    } else target = goal;
    if (snap || reduced) base.set(target.x, base.y, target.z);
    const arrived = snap || reduced || walkToward(actor.character, target.x, target.z, delta);
    const resting = goal !== 'walk' && arrived;
    if (resting) group.rotation.y = target.facing;
    const pose: CharacterPose = resting
      ? actor.carry.visible
        ? 'work'
        : target.pose
      : goal === 'walk' && arrived
        ? 'idle'
        : 'walk';
    animateCharacter(actor.character, time + index, pose, reduced);
  });
  return new Set(actors.filter((actor) => actor.pause > 0).map((actor) => actor.id));
}
