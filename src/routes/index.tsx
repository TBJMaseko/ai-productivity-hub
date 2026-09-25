import { createFileRoute } from "@tanstack/react-router";
import { NexaWorkspace } from "@/components/nexa-workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexa | AI Workplace Productivity Assistant" },
      { name: "description", content: "Draft emails, summarize meetings, plan tasks, and solve workplace challenges with Nexa." },
      { property: "og:title", content: "Nexa | AI Workplace Productivity Assistant" },
      { property: "og:description", content: "A focused AI workspace for emails, meeting notes, planning, and workplace questions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <NexaWorkspace />;
}
