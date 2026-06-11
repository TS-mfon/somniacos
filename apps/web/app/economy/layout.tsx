import { EconomyShell } from "../../components/economy/economy-shell";

export default function EconomyLayout({ children }: { children: React.ReactNode }) {
  return <EconomyShell>{children}</EconomyShell>;
}
