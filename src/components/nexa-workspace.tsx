"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import {
  Bot, CalendarClock, Check, Clipboard, FileText, Home, Mail, Menu, Moon,
  Plus, Sun, Trash2, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

type ToolId = "home" | "email" | "notes" | "planner" | "chat";
type StoredThread = { id: string; title: string; updatedAt: number; messages: UIMessage[] };
const THREADS_KEY = "nexa-chat-threads";

const navItems = [
  { id: "home" as const, label: "Overview", icon: Home },
  { id: "email" as const, label: "Email generator", icon: Mail },
  { id: "notes" as const, label: "Meeting notes", icon: FileText },
  { id: "planner" as const, label: "Task planner", icon: CalendarClock },
  { id: "chat" as const, label: "Ask Nexa", icon: Bot },
];

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const helloMessage = (): UIMessage => ({
  id: newId(), role: "assistant", parts: [{ type: "text", text: "Hi, I’m **Nexa** — your workplace productivity assistant. What can I help you move forward today?" }],
});
const createThread = (): StoredThread => ({ id: newId(), title: "New conversation", updatedAt: Date.now(), messages: [helloMessage()] });

function loadThreads(): StoredThread[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(THREADS_KEY) || "[]") as StoredThread[];
    if (parsed.length) return parsed;
  } catch { /* start fresh */ }
  const first = createThread();
  localStorage.setItem(THREADS_KEY, JSON.stringify([first]));
  return [first];
}

function copyText(text: string, done: () => void) {
  void navigator.clipboard.writeText(text).then(done);
}

