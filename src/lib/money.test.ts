import assert from "node:assert/strict";
import { formatINR, paiseToRupees, rupeesToPaise } from "./money";

assert.equal(rupeesToPaise(10), 1000);
assert.equal(rupeesToPaise("10.50"), 1050);
assert.equal(paiseToRupees(1050), 10.5);
assert.equal(formatINR(100000), "₹1,000");
assert.equal(rupeesToPaise(0.1) + rupeesToPaise(0.2), 30);

console.log("money.test.ts passed");
