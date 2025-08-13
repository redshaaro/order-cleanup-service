const fs = require("fs");
const { normalizeId, normalizeAddress, normalizeText, parseDeadline } = require("./utils/Normalize");
const { mergeOrders, groupOrdersById } = require("./utils/Merge");
const assignCouriers = require("./utils/AssignCourier")
const reconcileDeliveries = require("./utils/Reconcile")

// Loading required starting data
//start of preparing and normallizing orders
let orders = JSON.parse(fs.readFileSync("orders.json", "utf-8"));

let zonesCsv = fs.readFileSync("zones.csv", "utf-8");

//preparing the zones to use it in mapping
let zoneMap = {};
zonesCsv
    .trim()
    .split("\n")
    .forEach((line, index) => {
        if (index === 0) return;
        const [raw, canonical] = line
            .split(",")
            .map((s) => s.replace(/"/g, "").trim());
        zoneMap[raw.toLowerCase()] = canonical;
    });

// Generating a normalized fixed version of the orders
const normalizedOrders = orders.map((order) => ({
    orderId: normalizeId(order.orderId),
    city: normalizeText(order.city, zoneMap),
    zone: normalizeText(order.zoneHint, zoneMap),
    address: normalizeAddress(order.address, zoneMap),
    paymentType: order.paymentType ? order.paymentType.trim() : "",
    productType: order.productType ? order.productType.trim() : "",
    weight: Number(order.weight),
    deadline: parseDeadline(order.deadline),
}));


// check if there are repeated order Ids and group them into one order
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


const result = {
    orders: cleanOrders,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
};


fs.writeFileSync("clean_orders.json", JSON.stringify(result, null, 2), "utf-8");

//End of preparing and normallizing  orders 


console.log("Clean orders saved to clean_orders.json");
const clean_orders = JSON.parse(fs.readFileSync("clean_orders.json", "utf-8"))

//start of courier assignment
const couriers = JSON.parse(fs.readFileSync("couriers.json", "utf-8"))

const { assignments, unassigned, capacityUsage } = assignCouriers(clean_orders.orders, couriers, zoneMap);

const as = { assignments, unassigned, capacityUsage };

fs.writeFileSync("plan.json", JSON.stringify(as, null, 2));
console.log("Courier assignments saved to plan.json");

const assignment_result = JSON.parse(fs.readFileSync("plan.json", "utf-8"))
const logsCsv = fs.readFileSync("logs.csv", "utf-8")

const reconciliation = reconcileDeliveries(
    clean_orders,
    assignments,
    couriers,
    logsCsv,
    zoneMap
);

// Save reconciliation results
fs.writeFileSync("reconciliation.json", JSON.stringify(reconciliation, null, 2), "utf-8");
console.log("Reconciliation completed. Results saved to reconciliation.json");