function WorkspaceTool({ kind }: { kind: Exclude<ToolId, "home" | "chat"> }) {
  const config = {
    email: { title: "Smart Email Generator", description: "Turn a rough message into a polished email.", placeholder: "e.g. Ask the product team to send final Q4 launch assets by Thursday…", action: "Generate email" },
    notes: { title: "Meeting Notes Summarizer", description: "Extract the signal from unstructured meeting notes.", placeholder: "Paste meeting notes, decisions, attendees and follow-ups…", action: "Summarize notes" },
    planner: { title: "AI Task Planner", description: "Shape tasks and preferences into a practical schedule.", placeholder: "e.g. Finish proposal (2h), review metrics (45m), team check-in at 2pm…", action: "Build my plan" },
  }[kind];
  const [input, setInput] = useState("");
  const [tone, setTone] = useState("Formal");
  const [period, setPeriod] = useState("Daily");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    if (!input.trim()) return;
    setLoading(true); setOutput("");
    window.setTimeout(() => {
      if (kind === "email") setOutput(`Subject: Quick follow-up and next steps\n\nHi team,\n\n${input.trim()}\n\nPlease let me know if you have any questions or need additional context. I’d appreciate your response at your earliest convenience.\n\nBest regards,\n[Your name]\n\nTone: ${tone}`);
      if (kind === "notes") setOutput(`SUMMARY\nThe team aligned on the key priorities discussed in the meeting and confirmed the next delivery milestone.\n\nACTION ITEMS\n• Project owner — circulate the updated plan by Thursday\n• Design team — deliver final assets before the next review\n• All attendees — add feedback to the shared document\n\nDECISIONS\n• Proceed with the current launch scope\n• Use the weekly check-in to track blockers\n\nDEADLINES\n• Updated plan: Thursday\n• Final review: next scheduled team meeting`);
      if (kind === "planner") setOutput(`${period.toUpperCase()} PRIORITY PLAN\n\n08:30  Focus block — highest-impact task\n10:30  Review and respond to priority messages\n11:00  Complete quick administrative tasks\n13:00  Collaboration block and scheduled meetings\n15:00  Second focus block — project follow-through\n16:30  Review progress and prepare tomorrow\n\nPRIORITY ORDER\n1. Time-sensitive deliverable\n2. Work that unblocks teammates\n3. Important planning and review\n4. Low-effort administrative tasks\n\nBased on: ${input.trim()}`);
      setLoading(false);
    }, 850);
  };

  return <section className="mx-auto w-full max-w-5xl animate-in fade-in slide-in-from-bottom-2 duration-500">
    <div className="mb-7"><p className="mb-2 font-mono text-xs uppercase text-primary">Nexa workspace / {kind}</p><h1 className="font-display text-3xl font-semibold md:text-4xl">{config.title}</h1><p className="mt-2 text-muted-foreground">{config.description}</p></div>
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <label className="mb-2 block text-sm font-semibold" htmlFor={`${kind}-input`}>What are you working on?</label>
        <Textarea id={`${kind}-input`} value={input} onChange={(e) => setInput(e.target.value)} placeholder={config.placeholder} className="min-h-56 resize-none bg-background/60" />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {kind === "email" && <Select value={tone} onValueChange={setTone}><SelectTrigger aria-label="Email tone" className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent>{["Formal","Friendly","Persuasive"].map(x => <SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select>}
          {kind === "planner" && <Select value={period} onValueChange={setPeriod}><SelectTrigger aria-label="Plan period" className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent>{["Daily","Weekly"].map(x => <SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select>}
          <Button onClick={generate} disabled={!input.trim() || loading} className="ml-auto h-10 px-5">{loading ? <><Zap className="animate-pulse" />Working…</> : <><Zap />{config.action}</>}</Button>
        </div>
      </div>
      <div className="relative min-h-96 rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold">Generated output</p><p className="text-xs text-muted-foreground">Review and edit before using.</p></div><Button variant="ghost" size="icon" aria-label="Copy output" disabled={!output} onClick={() => copyText(output, () => { setCopied(true); setTimeout(() => setCopied(false), 1300); })}>{copied ? <Check /> : <Clipboard />}</Button></div>
        {loading ? <div className="flex h-64 items-center justify-center"><Shimmer className="text-sm">Nexa is organizing your content…</Shimmer></div> : <Textarea aria-label="Editable generated output" value={output} onChange={(e) => setOutput(e.target.value)} placeholder="Your editable result will appear here." className="min-h-72 resize-none border-0 bg-panel p-4 font-mono text-sm shadow-none focus-visible:ring-1" />}
      </div>
    </div>
  </section>;
}

function Dashboard({ openTool }: { openTool: (id: ToolId) => void }) {
  return <section className="mx-auto w-full max-w-6xl animate-in fade-in duration-500">
    <div className="relative overflow-hidden border-b pb-9 pt-3"><div className="absolute right-0 top-0 size-56 rounded-full bg-primary/10 blur-3xl" /><p className="mb-3 font-mono text-xs uppercase text-primary">AI workplace command center</p><h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight md:text-6xl">Make work feel lighter with <span className="text-primary">Nexa.</span></h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">Draft, distill, plan and think through everyday work — all in one focused, private workspace.</p></div>
    <div className="grid gap-px border-x border-b bg-border md:grid-cols-2 xl:grid-cols-4">
      {navItems.slice(1).map((item, i) => <button key={item.id} onClick={() => openTool(item.id)} className="group min-h-48 bg-card p-6 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><div className="mb-9 flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary"><item.icon /></span><span className="font-mono text-xs text-muted-foreground">0{i+1}</span></div><h2 className="font-display text-lg font-semibold">{item.label}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{["Create clear emails in the right tone.","Turn discussions into next steps.","Prioritize your day or week.","Talk through workplace questions."][i]}</p></button>)}
    </div>
    <div className="mt-6 flex gap-3 border-l-2 border-primary bg-panel p-4 text-sm"><Zap className="mt-0.5 size-4 shrink-0 text-primary"/><p><strong>Responsible AI:</strong> Nexa can make mistakes. Review, edit and verify every output before sharing or acting on it.</p></div>
  </section>;
}

function ChatWorkspace({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<StoredThread[]>([]);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"ready" | "submitted">("ready");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { setThreads(loadThreads()); }, []);
  const active = threads.find(t => t.id === threadId);
  useEffect(() => { const first = threads[0]; if (first && !active) void navigate({ to: "/chat/$threadId", params: { threadId: first.id }, replace: true }); }, [active, navigate, threads]);
  useEffect(() => { textareaRef.current?.focus(); }, [threadId, status]);
  const persist = (next: StoredThread[]) => { setThreads(next); localStorage.setItem(THREADS_KEY, JSON.stringify(next)); };
  const addThread = () => { const fresh = createThread(); persist([fresh, ...threads]); void navigate({ to: "/chat/$threadId", params: { threadId: fresh.id } }); };
  const removeThread = (id: string) => { const remaining = threads.filter(t => t.id !== id); const next = remaining.length ? remaining : [createThread()]; const first = next[0]; persist(next); if (id === threadId && first) void navigate({ to: "/chat/$threadId", params: { threadId: first.id } }); };
  const send = () => {
    if (!active || !prompt.trim() || status !== "ready") return;
    const text = prompt.trim(); setPrompt(""); setStatus("submitted");
    const user: UIMessage = { id: newId(), role: "user", parts: [{ type: "text", text }] };
    const withUser = threads.map(t => t.id === threadId ? { ...t, title: t.title === "New conversation" ? text.slice(0, 34) : t.title, updatedAt: Date.now(), messages: [...t.messages, user] } : t);
    persist(withUser);
    window.setTimeout(() => {
      const answer = text.toLowerCase().includes("meeting") ? "Here’s a practical approach:\n\n1. Define the decision the meeting must produce.\n2. Invite only people needed for that decision.\n3. Send context in advance.\n4. Close with owners and deadlines.\n\nWould you like me to draft an agenda?" : text.toLowerCase().includes("priorit") ? "Try this order:\n\n- **First:** urgent work that unblocks others\n- **Next:** focused work tied to your main goal\n- **Then:** scheduled communication and reviews\n- **Last:** small administrative tasks\n\nProtect one uninterrupted focus block before lunch." : "A good next step is to make the outcome specific, identify the smallest action that moves it forward, and block time for it today. If you share the constraints, I can help turn that into a concise plan.";
      const assistant: UIMessage = { id: newId(), role: "assistant", parts: [{ type: "text", text: answer }] };
      setThreads(current => { const next = current.map(t => t.id === threadId ? { ...t, updatedAt: Date.now(), messages: [...t.messages, assistant] } : t); localStorage.setItem(THREADS_KEY, JSON.stringify(next)); return next; });
      setStatus("ready");
    }, 850);
  };
  if (!active) return <div className="flex h-full items-center justify-center"><Shimmer>Opening Nexa…</Shimmer></div>;
  return <section className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-6xl overflow-hidden rounded-lg border bg-card shadow-sm">
    <aside className="hidden w-64 shrink-0 border-r bg-panel p-3 md:flex md:flex-col"><Button onClick={addThread} className="mb-4 w-full"><Plus/>New conversation</Button><p className="mb-2 px-2 font-mono text-[11px] uppercase text-muted-foreground">Recent</p><div className="space-y-1 overflow-y-auto">{threads.map(t => <div key={t.id} className={`group flex items-center rounded-md ${t.id === threadId ? "bg-accent" : "hover:bg-accent/60"}`}><button className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm" onClick={() => void navigate({ to: "/chat/$threadId", params: { threadId: t.id } })}>{t.title}</button><Button variant="ghost" size="icon-sm" className="mr-1 opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Delete ${t.title}`} onClick={() => removeThread(t.id)}><Trash2/></Button></div>)}</div></aside>
    <div className="flex min-w-0 flex-1 flex-col"><header className="flex items-center justify-between border-b px-4 py-3"><div><p className="font-display font-semibold">Ask Nexa</p><p className="text-xs text-muted-foreground">Workplace thinking partner · saved on this device</p></div><Button variant="outline" size="sm" className="md:hidden" onClick={addThread}><Plus/>New</Button></header>
      <Conversation><ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-7">{active.messages.map(message => <Message key={message.id} from={message.role}><MessageContent className={message.role === "user" ? "bg-primary text-primary-foreground" : ""}>{message.parts.map((part, i) => part.type === "text" ? <MessageResponse key={i}>{part.text}</MessageResponse> : null)}</MessageContent></Message>)}{status === "submitted" && <Message from="assistant"><MessageContent><Shimmer>Thinking with you…</Shimmer></MessageContent></Message>}</ConversationContent><ConversationScrollButton/></Conversation>
      <div className="border-t p-3"><PromptInput onSubmit={() => { send(); }} className="mx-auto max-w-3xl"><PromptInputTextarea ref={textareaRef} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ask Nexa about work, priorities, communication…"/><PromptInputFooter className="justify-end"><PromptInputSubmit status={status} disabled={!prompt.trim()}/></PromptInputFooter></PromptInput><p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">Review AI-generated guidance before using it at work.</p></div>
    </div>
  </section>;
}

export function NexaWorkspace({ initialTool = "home", threadId }: { initialTool?: ToolId; threadId?: string }) {
  const navigate = useNavigate();
  const [tool, setTool] = useState<ToolId>(threadId ? "chat" : initialTool);
  const [dark, setDark] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { const saved = localStorage.getItem("nexa-theme"); const next = saved !== "light"; setDark(next); document.documentElement.classList.toggle("dark", next); }, []);
  const openTool = (id: ToolId) => { setMobileOpen(false); if (id === "chat") { const list = loadThreads(); const first = list[0]; if (first) void navigate({ to: "/chat/$threadId", params: { threadId: first.id } }); } else { setTool(id); if (threadId) void navigate({ to: "/" }); } };
  const toggleTheme = () => { const next = !dark; setDark(next); document.documentElement.classList.toggle("dark", next); localStorage.setItem("nexa-theme", next ? "dark" : "light"); };
  return <div className="nexa-grid min-h-screen bg-background text-foreground">
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b bg-background/90 px-4 backdrop-blur-xl lg:hidden"><Button variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu/></Button><div className="ml-3 flex items-center gap-2 font-display text-lg font-bold"><span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Zap/></span>NEXA</div><Button variant="ghost" size="icon" className="ml-auto" aria-label="Toggle theme" onClick={toggleTheme}>{dark ? <Sun/> : <Moon/>}</Button></header>
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-background/95 p-4 backdrop-blur-xl transition-transform lg:w-64 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}><div className="mb-10 flex items-center gap-3 px-2 pt-1"><span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground nexa-glow"><Zap/></span><div><p className="font-display text-xl font-bold">NEXA</p><p className="font-mono text-[10px] uppercase text-muted-foreground">Work smarter</p></div><Button variant="ghost" size="icon" className="ml-auto lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X/></Button></div>
      <nav className="space-y-1" aria-label="Main navigation">{navItems.map(item => <button key={item.id} onClick={() => openTool(item.id)} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${tool === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}><item.icon className="size-4"/>{item.label}</button>)}</nav>
      <div className="mt-auto"><div className="mb-4 border-l-2 border-primary bg-panel p-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Responsible AI</strong><br/>Always review Nexa’s output before use.</div><Button variant="ghost" className="w-full justify-start" onClick={toggleTheme}>{dark ? <Sun/> : <Moon/>}{dark ? "Light mode" : "Dark mode"}</Button></div>
    </aside>
    {mobileOpen && <button aria-label="Close menu overlay" className="fixed inset-0 z-40 bg-background/70 lg:hidden" onClick={() => setMobileOpen(false)}/>}<main className="min-h-screen px-4 pb-8 pt-24 sm:px-6 lg:ml-64 lg:px-10 lg:pt-10">{threadId ? <ChatWorkspace threadId={threadId}/> : tool === "home" ? <Dashboard openTool={openTool}/> : tool === "chat" ? null : <WorkspaceTool kind={tool}/>}</main>
  </div>;
}