// One timeline for picture and sound (seconds of film time).
export const DUR = 30.0;
export const T = {
  cut2: 4.2,      // revolver insert
  cock: 4.6,      // hammer cocked
  fire: 5.0,      // hammer falls, round leaves
  cut3: 6.4,      // ride with the bullet
  tilt: 13.5,     // cowboy starts to tilt his head
  cut4: 14.6,     // frontal on the cowboy
  hat: 15.6,      // round clips the hat brim
  imp: 16.3,      // round reaches the wagon: flash
  pass: 21.5,     // dust wall reaches the cowboy
  cam: 22.6,      // dust wall reaches the camera
  hatLand: 25.6,  // hat lands in front of him
  fade: 28.8,
};
// world (metres): cowboy at origin facing +z, bandit's muzzle M, hat-brim contact H, wagon W
export const M = [2.6, 1.45, 68.0];
export const H = [0.12, 1.86, 0.15];
export const PATH1 = Math.hypot(H[0] - M[0], H[1] - M[1], H[2] - M[2]);
export const PATH2 = 58.0;   // from the brim on to the crates
export const WAGON = [M[0] + (H[0] - M[0]) / PATH1 * (PATH1 + PATH2), 0, M[2] + (H[2] - M[2]) / PATH1 * (PATH1 + PATH2)];

// distance travelled by the round at film time t (0 before the shot)
export function bulletS(t) {
  if (t < T.fire) return 0;
  if (t < T.hat) { const u = (t - T.fire) / (T.hat - T.fire); return PATH1 * (0.08 * u + 0.92 * u * u); }
  const tau = Math.min(1, (t - T.hat) / (T.imp - T.hat));
  return PATH1 + PATH2 * (0.24 * tau + 0.76 * tau * tau * tau);
}
export const EV = [
  { t: T.cock, type: 'cock' }, { t: T.fire, type: 'shot' }, { t: T.hat, type: 'hatclip' },
  { t: T.imp, type: 'flash' }, { t: T.imp + 0.13, type: 'boom' }, { t: T.pass, type: 'wall' },
  { t: T.cam, type: 'wallcam' }, { t: T.hatLand, type: 'hatland' },
];
