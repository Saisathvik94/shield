import { config } from "dotenv";
import algosdk from "algosdk";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });

const scriptDir = dirname(fileURLToPath(import.meta.url));
const contractDir = join(scriptDir, "..", "contracts");
execFileSync("python", ["permission_registry.py"], { cwd: contractDir, stdio: "inherit" });
const approvalSource = readFileSync(join(contractDir, "permission_approval.teal"), "utf8");
const clearSource = readFileSync(join(contractDir, "permission_clear.teal"), "utf8");
const nodeUrl = process.env.ALGORAND_NODE_URL;
const nodeToken = process.env.ALGORAND_NODE_TOKEN ?? "";
const mnemonic = process.env.ALGORAND_TREASURY_MNEMONIC;

if (!nodeUrl || !mnemonic) {
  throw new Error("ALGORAND_NODE_URL and ALGORAND_TREASURY_MNEMONIC are required.");
}

const algod = new algosdk.Algodv2(nodeToken, nodeUrl, "");
const treasury = algosdk.mnemonicToSecretKey(mnemonic);

async function compile(source) {
  const result = await algod.compile(new TextEncoder().encode(source)).do();
  return Uint8Array.from(Buffer.from(result.result, "base64"));
}

const approvalProgram = await compile(approvalSource);
const clearProgram = await compile(clearSource);
if (process.env.PERMISSION_APP_COMPILE_ONLY === "1") {
  console.log("Permission app TEAL compiled successfully.");
  process.exit(0);
}
const params = await algod.getTransactionParams().do();
const createTxn = algosdk.makeApplicationCreateTxnFromObject({
  sender: treasury.addr,
  onComplete: algosdk.OnApplicationComplete.NoOpOC,
  approvalProgram,
  clearProgram,
  numGlobalByteSlices: 1,
  numGlobalInts: 0,
  numLocalByteSlices: 0,
  numLocalInts: 0,
  extraPages: 0,
  suggestedParams: params,
});

const signed = createTxn.signTxn(treasury.sk);
const { txid } = await algod.sendRawTransaction(signed).do();
const confirmation = await algosdk.waitForConfirmation(algod, txid, 10);
const appId = Number(confirmation.applicationIndex);
const appAddress = algosdk.getApplicationAddress(appId);

const fundingParams = await algod.getTransactionParams().do();
const fundingTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
  sender: treasury.addr,
  receiver: appAddress,
  amount: 300_000,
  suggestedParams: fundingParams,
});
const fundingSigned = fundingTxn.signTxn(treasury.sk);
await algod.sendRawTransaction(fundingSigned).do();

console.log(`Permission app deployed: ${appId}`);
console.log(`Permission app address: ${appAddress}`);
console.log(`Set ALGORAND_PERMISSION_APP_ID=${appId} in .env.local`);
