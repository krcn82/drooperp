import { logError } from "../lib/error-logging";
import { getRKSVConfig } from "./rksv-utils";
import fetch from "node-fetch";

/**
 * 🇩🇪 Abstrakte Signaturfunktion für RKSV-konforme Kassen.
 * 🇬🇧 Abstract signature provider for RKSV-compliant cash registers.
 *
 * Unterstützt:
 *  - A-Trust Online (Cloud-Signatur)
 *  - USB/SmartCard (zukünftige Erweiterung)
 */
export async function signWithRKSVProvider(
  tenantId: string,
  dataToSign: string
): Promise<string> {
  try {
    const creds = await getRKSVConfig(tenantId);
    const { signatureType, aTrustUser, aTrustPassword } = creds as any;

    if (signatureType === "atrust_online") {
      if (!aTrustUser || !aTrustPassword) {
        throw new Error("A-Trust credentials are not configured for this tenant.");
      }
      return await signWithATrustOnline(dataToSign, aTrustUser, aTrustPassword);
    } else if (signatureType === "usb") {
      // Zukunft: lokale Signaturstation oder Middleware
      throw new Error("Lokale Signaturgeräte noch nicht implementiert.");
    } else {
      throw new Error(`Unbekannter Signaturtyp: ${signatureType}`);
    }
  } catch (err: any) {
    await logError(tenantId, "signWithRKSVProvider", err.message || "Signaturfehler", "critical");
    throw new Error("Fehler bei der Signaturerstellung.");
  }
}

/**
 * 🇩🇪 Signiert Daten mit dem A-Trust Online Service.
 * 🇬🇧 Signs data using the A-Trust Online cloud service.
 */
async function signWithATrustOnline(
  dataToSign: string,
  username: string,
  password: string
): Promise<string> {
  const response = await fetch("https://mobile.a-trust.at/asignrkonline/v2/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password, // Should be retrieved from a secret manager
      dataToBeSigned: Buffer.from(dataToSign).toString("base64"),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`A-Trust API Fehler: ${response.status} - ${text}`);
  }

  const result = await response.json() as { signature: string };
  return result.signature; // base64 encoded signature
}
