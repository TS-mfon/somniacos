import { getOnchainActivity } from "../../../../lib/server-onchain";
import { buildOSCapabilities, defaultCapabilities, osAvailable } from "../../../../lib/os-state";
import { capabilityRegistryAbi, osContracts } from "../../../../lib/contracts";
import { publicClient } from "../../../../lib/server-onchain";
import type { Address } from "viem";
import { appErrorResponse } from "../../../../lib/app-error";

export const dynamic = "force-dynamic";

const modeLabels: Record<number, string> = {
  0: "LLM",
  1: "Website",
  2: "JSON"
};

function idFromSchema(schemaURI: string, fallback: string) {
  const marker = "somniacos://schema/";
  return schemaURI.startsWith(marker) ? schemaURI.slice(marker.length) : fallback;
}

async function readCapabilityRegistry() {
  if (!osAvailable()) return [];
  const count = await publicClient.readContract({
    address: osContracts.CapabilityRegistry as Address,
    abi: capabilityRegistryAbi,
    functionName: "getCapabilityCount"
  });
  const ids = await Promise.all(Array.from({ length: Number(count) }, (_, index) => publicClient.readContract({
    address: osContracts.CapabilityRegistry as Address,
    abi: capabilityRegistryAbi,
    functionName: "capabilityIds",
    args: [BigInt(index)]
  })));
  return Promise.all(ids.map(async (id) => {
    const capability = await publicClient.readContract({
      address: osContracts.CapabilityRegistry as Address,
      abi: capabilityRegistryAbi,
      functionName: "capabilities",
      args: [id]
    });
    const [, label, , mode, active, somniaAgentId, schemaURI] = capability;
    return {
      id: idFromSchema(schemaURI, id),
      label,
      mode: modeLabels[mode] ?? "LLM",
      somniaAgentId: somniaAgentId.toString(),
      schemaURI,
      active
    };
  }));
}

export async function GET() {
  try {
    const direct = await readCapabilityRegistry();
    if (direct.length) {
      return Response.json({
        ok: true,
        configured: osAvailable(),
        source: "contract",
        capabilities: direct
      });
    }

    const activity = await getOnchainActivity();
    const onchain = buildOSCapabilities(activity);
    return Response.json({
      ok: true,
      configured: osAvailable(),
      source: onchain.length ? "events" : "defaults",
      capabilities: onchain.length ? onchain : defaultCapabilities
    });
  } catch (error) {
    return appErrorResponse(error);
  }
}
