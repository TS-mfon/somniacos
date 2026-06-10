import { PageHero } from "../../../../components/chrome";
import { RegisterClient } from "../../../../components/agents/register-client";

export default function CreateAgentPage() {
  return (
    <>
      <PageHero title="Create Your Agent" eyebrow="Live on Somnia Shannon">
        Register an on-chain agent identity. One wallet signature stakes STT and submits your registration to the Somnia LLM
        validator, which approves or denies it on-chain — with an automatic refund if denied.
      </PageHero>
      <RegisterClient />
    </>
  );
}
