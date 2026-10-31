// World layout in metres, shared by the page and the physics bake (no THREE here).
// The beach runs along +x. Sea at -z, dunes at +z. The whale lies at the origin; the crowd stands 400 m up the beach.
export const WHALE = { x: 0, z: 0, len: 14.0, h: 2.7, w: 3.2, top: 2.5 };
export const SEA_Z = -16;                 // water line
export const DUNE_Z = 22;                 // dunes start rising here
export const CROWD = { x: 400, z: 6 };
// spectators (feet) before the blast; the reporter's tripod sits in front
export const SPECT = [[396.0, 6.2], [398.4, 4.6], [400.9, 6.6], [403.4, 5.0], [399.4, 8.7], [402.4, 9.2], [405.2, 7.0], [396.8, 9.6]];
export const REPORTER = [394.2, 3.6];
export const PLUNGER = [392.6, 5.2];      // the engineer's detonator box, wire running to the whale
export const LOT = { x0: 420, x1: 452, z0: 13, z1: 30 };
export const CAR = { x: 433, z: 21, len: 5.4, w: 2.0, h: 1.45, roofY: 1.42 };   // the brand-new car, long axis along x
export const TRUCK = { x: 15.5, z: 9.0 };   // where the highway truck stops, cab toward +x
// rain of blubber: where each crowd chunk lands, chosen in the gaps between people (checked by the clearance test)
export const RAIN = [
  [393.0, 1.0], [395.2, 11.8], [397.6, 2.1], [399.9, 11.9], [401.8, 1.6], [404.6, 11.5], [406.9, 3.0], [408.5, 9.0],
  [391.2, 7.5], [409.6, 5.8], [394.4, 14.4], [403.0, 14.6], [398.8, -1.4], [405.6, -0.9], [411.5, 12.2], [389.5, 3.2],
  [413.0, 4.0], [400.5, 17.0], [388.0, 11.0], [396.6, 17.4],
];
export const BLAST_T = 26.7;               // film seconds (shots.js T.blast)
export const CAR_HIT_T = 38.0;             // when the big piece reaches the car
export const RAIN_T = [33.4, 36.6];        // first and last crowd landings
export const G = 9.81;
