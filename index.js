const fs = require("fs");
const { normalizeId, normalizeAddress, normalizeText } = require("./utils/Normalize");

// Load orders and zones (assume zoneMap built as before)
let orders = JSON.parse(fs.readFileSync("orders.json", "utf-8"));
let zonesCsv = fs.readFileSync("zones.csv", "utf-8");
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

// Normalize all orders first
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

// Parse deadline into Date object (returns null if invalid)
function parseDeadline(deadlineStr) {
    if (!deadlineStr) return null;
    // Replace / with - for uniformity
    const normalized = deadlineStr.replace(/\//g, "-");
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date;
}

// Simple address similarity check (returns true if similar)
function areAddressesSimilar(addr1, addr2) {
    if (!addr1 || !addr2) return false;

    // Normalize: lowercase and remove non-alphanumeric chars (except spaces)
    const norm1 = addr1.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const norm2 = addr2.toLowerCase().replace(/[^a-z0-9\s]/g, "");

    // Simple heuristic: check if one includes the other or >60% common characters
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

    // Count common chars
    const commonChars = [...norm1].filter((c) => norm2.includes(c)).length;
    const avgLength = (norm1.length + norm2.length) / 2;
    const similarity = commonChars / avgLength;

    return similarity > 0.6; // threshold
}

// Merge group of duplicate orders into one
function mergeOrders(ordersGroup) {
    const merged = {};
    const warnings = [];

    // Initialize with first order
    merged.orderId = ordersGroup[0].orderId;

    // Fields to consider
    const fields = ["city", "zone", "address", "paymentType", "productType", "weight"];

    fields.forEach((field) => {
        // Prefer first non-empty field in the group
        for (const order of ordersGroup) {
            if (order[field] !== undefined && order[field] !== "" && order[field] !== null) {
                merged[field] = order[field];
                break;
            }
        }
    });

    // Deadline: keep earliest non-null
    const deadlines = ordersGroup
        .map((o) => o.deadline)
        .filter((d) => d !== null)
        .sort((a, b) => a - b);
    merged.deadline = deadlines.length > 0 ? deadlines[0] : null;

    // Check address conflicts
    for (let i = 1; i < ordersGroup.length; i++) {
        const addr1 = merged.address;
        const addr2 = ordersGroup[i].address;

        if (addr1 && addr2 && !areAddressesSimilar(addr1, addr2)) {
            warnings.push({
                orderId: merged.orderId,
                issue: `Conflicting addresses between duplicates: "${addr1}" vs "${addr2}"`,
            });
            break; // one warning per orderId is enough
        }
    }

    return { merged, warnings };
}

// Group orders by orderId
const groupedOrders = normalizedOrders.reduce((groups, order) => {
    groups[order.orderId] = groups[order.orderId] || [];
    groups[order.orderId].push(order);
    return groups;
}, {});

// Merge all groups
let cleanOrders = [];
let allWarnings = [];

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

// Output final result
const result = {
    orders: cleanOrders,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
};

// Save to clean_orders.json
fs.writeFileSync("clean_orders.json", JSON.stringify(result, null, 2), "utf-8");

console.log("Clean orders saved to clean_orders.json");
if (allWarnings.length) {
    console.log("Warnings:");
    allWarnings.forEach((w) => console.log(w));
}
