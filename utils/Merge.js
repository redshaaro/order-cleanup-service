// mergeOrders.js
const { parseDeadline } = require('../utils/Normalize');
// Check if two addresses are similar enough
function areAddressesSimilar(addr1, addr2) {
  if (!addr1 || !addr2) return false;

  // Normalize addresses
  const norm1 = addr1.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const norm2 = addr2.toLowerCase().replace(/[^a-z0-9\s]/g, "");

  // Quick include check
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Count common characters
  
  const commonChars = [...norm1].filter(c => norm2.includes(c)).length;
  const avgLength = (norm1.length + norm2.length) / 2;
  const similarity = commonChars / avgLength;

  return similarity > 0.6;
}

// Merge a group of orders with the same orderId into one
function mergeOrders(ordersGroup) {
  const merged = {};
  const warnings = [];

  merged.orderId = ordersGroup[0].orderId;

  const fields = ["city", "zone", "address", "paymentType", "productType", "weight"];

  fields.forEach(field => {
    for (const order of ordersGroup) {
      if (order[field] !== undefined && order[field] !== "" && order[field] !== null) {
        merged[field] = order[field];
        break;
      }
    }
  });

  //  keep the earliest deadline 
const deadlines = ordersGroup
    .map(o => typeof o.deadline === 'string' ? parseDeadline(o.deadline) : o.deadline)
    .filter(d => d instanceof Date && !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

merged.deadline = deadlines.length > 0 ? deadlines[0] : null;

  // Check for address conflicts and warn if detected
  for (let i = 1; i < ordersGroup.length; i++) {
    const addr1 = merged.address;
    const addr2 = ordersGroup[i].address;

    if (addr1 && addr2 && !areAddressesSimilar(addr1, addr2)) {
      warnings.push({
        orderId: merged.orderId,
        issue: `Conflicting addresses between duplicates: "${addr1}" vs "${addr2}"`,
      });
      break; 
    }
  }

  return { merged, warnings };
}

// Group orders by normalized orderId
function groupOrdersById(orders) {
  return orders.reduce((groups, order) => {
    // Normalize orderId here if needed
    if (typeof order.deadline === 'string') {
      order.deadline = parseDeadline(order.deadline); 
    }
    groups[order.orderId.trim()] = groups[order.orderId.trim()] || [];
    groups[order.orderId.trim()].push(order);
    return groups;
  }, {});
}

module.exports = { mergeOrders, groupOrdersById, areAddressesSimilar };
