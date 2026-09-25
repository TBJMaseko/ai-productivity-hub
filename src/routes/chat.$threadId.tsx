import { createFileRoute } from "@tanstack/react-router";
import { NexaWorkspace } from "@/components/nexa-workspace";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Ask Nexa | Workplace Productivity Chat" },
      { name: "description", content: "Talk with Nexa about workplace communication, planning, meetings, and productivity." },
      { property: "og:title", content: "Ask Nexa | Workplace Productivity Chat" },
      { property: "og:description", content: "A private, browser-based workplace productivity conversation with Nexa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  return <NexaWorkspace initialTool="chat" threadId={threadId} />;
}