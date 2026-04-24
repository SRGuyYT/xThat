import { Suspense } from "react";

import { ChatWorkspace } from "@/components/chat-workspace";
import { enforcePageGuard } from "@/lib/security/guards";

export default async function ChatPage() {
  await enforcePageGuard("/chat", true);

  return (
    <Suspense fallback={null}>
      <ChatWorkspace />
    </Suspense>
  );
}
