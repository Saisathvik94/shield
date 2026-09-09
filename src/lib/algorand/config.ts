export const algorandConfig = {
  network: process.env.ALGORAND_NETWORK || "testnet",
  server: process.env.ALGORAND_SERVER || "https://testnet-api.algonode.cloud",
  port: process.env.ALGORAND_PORT ? parseInt(process.env.ALGORAND_PORT, 10) : 443,
  token: process.env.ALGORAND_TOKEN || "",
};
