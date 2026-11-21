import assert from "node:assert/strict";
import { canViewAllContacts, canManageTeam, canViewFinance } from "./permissions";

assert.equal(canViewAllContacts("OWNER"), true);
assert.equal(canViewAllContacts("MANAGER"), true);
assert.equal(canViewAllContacts("STAFF"), false);
assert.equal(canManageTeam("OWNER"), true);
assert.equal(canManageTeam("STAFF"), false);
assert.equal(canViewFinance("ACCOUNTANT"), true);
assert.equal(canViewFinance("STAFF"), false);

console.log("tenant-isolation.test.ts passed");
