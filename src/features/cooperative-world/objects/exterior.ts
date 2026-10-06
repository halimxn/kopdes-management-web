import * as THREE from 'three';
import type { WorldModel } from '../world-model';
import { officePosition } from '../layout';
import { box, palette } from './primitives';
import { bench, cardboardPallet, streetLamp, tree } from './props';
import { building } from './office';

function emptyPlot(parent: THREE.Object3D, id: string, x: number, z: number) {
  box(parent, [4.5, 0.055, 3.3], [x, 0.015, z], '#d5e4dd').userData.selection = id;
  for (let i = 0; i < 7; i++)
    for (const side of [-1, 1])
      box(parent, [0.35, 0.025, 0.045], [x - 2.05 + i * 0.67, 0.06, z + side * 1.65], '#ffffff', 0);
  for (const side of [-1, 1]) {
    box(parent, [0.045, 0.025, 3.3], [x + side * 2.25, 0.06, z], '#ffffff', 0);
    box(parent, [0.08, 0.45, 0.08], [x + side * 2.1, 0.22, z + 1.48], '#a3b9aa');
  }
  box(parent, [0.7, 0.05, 0.11], [x, 0.07, z], '#94b09f');
  box(parent, [0.11, 0.05, 0.7], [x, 0.07, z], '#94b09f');
}

export function createExterior(parent: THREE.Group, model: WorldModel) {
  box(parent, [31, 0.3, 23], [0, -0.22, 0], '#d6deef', 0.15);
  box(parent, [29, 0.08, 17], [0, -0.03, -2], palette.ground);
  box(parent, [31, 0.025, 4], [0, -0.03, 8.5], '#bbcbed', 0);
  for (let x = -14; x < 15; x += 3) box(parent, [1.5, 0.015, 0.09], [x, 0, 8.5], '#f9fbff', 0);
  box(parent, [29, 0.08, 0.65], [0, 0.015, 6.05], '#f7f9ff');
  box(parent, [29, 0.035, 1.6], [0, 0.005, -1.2], '#f4f7fd');
  for (const plot of model.plots) {
    const [x, z] = plot.position;
    if (plot.unit) building(parent, x, z, String(plot.unit.data.title), false, plot.id);
    else emptyPlot(parent, plot.id, x, z);
  }
  building(parent, officePosition[0], officePosition[1], 'Koperasi', true);
  for (const x of [-13, -10, -7, 0, 3, 6, 9, 12]) tree(parent, x, 5.9, 0.85);
  for (const x of [-13, -7, 0, 6, 12]) tree(parent, x, -9, 1.1);
  for (const z of [-5, -1, 3]) {
    tree(parent, -13, z);
    tree(parent, 13, z);
  }
  bench(parent, 0.4, 4.8);
  bench(parent, 7, -0.7);
  for (const x of [-11, 1, 11]) streetLamp(parent, x, 6.2);
  // Area layanan hanya pemandangan: marka kuning dan kardus tidak mewakili pengiriman nyata.
  for (let x = 4; x <= 11; x += 2.3)
    box(parent, [0.06, 0.015, 1.1], [x, 0, 10.35], palette.marking, 0);
  cardboardPallet(parent, 12.3, 10.2, 2);
}
