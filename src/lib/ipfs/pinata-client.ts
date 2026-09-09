import { PinataSDK } from "pinata";

// Lazy singleton - safe to call from server-only code
let _pinata: PinataSDK | null = null;

export function getPinata(): PinataSDK {
  if (_pinata) return _pinata;

  const jwt = process.env.PINATA_JWT;
  const gateway = process.env.PINATA_GATEWAY;

  if (!jwt) throw new Error("PINATA_JWT environment variable is not set");
  if (!gateway) throw new Error("PINATA_GATEWAY environment variable is not set");

  _pinata = new PinataSDK({ pinataJwt: jwt, pinataGateway: gateway });
  return _pinata;
}

/** Build a public gateway URL from a CID */
export function ipfsGatewayUrl(cid: string): string {
  const gateway = process.env.PINATA_GATEWAY ?? "gateway.pinata.cloud";
  return `https://${gateway}/ipfs/${cid}`;
}
