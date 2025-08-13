function assignCouriers(orders, couriers) {
    
  // Build maps for quick courier lookup by normalized city or zone
  const zoneMap = new Map();
  const cityMap = new Map();

  couriers.forEach(courier => {
    courier.zonesCovered.forEach(zone => {
      if (!zoneMap.has(zone)) zoneMap.set(zone, []);
      zoneMap.get(zone).push(courier);
    });
  });
  console.log(zoneMap)

  // Track courier loads by courierId
  const courierLoads = {};
  couriers.forEach(courier => {
    courierLoads[courier.courierId] = 0;
  });

  const assignments = [];
  const unassigned = [];

  for (const order of orders) {
    // Get couriers covering city or zone
    const couriersByZone = zoneMap.get(order.zone) || [];
    const couriersByCity = zoneMap.get(order.city) || [];
    
    // Combine unique couriers covering either city or zone
    const combinedCouriersMap = new Map();
    couriersByZone.forEach(c => combinedCouriersMap.set(c.courierId, c));
    couriersByCity.forEach(c => combinedCouriersMap.set(c.courierId, c));
    const candidateCouriers = Array.from(combinedCouriersMap.values());

    // Filter by constraints
    const eligibleCouriers = candidateCouriers.filter(courier => {
      if (order.paymentType === "COD" && !courier.acceptsCOD) return false;
      if (courier.exclusions.includes(order.productType)) return false;

      const load = courierLoads[courier.courierId] || 0;
      if (load + order.weight > courier.dailyCapacity) return false;

      return true;
    });

    if (eligibleCouriers.length === 0) {
      unassigned.push({
        orderId: order.orderId,
        reason: "no_supported_courier_or_capacity"
      });
      continue;
    }

    // Tie-break sorting:
    eligibleCouriers.sort((a, b) => {
      // 1. Priority (lower better)
      if (a.priority !== b.priority) return a.priority - b.priority;

      // 2. Earliest deadline (order.deadline is string "YYYY-MM-DD HH:mm")
      const deadlineA = new Date(order.deadline).getTime();
      const deadlineB = new Date(order.deadline).getTime();
      if (deadlineA !== deadlineB) return deadlineA - deadlineB;

      // 3. Lowest current load
      const loadA = courierLoads[a.courierId] || 0;
      const loadB = courierLoads[b.courierId] || 0;
      if (loadA !== loadB) return loadA - loadB;

      // 4. Lexicographic by courierId
      return a.courierId.localeCompare(b.courierId);
    });

    // Assign the top courier
    const chosen = eligibleCouriers[0];
    assignments.push({
      orderId: order.orderId,
      courierId: chosen.courierId
    });

    courierLoads[chosen.courierId] += order.weight;
  }

  // Prepare capacity usage output
  const capacityUsage = couriers.map(courier => ({
    courierId: courier.courierId,
    totalWeight: courierLoads[courier.courierId] || 0
  }));

  return { assignments, unassigned, capacityUsage };
}
module.exports=assignCouriers
