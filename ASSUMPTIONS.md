# ASSUMPTIONS

This document summarizes the rules and assumptions used in the order normalization, deduplication, courier assignment, and reconciliation logic implemented in this project.

---

## 1. Normalization Rules

- **Order IDs**  
  - Converted to uppercase.  
  - Dash inserted between letters and digits if missing: e.g., `ORD001` → `ORD-001`.  
  - Non-digit characters after the main ID are removed: e.g., `ORD-002.` → `ORD-002`.

- **City & Zone Names**  
  - Trimmed, converted to lowercase, and normalized using `zones.csv`.  
  - Multiple parts separated by dash `-` are individually mapped using `zoneMap`.  

- **Addresses**  
  - Trimmed, quotes removed, multiple commas collapsed.  
  - Each part mapped to canonical names using `zoneMap`.  
  - Streets (`st.`) handled: `st 12` → `st.12`, standalone `st` removed.  
  - Joined with `" - "` separator and extra spaces removed.

- **Payment Type**  
  - Trimmed and normalized to either `COD` or `Prepaid`.  
  - Unknown or missing values logged.

- **Product Type**  
  - Trimmed and converted to lowercase.  

- **Deadlines**  
  - Parsed into `Date` objects using `parseDeadline`.  
  - Supports formats like `YYYY-MM-DD HH:mm` or `YYYY/MM/DD HH:mm`.  
  - Stored as UTC to avoid timezone shifts.

---

## 2. Deduplication / Merge Heuristic

- Orders are grouped by `orderId`.  
- Multiple entries with the same `orderId` are merged into a single order.  
- Conflicting fields:  
  1. Non-empty fields are preferred.  
  2. Earliest deadline is kept if multiple deadlines exist.  
- Warnings are generated for any conflicts or issues detected during merging.

---

## 3. Courier Assignment Rules

- Orders are first **sorted by earliest delivery deadline** to ensure urgent orders are assigned first.  
- Eligible couriers are determined per order based on:  
  - Zones covered (`zonesCovered`)  
  - Accepted payment types (`acceptsCOD`)  
  - Exclusions (`exclusions`)  
  - Daily capacity (`dailyCapacity`)

- Tie-breaking between eligible couriers:  
  1. **Least accumulated delivery time** (`deliveryTime` property used).  
  2. Lower priority value (`priority`).  
  3. Lexicographical order of `courierId`.

- Unassigned orders are marked if no courier meets all criteria.

---

## 4. Reconciliation / Warnings

- **Missing Orders**: Orders in `plan.json` but not found in `logs.csv`.  
- **Unexpected Orders**: Orders in `logs.csv` not present in `plan.json`.  
- **Duplicate Orders**: Same order scanned multiple times in logs.  
- **Late Deliveries**: Orders delivered after their deadline.  
- **Misassigned Orders**: Orders delivered by a courier different from the assigned one.  
- **Overloaded Couriers**: Courier assigned weight exceeds daily capacity.
