// mergeOrders.js

// Check if two addresses are similar enough
function areAddressesSimilar(addr1, addr2) {
  if (!addr1 || !addr2) return false;

  // Normalize by removing non-alphanumeric except spaces and lowercase
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

  // For deadlines, keep the earliest (non-null)
  const deadlines = ordersGroup
    .map(o => o.deadline)
    .filter(d => d !== null)
    .sort((a, b) => a - b);
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
      break; // One warning per order is enough
    }
  }

  return { merged, warnings };
}

// Group orders by normalized orderId
function groupOrdersById(orders) {
  return orders.reduce((groups, order) => {
    groups[order.orderId] = groups[order.orderId] || [];
    groups[order.orderId].push(order);
    return groups;
  }, {});
}

module.exports = { mergeOrders, groupOrdersById, areAddressesSimilar };
