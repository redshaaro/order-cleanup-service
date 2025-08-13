
function normalizeId(id) {
  if (!id) return id;
  let cleaned = id.trim().toUpperCase();

  // Insert dash between letters and digits if missing: e.g. ORD001 -> ORD-001
  cleaned = cleaned.replace(/^([A-Z]+)(\d+)/, "$1-$2");

  // Remove any non-digit chars after digits: e.g. ORD-002. -> ORD-002
  cleaned = cleaned.replace(/^([A-Z]+-\d+).*/, "$1");

  return cleaned;
}

function normalizeText(rawText, zoneMap) {
  if (!rawText) return rawText;

  return rawText
    .replace(/"/g, "") // remove all quotes early
    .split("-")
    .map(part => {
      const cleaned = part.trim().toLowerCase();
      return zoneMap[cleaned] || part.trim();
    })
    .join(" - ")
    .replace(/"/g, ""); // safety cleanup
}


function normalizeAddress(rawAddress, zoneMap) {
  if (!rawAddress) return "";

  let addr = rawAddress.trim();

  // Remove quotes and multiple commas
  addr = addr.replace(/"/g, "").replace(/,+/g, ",");

  // Split by commas or dashes
  let parts = addr.split(/[,|-]/).map(p => p.trim()).filter(Boolean);

  // Normalize each part using zoneMap
  parts = parts.map(part => {
    let lower = part.toLowerCase();
    for (const raw in zoneMap) {
      if (lower === raw.toLowerCase()) {
        return zoneMap[raw];
      }
    }
    return part;
  });

  // Fix 'st.' rules
  parts = parts.map(part => {
    // Remove all dots except in st.
    part = part.replace(/\./g, "");
    // Handle st. with number
    part = part.replace(/\bst\s*(\d+)/i, "st.$1");
    // Remove st. if no number after
    if (/\bst\b/i.test(part) && !/\bst\.\d+/i.test(part)) {
      part = part.replace(/\bst\b/i, "").trim();
    }
    return part;
  }).filter(Boolean);

  // Join street and zone with " - "
  let formatted = parts.join(" - ");

  // Collapse multiple spaces/dashes
  formatted = formatted.replace(/\s*-\s*/g, " - ").replace(/\s+/g, " ");

  return formatted.trim();
}
function normalizePaymentType(payment) {
  if (!payment) {
    console.log("Payment method required");
    return null; // or throw error or return undefined
  }

  const trimmed = payment.trim().toLowerCase();

  if (trimmed === "cod") {
    return "COD";
  } else if (trimmed === "prepaid") {
    return "Prepaid";
  } else {
    console.log("Unknown payment type:", payment);
    return null; // or return payment as-is if you prefer
  }
}
function normalizeProductType(type){

  if(!type)console.log("Product type required");
  const sanitizedType=type.trim().toLowerCase()
  return sanitizedType

  
  


}
 
function parseDeadline(deadlineStr) {
    if (!deadlineStr) return null;
    // Replace / with - for uniformity
    const normalized = deadlineStr.replace(/\//g, "-");
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date;
}




module.exports = { parseDeadline,normalizeId,normalizeProductType, normalizeAddress,normalizeText,normalizePaymentType ,normalizeProductType};
