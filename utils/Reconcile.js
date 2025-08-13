const { normalizeId, normalizeText, parseDeadline } = require("./Normalize");

function reconcileDeliveries(cleanOrders, assignments, couriers, logsCsv, zoneMap) {
    // Parse logs
    const logEntries = logsCsv.trim().split("\n").map(line => {
        const [orderId, courierId, timestamp] = line.split(",").map(item => item.trim());
 
        return {
            orderId: normalizeId(orderId),
            courierId: courierId.toUpperCase(),
            timestamp: parseDeadline(timestamp),
             
        };
            

    });
 

    // Lookup maps
    const ordersMap = new Map(cleanOrders.orders.map(o => [normalizeId(o.orderId), o]));
    
    const assignmentsMap = new Map(assignments.map(a => [normalizeId(a.orderId), a.courierId.toUpperCase()]));

    const logEntriesMap = new Map();
    const logCountMap = {};

    // Track duplicates and earliest timestamp
    for (const entry of logEntries) {
        logCountMap[entry.orderId] = (logCountMap[entry.orderId] || 0) + 1;

        if (!logEntriesMap.has(entry.orderId) || entry.timestamp < logEntriesMap.get(entry.orderId).timestamp) {
            logEntriesMap.set(entry.orderId, entry);
        }
    }

    // Init reconciliation
    const reconciliation = {
        missing: [],
        unexpected: [],
        duplicate: [],
        late: [],
        misassigned: [],
        overloadedCouriers: []
    };

    // Courier weight tracking
    const courierWeights = {};
    for (const c of couriers) {
        courierWeights[c.courierId.toUpperCase()] = 0;
    }

    const loggedOrderIds = new Set(logEntries.map(e => e.orderId));

    // 1. Missing = in assignments but not logged
    for (const { orderId } of assignments) {
        const id = normalizeId(orderId);
        if (!loggedOrderIds.has(id)) {
            reconciliation.missing.push(id);
        }
    }

    // 2. Unexpected = in logs but not in clean orders
    for (const entry of logEntries) {
        if (!ordersMap.has(entry.orderId)) {
            reconciliation.unexpected.push(entry.orderId);
        }
    }

    // 3. Duplicate
    for (const [id, count] of Object.entries(logCountMap)) {
        if (count > 1) reconciliation.duplicate.push(id);
    }

    // 4. Late & Misassigned + courier weights
    for (const [id, logEntry] of logEntriesMap.entries()) {
        const plannedOrder = ordersMap.get(id);
        if (!plannedOrder) continue;

        // Late
        if (plannedOrder.deadline && logEntry.timestamp > parseDeadline(plannedOrder.deadline)) {
            reconciliation.late.push(id);
        }

        // Misassigned
        const plannedCourier = assignmentsMap.get(id);
        if (plannedCourier && logEntry.courierId !== plannedCourier) {
            reconciliation.misassigned.push(id);
        }

        // Add weight
        if (plannedOrder.weight) {
            courierWeights[logEntry.courierId] += Number(plannedOrder.weight);
        }
    }

    // 5. Overloaded couriers
    for (const c of couriers) {
        const id = c.courierId.toUpperCase();
        if (courierWeights[id] > c.dailyCapacity) {
            reconciliation.overloadedCouriers.push(id);
        }
    }

    // Sort everything alphabetically
    for (const key of Object.keys(reconciliation)) {
        reconciliation[key].sort((a, b) => a.localeCompare(b));
    }

    return reconciliation;
}

module.exports = reconcileDeliveries;
