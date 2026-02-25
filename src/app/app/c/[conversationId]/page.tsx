import { ChatView } from "@/features/chat/components/ChatView";
import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  if (!conversationId) {
    redirect("/app");
  }
  return <ChatView conversationId={conversationId} />;
}
