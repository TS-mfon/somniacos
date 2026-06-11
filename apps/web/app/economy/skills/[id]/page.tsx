import { notFound } from "next/navigation";
import { WorkflowClient } from "../../../../components/economy/workflow-client";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; if (id !== "drafter" && id !== "website-research") notFound(); return <WorkflowClient id={id} />; }
