// test-runner.js
const fs = require("fs");
const path = require("path");
const { normalizeId, normalizeAddress, normalizeText, parseDeadline } = require("../utils/Normalize");
const { mergeOrders, groupOrdersById } = require("../utils/Merge");
const assignCouriers = require("../utils/AssignCourier");
const reconcileDeliveries = require("../utils/Reconcile");

// --- CONFIG ---
const testsDir = path.join(__dirname, "../tests"); // folders for each test
const zonesCsvPath = path.join(__dirname, "../zones.csv");
const zonesCsv = fs.readFileSync(zonesCsvPath, "utf-8");

// Build zoneMap from CSV: raw → canonical
const zoneMap = {};
zonesCsv
  .trim()
  .split("\n")
  .forEach((line, index) => {
    if (index === 0) return;
    const [raw, canonical] = line.split(",").map(s => s.replace(/"/g, "").trim());
    zoneMap[raw.toLowerCase()] = canonical;
  });

// --- HELPER ---
function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// --- RUN TESTS ---
const testFolders = fs.readdirSync(testsDir).filter(f =>
  fs.statSync(path.join(testsDir, f)).isDirectory()
);

testFolders.forEach(testName => {
  const testPath = path.join(testsDir, testName);

  console.log(`\n=== Running Test: ${testName} ===`);

  // Load orders, couriers, logs, expected
  const orders = loadJson(path.join(testPath, "orders.json"));
  const couriers = loadJson(path.join(testPath, "couriers.json"));
  const logsCsv = fs.readFileSync(path.join(testPath, "logs.csv"), "utf-8");
  const expected = loadJson(path.join(testPath, "expected.json"));

  // --- Normalize & clean orders ---
  const normalizedOrders = orders.map(order => ({
    orderId: normalizeId(order.orderId),
    city: normalizeText(order.city, zoneMap),
    zone: normalizeText(order.zoneHint, zoneMap),
    address: normalizeAddress(order.address, zoneMap),
    paymentType: order.paymentType ? order.paymentType.trim() : "",
    productType: order.productType ? order.productType.trim() : "",
    weight: order.weight,
    deadline: parseDeadline(order.deadline),
  }));

  const groupedOrders = groupOrdersById(normalizedOrders);

  let cleanOrders = [];
  let allWarnings = [];
  for (const orderId in groupedOrders) {
    const { merged, warnings } = mergeOrders(groupedOrders[orderId]);
    cleanOrders.push(merged);
    allWarnings.push(...warnings);
  }

  cleanOrders = cleanOrders.map(o => ({
    ...o,
    deadline: o.deadline
      ? o.deadline.toISOString().replace("T", " ").substring(0, 16)
      : null,
  }));

  const cleanOrdersResult = { orders: cleanOrders, warnings: allWarnings.length > 0 ? allWarnings : undefined };

  // --- Assign Couriers ---
  const { assignments } = assignCouriers(cleanOrders, couriers, zoneMap);

  // --- Reconciliation ---
  const reconciliation = reconcileDeliveries(cleanOrdersResult, assignments, couriers, logsCsv, zoneMap);

  // --- Print Results ---
  // console.log("Assignments:", JSON.stringify(assignments, null, 2));
  console.log("Reconciliation Result:", JSON.stringify(reconciliation, null, 2));
  console.log("Expected:", JSON.stringify(expected, null, 2));

});
