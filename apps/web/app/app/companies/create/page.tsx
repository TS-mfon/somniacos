import { redirect } from "next/navigation";

export default function CreateCompanyRedirect() {
  redirect("/app/agents");
}
