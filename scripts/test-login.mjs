// Quick check: can we log in and see your plant?  Run: npm run test:login
import { createHash } from "crypto";

const BASE = process.env.SHINE_BASE_URL || "https://web.shinemonitor.com/public/";
const KEY = process.env.SHINE_COMPANY_KEY || "bnrl_frRFjEz8Mkn";
// Match the ShineMonitor web portal exactly: no extra params. (source=1 would mean the storage platform → ERR_NOT_FOUND_USR for PV accounts.)
const SUFFIX = process.env.SHINE_SUFFIX ?? "";
const sha1 = (s) => createHash("sha1").update(s).digest("hex");
const { SHINE_USER: usr, SHINE_PASS: pwd } = process.env;
if (!usr || !pwd) { console.error("✗ Fill SHINE_USER and SHINE_PASS in .env.local"); process.exit(1); }

const get = async (url) => { const j = await (await fetch(url)).json(); if (j.err) throw new Error(`err 0x${j.err.toString(16)} ${j.desc}`); return j.dat; };

let salt = Date.now().toString();
let action = `&action=auth&usr=${encodeURIComponent(usr)}&company-key=${KEY}${SUFFIX}`;
const auth = await get(`${BASE}?sign=${sha1(salt + sha1(pwd) + action)}&salt=${salt}${action}`).catch((e) => {
  console.error("✗ Login failed:", e.message, "\n  Check username/password (same as SmartClient app)."); process.exit(1);
});
console.log("✓ Logged in");

const call = (params) => {
  salt = Date.now().toString();
  action = Object.entries(params).map(([k, v]) => `&${k}=${v}`).join("") + SUFFIX;
  return get(`${BASE}?sign=${sha1(salt + auth.secret + auth.token + action)}&salt=${salt}&token=${auth.token}${action}`);
};

const plants = await call({ action: "queryPlants", page: 0, pagesize: 10 });
for (const p of plants.plant) console.log(`✓ Plant ${p.pid}: ${p.name} (${p.nominalPower} kW)`);
const pid = plants.plant[0].pid;
const [today, total, now] = await Promise.all([
  call({ action: "queryPlantEnergyDay", plantid: pid }).catch(() => ({ energy: "?" })),
  call({ action: "queryPlantEnergyTotal", plantid: pid }),
  call({ action: "queryPlantActiveOuputPowerCurrent", plantid: pid }).catch(() => ({ outputPower: 0 })),
]);
console.log(`✓ Today ${today.energy} kWh · Lifetime ${total.energy} kWh · Now ${now.outputPower} kW`);
if (plants.plant.length > 1) console.log("  Multiple plants — set SHINE_PLANT_ID in .env.local");
