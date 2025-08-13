# AI_NOTES



## 1. Example Prompts Used & Iteration

1. **Generating reconciliation logic for courier assignments:**  
   - Prompt: *"Generate code to reconcile orders with courier logs and detect missing, unexpected, duplicate, late, misassigned, and overloaded couriers."*  
   - Initial result: AI produced basic reconciliation but missed handling **overloadedCouriers** correctly.  
   - Rephrased prompt: *"Include overload detection based on courier daily capacity and total assigned weight."*  
   - Result: Correct handling of overloaded couriers implemented.

2. **Handling normalization and merging of orders:**  
   - Prompt: *"Write utilities to normalize order IDs, addresses, cities, and zones, and merge duplicates while generating warnings."*  
   - Initial result: Some edge cases (e.g., `ORD001` vs `ORD-001`) were not handled.  
   - Rephrased prompt: *"Normalize order IDs by inserting missing dashes and trimming non-numeric characters after digits."*  
   - Result: Robust normalization logic implemented.

3. **Optimizing courier assignment with tie-breakers:**  
   - Prompt: *"Assign couriers considering zones, exclusions, COD support, capacity, and earliest deadline first."*  
   - Initial result: AI considered priority but ignored actual delivery time per courier.  
   - Rephrased prompt: *"Add a deliveryTime field per courier and use it as the primary tie-breaker for earliest possible completion."*  
   - Result: Delivery-time-aware assignment implemented, ensuring realistic scheduling.

4. **Test case generation for edge scenarios:**  
   - Prompt: *"Generate JSON orders, couriers, and logs to test missing, unexpected, duplicate, late, misassigned, and overloaded cases."*  
   - Initial result: Some test cases missed order logs or had inconsistent courier coverage.  
   - Rephrased prompt: *"Ensure every generated test case has orders, couriers, and logs covering all scenarios, including capacity overload and fragile/COD restrictions."*  
   - Result: Full suite of comprehensive test cases created.

---

## 2. Key Feature Added

**Courier Delivery Time (`deliveryTime`) Field:**  
- GPT initially did not consider courier-specific delivery time when choosing among eligible couriers.  
- I added a new field `deliveryTime` in the courier objects to track how long each courier typically takes per delivery.  
- The assignment algorithm now considers this field as a primary tie-breaker: the courier who can deliver an order earliest is prioritized. (NOTE: It can be used outside the testing files as it was developed after finishing testing the uploaded couriers file has already the deliveryTime key )
- This ensures realistic assignment scheduling and demonstrates advanced handling of operational constraints.

---

## 3. Changes Made to GPT Suggestions

- Corrected **Zones CSV Parsing**: ensured the first row (headers) is skipped properly.  
- Fixed **Deadline Handling**: sorted orders by earliest deadline before assignment.  
- Implemented **Delivery Time Tie-Breaker**, which was missing in AI-generated logic.  

---

## 4. AI Mistakes Corrected

- Not handling courier delivery time in assignments.  
- Misunderstanding of logs CSV first row (headers vs data).  
- No real implementation for earliest deadline priority across orders.  

---

## 5. Summary

The AI provided scaffolding and logic suggestions, but manual adjustments were required to:  
- Include **deliveryTime** in the courier objects and use it for assignment prioritization.  
- Correct zones mapping.  
- Sort orders by deadline.  

These enhancements improved accuracy, reflected the intended business logic, and demonstrate experience in **AI-assisted prompt engineering** for practical problem-solving.
