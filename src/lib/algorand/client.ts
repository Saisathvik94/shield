import algosdk from "algosdk";
import { algorandConfig } from "./config";

// Singleton Algodv2 client
let algodClientInstance: algosdk.Algodv2 | null = null;

export function getAlgodClient(): algosdk.Algodv2 {
  if (!algodClientInstance) {
    algodClientInstance = new algosdk.Algodv2(
      algorandConfig.token,
      algorandConfig.server,
      algorandConfig.port
    );
  }
  return algodClientInstance;
}
