import { PageHero } from "../../../components/chrome";
import { ReceiptsPage } from "../../../components/receipts-page";

export default function Page() {
  return (
    <>
      <PageHero title="Receipts" eyebrow="Proof archive">Inspect mission receipts, token launch artifacts, result hashes, transaction links, and agent chains.</PageHero>
      <ReceiptsPage />
    </>
  );
}
