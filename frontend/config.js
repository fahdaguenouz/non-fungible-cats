const fs = require("fs");

fs.writeFileSync(
"./frontend/config.js",
`const CONTRACT_ADDRESS="${await contract.getAddress()}";`
);