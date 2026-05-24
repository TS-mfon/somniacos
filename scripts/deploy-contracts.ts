const required = ["SOMNIA_RPC_URL", "PRIVATE_KEY"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing required deployment env vars: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Run `forge script` or the configured deployer against Somnia with packages/contracts/src/SomniacOS.sol.");
