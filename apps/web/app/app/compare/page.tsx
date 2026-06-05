import { PageHero } from "../../../components/chrome";
import { ComparePage } from "../../../components/compare-page";

export default function Page() {
  return (
    <>
      <PageHero title="Compare" eyebrow="Multi-agent output review">Run the same task through multiple specialists and compare clarity, confidence, and usefulness before committing to an onchain proof run.</PageHero>
      <ComparePage />
    </>
  );
}
