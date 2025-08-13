const fs = require("fs");
const { normalizeId, normalizeAddress, normalizeText, parseDeadline } = require("./utils/Normalize");
const { mergeOrders, groupOrdersById } = require("./utils/Merge");
const assignCouriers = require("./utils/AssignCourier")

// Load orders and zones CSV
let orders = JSON.parse(fs.readFileSync("orders.json", "utf-8"));
let zonesCsv = fs.readFileSync("zones.csv", "utf-8");

// Build zoneMap from CSV: raw (lowercased) → canonical
let zoneMap = {};
zonesCsv
    .trim()
    .split("\n")
    .forEach((line, index) => {
        if (index === 0) return; // skip header
        const [raw, canonical] = line
            .split(",")
            .map((s) => s.replace(/"/g, "").trim());
        zoneMap[raw.toLowerCase()] = canonical;
    });

// Normalize all orders using your utils
const normalizedOrders = orders.map((order) => ({
    orderId: normalizeId(order.orderId),
    city: normalizeText(order.city, zoneMap),
    zone: normalizeText(order.zoneHint, zoneMap),
    address: normalizeAddress(order.address, zoneMap),
    paymentType: order.paymentType ? order.paymentType.trim() : "",
    productType: order.productType ? order.productType.trim() : "",
    weight: order.weight,
    deadline: parseDeadline(order.deadline),
}));

// Group orders by orderId
const groupedOrders = groupOrdersById(normalizedOrders);

let cleanOrders = [];
let allWarnings = [];

// Merge duplicates per group
for (const orderId in groupedOrders) {
    const { merged, warnings } = mergeOrders(groupedOrders[orderId]);
    cleanOrders.push(merged);
    allWarnings.push(...warnings);
}

// Format deadlines back to string YYYY-MM-DD HH:mm
cleanOrders = cleanOrders.map((o) => ({
    ...o,
    deadline: o.deadline
        ? o.deadline.toISOString().replace("T", " ").substring(0, 16)
        : null,
}));

// Prepare final result with optional warnings
const result = {
    orders: cleanOrders,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
};

// Write cleaned data to JSON file
fs.writeFileSync("clean_orders.json", JSON.stringify(result, null, 2), "utf-8");

console.log("Clean orders saved to clean_orders.json");
const clean_orders = JSON.parse(fs.readFileSync("clean_orders.json", "utf-8"))

const couriers = JSON.parse(fs.readFileSync("couriers.json", "utf-8"))
const { assignments, unassigned, capacityUsage } = assignCouriers(clean_orders.orders, couriers);

const as = { assignments, unassigned, capacityUsage };
fs.writeFileSync("assignment_result.json", JSON.stringify(as, null, 2));
console.log("Courier assignments saved to assignment_result.json");


