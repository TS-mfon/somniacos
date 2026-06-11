export const dynamic = "force-dynamic";

export async function POST() {
  return Response.json(
    {
      ok: false,
      error: {
        code: "SOMNIA_TRANSACTION_REQUIRED",
        message: "Agent execution requires a wallet-signed Somnia Shannon transaction.",
        action: "Submit through the Workbench and wait for the onchain Somnia callback.",
        retryable: false
      },
      chainId: 50312
    },
    { status: 409 }
  );
}
