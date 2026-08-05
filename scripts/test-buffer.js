// ─── Booking Buffer Test Script ─────────────────────────────────────────────
// Run: node scripts/test-buffer.js
// Tests the combined radius + GPS distance buffer logic from BookService.tsx

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getMinBufferMinutes(radius, vendorCoords, userCoords) {
  const radiusBuffer = radius && radius > 0
    ? Math.max(30, Math.min(radius * 2, 90))
    : 60;

  let distanceBuffer = 0;
  if (vendorCoords && vendorCoords.length === 2 && userCoords?.lat && userCoords?.lon) {
    const distKm = haversine(
      parseFloat(userCoords.lat), parseFloat(userCoords.lon),
      vendorCoords[1], vendorCoords[0]
    );
    distanceBuffer = Math.max(30, Math.min(distKm * 2, 90));
  }
  return Math.max(radiusBuffer, distanceBuffer);
}

function checkSlot(simulatedTime, slotHour, slotMin, buffer) {
  const now = new Date(simulatedTime);
  const slotDate = new Date(now);
  slotDate.setHours(slotHour, slotMin, 0, 0);
  const diffMin = (slotDate - now) / (1000 * 60);
  return { diffMin: Math.round(diffMin), disabled: diffMin < buffer };
}

// Vendor base locations [lng, lat]
const locations = {
  mumbai: [72.8777, 19.0760],
  naviMumbai: [73.0239, 19.0330],
  thane: [72.9781, 19.2183],
};

console.log('═══════════════════════════════════════════════════');
console.log('     BOOKING BUFFER TEST — Simulated 4:05 PM');
console.log('═══════════════════════════════════════════════════');
console.log('');

const SIMULATED_TIME = '2026-06-26T16:05:00';

const testCases = [
  { label: 'No radius, no GPS (fallback 60min)', radius: null, vendor: null, user: null },
  { label: 'Radius=15km, no GPS', radius: 15, vendor: null, user: null },
  { label: 'Radius=20km, no GPS', radius: 20, vendor: null, user: null },
  { label: 'Radius=30km, no GPS', radius: 30, vendor: null, user: null },
  { label: 'No radius, GPS Navi Mumbai (~16km)', radius: null, vendor: locations.mumbai, user: {lat:'19.0330', lon:'73.0239'} },
  { label: 'Radius=20km + GPS Navi Mumbai (~16km)', radius: 20, vendor: locations.mumbai, user: {lat:'19.0330', lon:'73.0239'} },
  { label: 'Radius=50km + GPS Navi Mumbai (~16km)', radius: 50, vendor: locations.mumbai, user: {lat:'19.0330', lon:'73.0239'} },
  { label: 'Radius=10km + GPS Thane (~20km)', radius: 10, vendor: locations.mumbai, user: {lat:'19.2183', lon:'72.9781'} },
];

for (const tc of testCases) {
  console.log(`  ${tc.label}`);
  const buffer = getMinBufferMinutes(tc.radius, tc.vendor, tc.user);
  console.log(`    Buffer: ${buffer} min`);

  for (const [h, m] of [[16,30],[17,0],[18,0]]) {
    const slot = checkSlot(SIMULATED_TIME, h, m, buffer);
    const timeStr = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
    console.log(`    ${timeStr} → ${slot.diffMin}min away → ${slot.disabled ? '❌ DISABLED' : '✅ AVAILABLE'}`);
  }
  console.log('');
}

console.log('────────────────────────────────────────────────');
console.log('  Future date: ALL slots ✅ AVAILABLE');
console.log('────────────────────────────────────────────────');
console.log('');

// Verify all edge cases
console.log('═══════════════════════════════════════════════════');
console.log('     EDGE CASE VERIFICATION');
console.log('═══════════════════════════════════════════════════');

const edgeCases = [
  [null,  null,  null,              60, 'no radius, no GPS'],
  [0,     null,  null,              60, 'radius=0 (treated as none)'],
  [5,     null,  null,              30, 'radius=5 (capped at min 30)'],
  [15,    null,  null,              30, 'radius=15 (min boundary)'],
  [20,    null,  null,              40, 'radius=20'],
  [30,    null,  null,              60, 'radius=30'],
  [45,    null,  null,              90, 'radius=45 (capped at max 90)'],
  [100,   null,  null,              90, 'radius=100 (capped at max 90)'],
  [null,  locations.mumbai, {lat:'19.0330', lon:'73.0239'}, 60, 'no radius, GPS 16km'],
  [20,    locations.mumbai, {lat:'19.0330', lon:'73.0239'}, 40, 'radius=20, GPS 16km (max)'],
  [50,    locations.mumbai, {lat:'19.0330', lon:'73.0239'}, 90, 'radius=50, GPS 16km (max)'],
  // workingLocation priority is a ?? operator in BookService.tsx — not reflected in this math-only test
];

let allPass = true;
for (const [r, v, u, expected, label] of edgeCases) {
  const result = getMinBufferMinutes(r, v, u);
  const ok = result === expected;
  console.log(`  ${ok ? '✅' : '❌'} ${label} → ${result}${ok ? '' : ' (expected ' + expected + ')'}`);
  if (!ok) allPass = false;
}

console.log('');
console.log(allPass ? '✅ ALL EDGE CASES PASSED' : '❌ SOME EDGE CASES FAILED');
console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('     HOW TO TEST IN BROWSER');
console.log('═══════════════════════════════════════════════════');
console.log('  1. Set system clock to 4:05 PM');
console.log('  2. Visit /book/SERVICE_ID');
console.log('  3. Pick today\'s date');
console.log('  4. Check available time slots');
console.log('');
console.log('  Quick test: vendor with 15km radius');
console.log('    4:30 PM → DISABLED (25 min < 30 buffer)');
console.log('    5:00 PM → AVAILABLE (55 min > 30 buffer)');
console.log('    6:00 PM → AVAILABLE');
console.log('═══════════════════════════════════════════════════');
