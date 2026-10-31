// One timeline for picture and sound (seconds of film time).
export const DUR = 30.0;
export const T = {
  cover: 1.0,      // the guard flips up
  press: 2.2,      // the button goes down; lights turn green one by one
  cut2: 3.2,       // the engineer at the fence, the rocket behind him
  cut3: 6.4,       // under the engines
  ign: 7.2,        // ignition: flash
  arms: 7.6,       // the tower arms swing clear
  lift: 9.0,       // hold-downs release
  cut4: 9.6,       // the long hold: lift-off, the cloud, the wall of steam
  pass: 16.5,      // steam wall reaches him
  cam: 17.4,       // steam wall reaches the camera
  look: 18.5,      // he tips his head up to follow it
  fade: 28.8,
};
export const PAD = [0, 0, -120];        // the base of the rocket
export const ENG = [0, 0, 0];           // the engineer
export const ACC = 6.0;                 // lift-off acceleration (m/s²)
export const rocketH = (t) => (t < T.lift ? 0 : 0.5 * ACC * (t - T.lift) ** 2);
export const EV = [
  { t: T.cover, type: 'cover' }, { t: T.press, type: 'press' }, { t: T.ign, type: 'ignition' }, { t: T.lift, type: 'lift' },
  { t: T.pass, type: 'wall' }, { t: T.cam, type: 'wallcam' }, { t: T.look, type: 'look' },
];
