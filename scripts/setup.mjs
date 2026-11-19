import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
if (!existsSync(".env")) {
  const contents = readFileSync(".env.example", "utf8")
    .replace("replace-with-a-random-local-secret-at-least-32-characters", randomBytes(32).toString("hex"))
    .replace("replace-with-a-different-random-local-secret", randomBytes(32).toString("hex"))
    .replace("replace-with-a-local-demo-password", randomBytes(18).toString("base64url"));
  writeFileSync(".env", contents, { flag: "wx" });
  console.log("Created private .env. Read DEMO_PASSWORD locally to log in to seeded accounts.");
}
mkdirSync("public/images", { recursive: true });
const palettes = [["#d6b69b", "#9d4837"], ["#c2c7ba", "#3f5149"], ["#e6c9a3", "#a57b42"], ["#b9cccb", "#496e72"], ["#d0b4a9", "#80544b"], ["#e3d5bf", "#b86447"]];
for (const [i, [bg, cloth]] of palettes.entries()) {
  const pants = i === 1 || i === 3;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="800" viewBox="0 0 720 800">
  <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#f0e9dd"/></linearGradient><linearGradient id="cloth" x2="1" y2=".6"><stop stop-color="${cloth}"/><stop offset=".5" stop-color="${cloth}" stop-opacity=".85"/><stop offset="1" stop-color="${cloth}"/></linearGradient><filter id="shadow"><feDropShadow dx="10" dy="18" stdDeviation="13" flood-opacity=".15"/></filter></defs>
  <path fill="url(#bg)" d="M0 0h720v800H0z"/><path d="M45 800V260a200 200 0 0 1 400 0v540" fill="#ffffff" opacity=".18"/><path d="M555 80v620M578 80v620M601 80v620" stroke="#fff" opacity=".25" stroke-width="2"/>
  <ellipse cx="360" cy="729" rx="220" ry="25" fill="#6c5544" opacity=".12"/>
  <path d="M360 100v35m-85 30 85-30 85 30" fill="none" stroke="#795b41" stroke-width="5" stroke-linecap="round"/>
  <g filter="url(#shadow)"><path d="${pants ? "M300 165 220 205 170 370 227 390 260 290 260 510 460 510 460 290 493 390 550 370 500 205 420 165 400 210 320 210Z" : "M300 165 230 195 196 293 249 316 283 265 285 355 190 673Q360 727 530 673L435 355 437 265 471 316 524 293 490 195 420 165Q360 225 300 165Z"}" fill="url(#cloth)"/>
  ${pants ? `<path d="M265 510h190l27 204h-93l-29-150-29 150h-93z" fill="${cloth}"/><path d="M360 260v251m-60-315 60 64 60-64" fill="none" stroke="#e6d5bd" stroke-opacity=".5" stroke-width="3"/><circle cx="360" cy="315" r="4" fill="#d0af77"/>` : `<path d="M287 356q73 22 146 0M300 167q60 90 120 0M288 367 257 671m174-304 32 304m-103-304v325" fill="none" stroke="#f8e3c9" stroke-opacity=".3" stroke-width="3"/>`}
  ${i === 0 || i === 2 ? `<g fill="#eacb87" opacity=".7">${Array.from({ length: 28 }, (_, n) => `<circle cx="${292 + n % 7 * 22}" cy="${400 + Math.floor(n / 7) * 55}" r="3"/>`).join("")}</g>` : ""}</g>
  <path d="M55 624q50-80 65-10t50-40" fill="none" stroke="#8a6c45" stroke-width="4"/><circle cx="64" cy="643" r="17" fill="none" stroke="#8a6c45" stroke-width="4"/><circle cx="95" cy="651" r="17" fill="none" stroke="#8a6c45" stroke-width="4"/>
  <path d="M620 697V470m0 70q-80-30-45-80 52 16 45 80m0 50q75-44 70-82-63-4-70 82" fill="#748168" stroke="#68745e" stroke-width="3"/><path d="M585 676h70l-12 55h-46z" fill="#b79070"/>
  <text x="35" y="46" font-family="Georgia,serif" font-size="16" fill="#5c5548" letter-spacing="4">STITCH / STUDIO ${String(i + 1).padStart(2, "0")}</text></svg>`;
  writeFileSync(`public/images/atelier-${i === 5 ? "hero" : i + 1}.svg`, svg);
}
console.log("Generated six original SVG garment illustrations; no third-party imagery.");
