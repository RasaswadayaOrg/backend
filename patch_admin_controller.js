const fs = require('fs');
const file = 'src/controllers/admin.controller.ts';
let code = fs.readFileSync(file, 'utf8');

// Try finding createOrganizer and copying it
const orgCreateRegex = /export const createOrganizer[\s\S]*?\} catch \(error\) \{[\s\S]*?\}\n};/g;
const orgUpdateRegex = /export const updateOrganizer[\s\S]*?\} catch \(error\) \{[\s\S]*?\}\n};/g;

const createOrgMatch = code.match(orgCreateRegex);
const updateOrgMatch = code.match(orgUpdateRegex);

if (createOrgMatch && updateOrgMatch) {
  const createStoreOwnerCode = createOrgMatch[0]
    .replace(/createOrganizer/g, "createStoreOwner")
    .replace(/ORGANIZER/g, "STORE_OWNER")
    .replace(/organizer/g, "store owner");

  const updateStoreOwnerCode = updateOrgMatch[0]
    .replace(/updateOrganizer/g, "updateStoreOwner")
    .replace(/ORGANIZER/g, "STORE_OWNER");

  code += "\n\n// Store Owners\n" + createStoreOwnerCode + "\n\n" + updateStoreOwnerCode;
  
  fs.writeFileSync(file, code);
  console.log("Patched admin.controller.ts successfully");
} else {
  console.log("Could not find organizer controller functions");
}
