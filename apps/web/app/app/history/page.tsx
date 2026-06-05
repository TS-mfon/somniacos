import { PageHero } from "../../../components/chrome";
import { HistoryPage } from "../../../components/history-page";

export default function Page() {
  return (
    <>
      <PageHero title="History" eyebrow="Proof archive">Review completed agent outputs, token launches, receipts, and recoverable workflow records.</PageHero>
      <HistoryPage />
    </>
  );
}
