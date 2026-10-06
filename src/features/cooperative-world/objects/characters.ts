import * as THREE from 'three';
import type { CharacterActivity } from '../world-model';
import { box, sphere, type Vec3 } from './primitives';

/** Pose gerak: aktivitas maskot ditambah duduk-mengetik (meja seksi) dan berjalan. */
export type CharacterPose = CharacterActivity | 'desk' | 'walk';

export type WorldCharacter = {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  head: THREE.Group;
  base: THREE.Vector3;
};

export function createCharacter(
  parent: THREE.Group,
  position: Readonly<Vec3>,
  color: string,
  variant = 0,
): WorldCharacter {
  const g = new THREE.Group();
  g.position.set(...position);
  parent.add(g);
  const skin = ['#e8b18b', '#bd825e', '#efc6a0'][variant % 3];
  sphere(g, 0.34, [0, 0.95, 0], color, [1, 1.1, 0.65]);
  const head = new THREE.Group();
  head.position.y = 1.58;
  g.add(head);
  sphere(head, 0.33, [0, 0, 0], skin, [0.96, 1.06, 0.9]);
  sphere(head, 0.34, [0, 0.14, -0.05], '#34364b', [1, 0.72, 0.93]);
  for (const side of [-1, 1]) {
    sphere(head, 0.035, [side * 0.105, 0.01, 0.284], '#26334b');
    sphere(head, 0.055, [side * 0.2, -0.09, 0.235], '#da9382', [1, 0.55, 0.25]);
  }
  box(head, [0.085, 0.023, 0.025], [0, -0.14, 0.291], '#864d44');
  if (variant === 1) sphere(head, 0.2, [0, 0.33, -0.2], '#34364b');
  // Varian 3: kerudung menutupi rambut dan leher, warna mengikuti baju.
  if (variant === 3) {
    sphere(head, 0.37, [0, 0.06, -0.1], color, [1.04, 1.08, 0.85]);
    sphere(head, 0.3, [0, -0.28, -0.02], color, [1.15, 0.6, 1]);
  }
  if (variant === 2) {
    box(head, [0.7, 0.07, 0.52], [0, 0.27, 0.03], color, 0.04);
    sphere(head, 0.3, [0, 0.24, -0.03], color, [1, 0.45, 1]);
  }
  const limb = (x: number, y: number, isArm: boolean) => {
    const group = new THREE.Group();
    group.position.set(x, y, 0);
    g.add(group);
    box(group, [isArm ? 0.16 : 0.2, 0.36, 0.2], [0, -0.15, 0], isArm ? color : '#394862', 0.07);
    if (isArm) sphere(group, 0.105, [0, -0.37, 0], skin);
    else box(group, [0.23, 0.14, 0.35], [0, -0.37, 0.07], '#fafcff', 0.06);
    return group;
  };
  return {
    group: g,
    head,
    leftArm: limb(-0.34, 1.17, true),
    rightArm: limb(0.34, 1.17, true),
    leftLeg: limb(-0.15, 0.53, false),
    rightLeg: limb(0.15, 0.53, false),
    base: g.position.clone(),
  };
}

export function animateCharacter(
  character: WorldCharacter,
  time: number,
  activity: CharacterPose,
  reduced: boolean,
) {
  const t = reduced ? 0 : time;
  const sitting = activity === 'meeting' || activity === 'desk';
  const typing = activity === 'work' || activity === 'desk';
  character.group.position.copy(character.base);
  character.group.position.y +=
    activity === 'gym' ? Math.abs(Math.sin(t * 5)) * 0.12 : Math.sin(t * 2) * 0.025;
  const stride =
    activity === 'gym' ? Math.sin(t * 5) * 0.75 : activity === 'walk' ? Math.sin(t * 7) * 0.6 : 0;
  character.leftLeg.rotation.x = sitting ? -1.35 : stride;
  character.rightLeg.rotation.x = sitting ? -1.35 : -stride;
  character.leftArm.rotation.x =
    typing || activity === 'meeting' ? -0.7 + Math.sin(t * 4) * 0.08 : -stride;
  character.rightArm.rotation.x = typing ? -0.8 + Math.cos(t * 4) * 0.08 : stride;
  character.rightArm.rotation.z = activity === 'idle' ? -0.25 + Math.sin(t * 2.5) * 0.15 : 0.05;
  character.head.rotation.y = activity === 'walk' ? 0 : Math.sin(t * 0.7) * 0.12;
  if (sitting) character.group.position.y -= 0.12;
}
