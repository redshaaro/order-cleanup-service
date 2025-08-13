 
const { normalizeText } = require("./Normalize");



function assignCouriers(orders, couriers, zoneMap) {
  // Track weight and time load per courier
  const courierLoads = {};   
  const courierTimes = {};  

  couriers.forEach(c => {
    courierLoads[c.courierId] = 0;
    courierTimes[c.courierId] = 0;  
  });

  // Normalize zones and exclusions
  const preppedCouriers = couriers.map(c => ({
    ...c,
    normZones: (c.zonesCovered || []).map(z =>
      normalizeText(z, zoneMap).toLowerCase().trim().replace(/\s+/g, " ")
    ),
    normExclusions: (c.exclusions || []).map(e => (e || "").toLowerCase().trim())
  }));

  const assignments = [];
  const unassigned = [];

  // Parse order deadline
  const parseOrderDeadline = (deadlineStr) => {
    if (!deadlineStr) return Number.POSITIVE_INFINITY;
    const isoLike = deadlineStr.replace(" ", "T");
    const d = new Date(isoLike);
    return isNaN(d.getTime()) ? Number.POSITIVE_INFINITY : d.getTime();
  };

  // Sort orders by earliest deadline first
  const sortedOrders = [...orders].sort((a, b) => parseOrderDeadline(a.deadline) - parseOrderDeadline(b.deadline));

  for (const order of sortedOrders) {
    const normCity = normalizeText(order.city, zoneMap).toLowerCase().trim().replace(/\s+/g, " ");
    const normZone = normalizeText(order.zone, zoneMap).toLowerCase().trim().replace(/\s+/g, " ");
    const isCOD = (order.paymentType || "").toLowerCase().trim() === "cod";
    const prodLower = (order.productType || "").toLowerCase().trim();
    const weightNum = Number(order.weight) || 0;

    // Filter eligible couriers
    const eligible = preppedCouriers.filter(c => {
      const zoneMatch = c.normZones.includes(normCity) || c.normZones.includes(normZone);
      const codOK = !isCOD || c.acceptsCOD === true;
      const productOK = !c.normExclusions.includes(prodLower);
      const capacityOK = (courierLoads[c.courierId] + weightNum) <= (c.dailyCapacity || 0);
      return zoneMatch && codOK && productOK && capacityOK;
    });

    if (eligible.length === 0) {
      unassigned.push({ orderId: order.orderId, reason: "no_supported_courier_or_capacity" });
      continue;
    }

    // Choose courier who can finish earliest (load * deliveryTime)
    eligible.sort((a, b) => {
      const aTime = courierTimes[a.courierId] + (a.deliveryTime || 0);
      const bTime = courierTimes[b.courierId] + (b.deliveryTime || 0);
      if (aTime !== bTime) return aTime - bTime;

      // Then lower priority
      const pr = (a.priority || 0) - (b.priority || 0);
      if (pr !== 0) return pr;

      // Then lexicographical
      return String(a.courierId).localeCompare(String(b.courierId));
    });

    const chosen = eligible[0];
    assignments.push({ orderId: order.orderId, courierId: chosen.courierId });

    // Update loads and time
    courierLoads[chosen.courierId] += weightNum;
    courierTimes[chosen.courierId] += (chosen.deliveryTime || 0);
  }

  // Build capacityUsage
  const capacityUsage = couriers.map(c => ({
    courierId: c.courierId,
    totalWeight: courierLoads[c.courierId] || 0
  }));

  return { assignments, unassigned, capacityUsage };
}

module.exports = assignCouriers;


 