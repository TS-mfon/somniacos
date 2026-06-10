import { notFound } from "next/navigation";
import { PageHero } from "../../../../../components/chrome";
import { SkillsClient } from "../../../../../components/agents/skills-client";
import { getSkill } from "../../../../../lib/agents/skill-registry";

export default async function SkillDetailPage({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params;
  const skill = getSkill(skillId);
  if (!skill) notFound();

  return (
    <>
      <PageHero title={skill.name} eyebrow="Live on Somnia Shannon">
        Run the {skill.name} skill against the deployed module. One wallet signature submits the request; the result resolves
        on-chain once the Somnia validator subcommittee finishes its inference.
      </PageHero>
      <SkillsClient skillId={skill.id} />
    </>
  );
}
