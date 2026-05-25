import { PageHero } from "../../../components/chrome";
import { DemoLab } from "../../../components/demo-lab";

export default function DemoLabPage() {
  return (
    <>
      <PageHero title="Demo Lab" eyebrow="Real scenario runner">Run the full autonomous economy demo as visitor-signed Somnia transactions. The lab creates live contract activity instead of simulating a static presentation.</PageHero>
      <DemoLab />
    </>
  );
}
