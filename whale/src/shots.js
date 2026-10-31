// Shot list (film seconds), 30 fps, 1080x1920. Each shot has an exit (a hard cut or an in-camera transition)
// and one Thai caption. The words pop in one at a time, as if spoken, but there is no voice.
export const FPS = 30;
const S = [
  ['hook', 3.4, 'cut', 'ปี 1970|วาฬ|ยักษ์|ตาย|เกย|หาด|ที่|ออริกอน'],
  ['stink', 3.2, 'cut', 'ยาว|14|เมตร|หนัก|8|ตัน|และ|เริ่ม|เน่า|เหม็น'],
  ['truck', 3.4, 'push', 'งาน|นี้|ตก|เป็น|ของ|กรม|ทางหลวง'],
  ['boulder', 3.2, 'cut', 'พวกเขา|คิด|ว่า|วาฬ|ก็|เหมือน|ก้อน|หิน'],
  ['crates', 4.0, 'cut', 'เลย|ใช้|ไดนาไมต์|20|ลัง|หนัก|ราว|ครึ่ง|ตัน'],
  ['gulls', 3.2, 'whip', 'ให้|ซาก|แตก|เป็น|ชิ้น|เล็กๆ|ให้|นก|กิน'],
  ['retreat', 3.6, 'cut', 'คน|ดู|ถอย|ไป|ไกล|ราว|400|เมตร'],
  ['plunger', 2.8, 'cut', 'บ่าย|3|โมง|45|นาที'],
  ['boom', 3.2, 'cut', 'ทราย|กับ|เนื้อ|วาฬ|พุ่ง|สูง|30|เมตร'],
  ['lookup', 3.2, 'tilt', 'แต่|ของ|ที่|ขึ้น|ไป|ต้อง|ตก|ลง|มา'],
  ['rain', 3.6, 'cut', 'เนื้อ|วาฬ|ตก|ใส่|คน|ดู|โชค|ดี|ไม่|มี|ใคร|เจ็บ'],
  ['car', 3.8, 'cut', 'ก้อน|หนัก|136|กิโล|ทับ|รถ|ใหม่|เอี่ยม'],
  ['owner', 2.6, 'cut', 'รัฐ|ต้อง|จ่าย|ค่า|รถ|ให้|เต็ม|ราคา'],
  ['after', 3.6, 'cut', 'ซาก|ส่วน|ใหญ่|ยัง|อยู่|ส่วน|นก|หนี|ไป|หมด'],
  ['bury', 4.2, 'end', 'สุดท้าย|ต้อง|ใช้|รถ|ดัน|ทราย|ฝัง|กลบ'],
];
const list = []; let t = 0;
for (const [stage, d, out, cap] of S) { list.push({ stage, out, cap: cap.split('|'), t0: +t.toFixed(3), t1: +(t + d).toFixed(3) }); t += d; }
export const DUR = +t.toFixed(3);
const at = (n) => list.find((s) => s.stage === n);
// story clock: the blast, then the physics (baked from the same instant) decides when things land
export const T = { blast: at('plunger').t1 - 0.1, carHit: 38.0 };
export const SHOTS = { list, at, T };
