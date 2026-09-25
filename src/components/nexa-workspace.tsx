"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import {
  ArrowDown, ArrowUp, Bot, CalendarClock, Check, Clipboard, Clock, FileText,
  Flag, Home, Mail, Menu, Moon, Plus, ShieldAlert, Sun, Trash2, X, Zap,
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

function AiNotice() {
  return <div role="note" aria-label="AI notice" className="mb-6 flex items-start gap-2.5 rounded-md border border-primary/30 bg-primary/5 px-3.5 py-2 text-xs leading-5 text-muted-foreground">
    <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
    <p><strong className="font-semibold text-foreground">AI notice:</strong> Nexa's responses can contain mistakes — always check and verify AI-generated output before relying on it. Please don't enter confidential or sensitive information, as AI tools carry security risks.</p>
  </div>;
}

function copyText(text: string, done: () => void) {
  void navigator.clipboard.writeText(text).then(done);
}

function draftEmail(raw: string, tone: string): string {
  const t = raw.toLowerCase();
  const intent =
    /thank|appreciat|grateful/.test(t) ? "thanks" :
    /sorry|apolog|delay|late|mistake/.test(t) ? "apology" :
    /meeting|call|schedule|catch up|sync/.test(t) ? "meeting" :
    /update|progress|status|report/.test(t) ? "update" :
    /leave|sick|off|vacation|absent/.test(t) ? "leave" :
    /ask|request|send|need|share|by |deadline|please/.test(t) ? "request" : "general";
  const subjects: Record<string, string> = {
    thanks: "Thank you", apology: "Apology and next steps", meeting: "Meeting request",
    update: "Project update", leave: "Time-off notice", request: "Request for your support", general: "Following up",
  };
  const bodies: Record<string, Record<string, string>> = {
    Formal: {
      thanks: "I would like to sincerely thank you for your support and contribution. Your effort made a meaningful difference and is greatly appreciated.",
      apology: "Please accept my apologies for the inconvenience caused. I have reviewed what happened and am taking steps to ensure it is resolved promptly and does not recur.",
      meeting: "I would like to arrange a meeting to discuss this matter in more detail. Kindly let me know which times suit your schedule over the coming days.",
      update: "I am writing to provide a brief update on the current progress. Work is on track, and I will share further details as the next milestones are completed.",
      leave: "I would like to formally notify you that I will be unavailable for the upcoming period. I will ensure my responsibilities are covered and handed over appropriately.",
      request: "I am writing to kindly request your assistance with the matter we discussed. Your timely support would be greatly appreciated to help us meet our upcoming deadline.",
      general: "I am following up on our recent discussion and would welcome your thoughts on the next steps.",
    },
    Friendly: {
      thanks: "Just wanted to say a big thank you — your help really made a difference, and I truly appreciate it!",
      apology: "I'm really sorry about the trouble this caused. I'm on it and will make sure everything's sorted out quickly.",
      meeting: "Would you be up for a quick chat about this? Let me know what time works best for you — happy to fit around your schedule.",
      update: "Quick update from my side: things are moving along nicely, and I'll keep you posted as we hit the next milestones.",
      leave: "Just a heads-up that I'll be away for a little while. I'll make sure everything's covered before I go!",
      request: "Hope you're doing well! Could you give me a hand with what we talked about? It would really help us stay on track.",
      general: "Just checking in on what we discussed — would love to hear your thoughts when you get a moment.",
    },
    Persuasive: {
      thanks: "Your contribution had a real impact on our results, and I'd love for us to keep building on this momentum together.",
      apology: "I take full responsibility for this, and I've already put a clear plan in place to fix it. I'm confident this will lead to a stronger outcome for everyone.",
      meeting: "A short conversation could help us align quickly and avoid delays down the line. Could we find 20 minutes this week?",
      update: "We're making strong progress, and with continued support we're well placed to deliver ahead of expectations.",
      leave: "I've planned my time away carefully so that the team stays fully supported and our priorities remain on schedule.",
      request: "Your support on this would make a real difference — acting now will keep us ahead of the deadline and ensure a great result for the whole team.",
      general: "I believe moving forward on this now will create real value for the team, and I'd welcome your go-ahead.",
    },
  };
  const greet = tone === "Friendly" ? "Hi there," : tone === "Formal" ? "Dear colleague," : "Hello,";
  const close = tone === "Friendly" ? "Thanks so much,\n[Your name]" : tone === "Formal" ? "Kind regards,\n[Your name]" : "Best regards,\n[Your name]";
  const followUp = tone === "Friendly" ? "Let me know if you have any questions!" : "Please don't hesitate to reach out if you need any further information.";
  return `Subject: ${subjects[intent]}\n\n${greet}\n\n${(bodies[tone] ?? bodies["Formal"] ?? {})[intent] ?? ""}\n\n${followUp}\n\n${close}`;
}

// ---------- Task planner ----------
type TaskPriority = "Low" | "Important" | "Highly important" | "Critical";
type TaskStatus = "New" | "In progress" | "Completed";
type PlannerTask = { id: string; title: string; minutes: number; priority: TaskPriority; status: TaskStatus };

const TASKS_KEY = "nexa-planner-tasks";
const PRIORITIES: TaskPriority[] = ["Low", "Important", "Highly important", "Critical"];
const STATUSES: TaskStatus[] = ["New", "In progress", "Completed"];
const priorityRank: Record<TaskPriority, number> = { "Critical": 3, "Highly important": 2, "Important": 1, "Low": 0 };
const priorityStyle: Record<TaskPriority, string> = {
  Low: "bg-muted text-muted-foreground",
  Important: "bg-primary/15 text-primary",
  "Highly important": "bg-accent text-accent-foreground ring-1 ring-primary/40",
  Critical: "bg-primary text-primary-foreground",
};
const statusStyle: Record<TaskStatus, string> = {
  New: "bg-muted text-muted-foreground",
  "In progress": "bg-primary/15 text-primary",
  Completed: "bg-secondary text-secondary-foreground line-through",
};

const sampleTasks: PlannerTask[] = [
  { id: newId(), title: "Finish Q4 launch proposal", minutes: 120, priority: "Critical", status: "In progress" },
  { id: newId(), title: "Review weekly metrics dashboard", minutes: 45, priority: "Important", status: "New" },
  { id: newId(), title: "Reply to client feedback emails", minutes: 30, priority: "Highly important", status: "New" },
  { id: newId(), title: "Prepare team check-in agenda", minutes: 20, priority: "Low", status: "Completed" },
];

function loadTasks(): PlannerTask[] {
  if (typeof window === "undefined") return sampleTasks;
  try {
    const parsed = JSON.parse(localStorage.getItem(TASKS_KEY) || "null") as PlannerTask[] | null;
    if (parsed) return parsed;
  } catch { /* start fresh */ }
  return sampleTasks;
}

const fmtMinutes = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;

function buildPlan(tasks: PlannerTask[], period: "Daily" | "Weekly"): string {
  const open = tasks.filter(t => t.status !== "Completed").sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
  if (!open.length) return "All tasks are completed — nothing left to schedule. Nice work!";
  const slots = period === "Daily" ? ["08:30", "10:30", "13:00", "15:00", "16:30"] : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const lines = open.map((t, i) => `${slots[i % slots.length]}  ${t.title} — ${fmtMinutes(t.minutes)} (${t.priority})`);
  const total = open.reduce((sum, t) => sum + t.minutes, 0);
  return `${period.toUpperCase()} PLAN\n\n${lines.join("\n")}\n\nTotal estimated effort: ${fmtMinutes(total)} across ${open.length} open task${open.length === 1 ? "" : "s"}.\nCritical and highly important tasks are scheduled first.`;
}

function PlannerTool() {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [priority, setPriority] = useState<TaskPriority>("Important");
  const [period, setPeriod] = useState<"Daily" | "Weekly">("Daily");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setTasks(loadTasks()); }, []);
  const persist = (next: PlannerTask[]) => { setTasks(next); localStorage.setItem(TASKS_KEY, JSON.stringify(next)); };

  const addTask = () => {
    const mins = Math.max(5, Math.round(Number(minutes) || 0));
    if (!title.trim() || !mins) return;
    persist([...tasks, { id: newId(), title: title.trim(), minutes: mins, priority, status: "New" }]);
    setTitle(""); setMinutes("60"); setPriority("Important");
  };
  const updateTask = (id: string, patch: Partial<PlannerTask>) => persist(tasks.map(t => t.id === id ? { ...t, ...patch } : t));
  const removeTask = (id: string) => persist(tasks.filter(t => t.id !== id));
  const moveTask = (id: string, dir: -1 | 1) => {
    const i = tasks.findIndex(t => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= tasks.length) return;
    const next = [...tasks];
    const a = next[i]; const b = next[j];
    if (a && b) { next[i] = b; next[j] = a; persist(next); }
  };

  const generatePlan = () => {
    if (!tasks.length) return;
    setLoading(true); setPlan("");
    window.setTimeout(() => { setPlan(buildPlan(tasks, period)); setLoading(false); }, 850);
  };

  const openCount = tasks.filter(t => t.status !== "Completed").length;
  const doneCount = tasks.length - openCount;

  return <section className="mx-auto w-full max-w-5xl animate-in fade-in slide-in-from-bottom-2 duration-500">
    <div className="mb-7"><p className="mb-2 font-mono text-xs uppercase text-primary">Nexa workspace / planner</p><h1 className="font-display text-3xl font-semibold md:text-4xl">AI Task Planner</h1><p className="mt-2 text-muted-foreground">Add tasks with time estimates and importance, track their progress, and let Nexa shape your day or week.</p></div>

    <div className="grid gap-5 xl:grid-cols-2">
      <div className="space-y-5">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold" htmlFor="planner-title">Add a task</label>
          <input id="planner-title" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addTask(); }} placeholder="e.g. Finish the client proposal" className="w-full rounded-md border bg-background/60 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <input aria-label="Estimated minutes" type="number" min={5} step={5} value={minutes} onChange={e => setMinutes(e.target.value)} className="w-24 rounded-md border bg-background/60 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
            <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}><SelectTrigger aria-label="Task importance" className="sm:w-44"><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map(p => <SelectItem value={p} key={p}>{p}</SelectItem>)}</SelectContent></Select>
            <Button onClick={addTask} disabled={!title.trim()} className="ml-auto h-10 px-5"><Plus />Add task</Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Your tasks</p><p className="text-xs text-muted-foreground">{openCount} open · {doneCount} completed</p></div>
          {tasks.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No tasks yet — add your first one above.</p> :
          <ul className="space-y-2">{tasks.map((t, i) => <li key={t.id} className="rounded-md border bg-panel p-3">
            <div className="flex items-start gap-2">
              <div className="flex flex-col">
                <Button variant="ghost" size="icon-sm" aria-label="Move task up" disabled={i === 0} onClick={() => moveTask(t.id, -1)}><ArrowUp /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Move task down" disabled={i === tasks.length - 1} onClick={() => moveTask(t.id, 1)}><ArrowDown /></Button>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${t.status === "Completed" ? "line-through opacity-60" : ""}`}>{t.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"><Clock className="size-3" />{fmtMinutes(t.minutes)}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${priorityStyle[t.priority]}`}><Flag className="size-3" />{t.priority}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Status for ${t.title}`}>
                  {STATUSES.map(s => <button key={s} onClick={() => updateTask(t.id, { status: s })} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${t.status === s ? statusStyle[s] : "bg-background text-muted-foreground hover:bg-accent"}`}>{s}</button>)}
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete ${t.title}`} onClick={() => removeTask(t.id)}><Trash2 /></Button>
            </div>
          </li>)}</ul>}
        </div>
      </div>

      <div className="relative min-h-96 rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div><p className="text-sm font-semibold">Your {period.toLowerCase()} plan</p><p className="text-xs text-muted-foreground">Most important tasks are scheduled first.</p></div>
          <Button variant="ghost" size="icon" aria-label="Copy plan" disabled={!plan} onClick={() => copyText(plan, () => { setCopied(true); setTimeout(() => setCopied(false), 1300); })}>{copied ? <Check /> : <Clipboard />}</Button>
        </div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <Select value={period} onValueChange={v => setPeriod(v as "Daily" | "Weekly")}><SelectTrigger aria-label="Plan period" className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent>{["Daily", "Weekly"].map(x => <SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select>
          <Button onClick={generatePlan} disabled={!tasks.length || loading} className="ml-auto h-10 px-5">{loading ? <><Zap className="animate-pulse" />Working…</> : <><Zap />Build my plan</>}</Button>
        </div>
        {loading ? <div className="flex h-64 items-center justify-center"><Shimmer className="text-sm">Nexa is organizing your schedule…</Shimmer></div> : <Textarea aria-label="Editable plan output" value={plan} onChange={e => setPlan(e.target.value)} placeholder="Your day or week plan will appear here." className="min-h-72 resize-none border-0 bg-panel p-4 font-mono text-sm shadow-none focus-visible:ring-1" />}
      </div>
    </div>
  </section>;
}

function WorkspaceTool({ kind }: { kind: "email" | "notes" }) {
  const config = {
    email: { title: "Smart Email Generator", description: "Turn a rough message into a polished email.", placeholder: "e.g. Ask the product team to send final Q4 launch assets by Thursday…", action: "Generate email" },
    notes: { title: "Meeting Notes Summarizer", description: "Extract the signal from unstructured meeting notes.", placeholder: "Paste meeting notes, decisions, attendees and follow-ups…", action: "Summarize notes" },
  }[kind];
  const [input, setInput] = useState("");
  const [tone, setTone] = useState("Formal");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    if (!input.trim()) return;
    setLoading(true); setOutput("");
    window.setTimeout(() => {
      if (kind === "email") setOutput(draftEmail(input, tone));
      if (kind === "notes") setOutput(`SUMMARY\nThe team aligned on the key priorities discussed in the meeting and confirmed the next delivery milestone.\n\nACTION ITEMS\n• Project owner — circulate the updated plan by Thursday\n• Design team — deliver final assets before the next review\n• All attendees — add feedback to the shared document\n\nDECISIONS\n• Proceed with the current launch scope\n• Use the weekly check-in to track blockers\n\nDEADLINES\n• Updated plan: Thursday\n• Final review: next scheduled team meeting`);
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

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;

function nexaReply(raw: string): string {
  const text = raw.toLowerCase();
  const has = (...words: string[]) => words.some(w => text.includes(w));

  if (has("sad", "depress", "anxious", "anxiety", "overwhelm", "stress", "burnout", "burned out", "burnt out", "exhaust", "tired", "cry", "lonely", "alone"))
    return pick([
      `I’m really glad you told me that — it sounds heavy, and you don’t have to carry it alone.\n\nA few gentle thoughts:\n\n- **Right now:** take one slow breath and name one thing that would make the next hour 10% easier.\n- **Today:** shrink your list to a single must-do. Everything else can wait without the world ending.\n- **This week:** tell one person you trust how you’re actually doing.\n\nIf this feeling is sticking around or feels like too much, please consider talking to a professional or someone close to you. Want to tell me a bit more about what’s weighing on you?`,
      `Thank you for trusting me with that. Feeling this way doesn’t mean you’re failing — it usually means you’ve been strong for too long without enough support.\n\nHere’s what I’d suggest, gently:\n\n1. Lower the bar for today — done is enough, perfect is not required.\n2. Take a real break, away from screens, even if it’s ten minutes.\n3. Reach out to one person, just to say “I’m not at my best.”\n\nWhat’s the biggest thing sitting on your mind right now?`,
    ]);

  if (has("family", "mom", "dad", "mother", "father", "partner", "husband", "wife", "boyfriend", "girlfriend", "friend", "relationship", "divorce", "breakup", "broke up", "argument", "fight with"))
    return pick([
      `That sounds genuinely hard, and it makes sense that it’s on your mind — personal stuff doesn’t switch off just because the workday starts.\n\nA couple of thoughts:\n\n- **Be kind to yourself** about focus right now; your attention is split for a real reason.\n- **If it helps,** write down what you’d actually want to say to them before you say it.\n- **At work,** it’s okay to quietly lower your pace for a day or two.\n\nWould you like to talk it through? I’m listening — what happened?`,
      `I hear you. Things at home or with people we care about can take up more headspace than any deadline.\n\nYou don’t have to solve it all today. Maybe start with:\n\n1. What outcome would you actually want, if you could choose?\n2. What’s one small step toward that — a conversation, some space, an apology, a boundary?\n\nIf you want to share more, I’m here for it.`,
    ]);

  if (has("boss", "manager", "coworker", "colleague", "team member", "conflict", "rude", "unfair", "blamed", "criticized", "fired", "laid off", "layoff"))
    return pick([
      `That sounds frustrating, and it’s completely understandable to feel unsettled by it.\n\nHere’s a steady way to approach it:\n\n1. **Write down the facts** — what was said or done, without interpretation.\n2. **Decide what you need** — an apology, clarity, a change, or just to be heard.\n3. **Choose the moment** — a calm, private conversation beats a reactive reply every time.\n\nIf you’d like, tell me what happened and I can help you phrase what to say next.`,
    ]);

  if (has("meeting"))
    return `Here’s a practical approach:\n\n1. Define the decision the meeting must produce.\n2. Invite only people needed for that decision.\n3. Send context in advance.\n4. Close with owners and deadlines.\n\nWould you like me to draft an agenda?`;

  if (has("priorit", "too much to do", "to-do", "todo", "deadline", "behind"))
    return `That “everything is urgent” feeling is exhausting — let’s make it smaller.\n\n- **First:** urgent work that unblocks others\n- **Next:** focused work tied to your main goal\n- **Then:** scheduled communication and reviews\n- **Last:** small administrative tasks\n\nProtect one uninterrupted focus block before lunch. What are the top two or three things on your plate right now? I can help you order them.`;

  if (has("thank"))
    return pick([
      `You’re very welcome — I’m glad I could help. Is there anything else on your mind?`,
      `Anytime. I hope things go smoothly today — come back whenever you need a thinking partner.`,
    ]);

  if (has("hello", "hi", "hey", "good morning", "good afternoon"))
    return pick([
      `Hi there! It’s good to hear from you. How are you doing today — really?`,
      `Hey! I’m here and listening. What’s on your mind — work, life, or a bit of both?`,
    ]);

  const snippet = raw.trim().length > 60 ? raw.trim().slice(0, 60) + "…" : raw.trim();
  return pick([
    `Thanks for sharing that — “${snippet}” sounds like it matters to you, and I want to make sure I really understand.\n\nCan you tell me a little more? For example:\n\n- What’s the part that worries or frustrates you most?\n- What would a good outcome look like?\n\nOnce I understand, I can help you think through next steps.`,
    `I’m listening. There’s clearly something in “${snippet}” that’s worth slowing down for.\n\nA couple of questions so I don’t just guess:\n\n1. How long has this been on your mind?\n2. Is it something you want to **solve**, or something you needed to **say out loud**?\n\nEither is completely fine — I’m here for both.`,
    `I hear you, and I don’t want to give you a generic answer to something specific to your life.\n\nTell me a bit more about “${snippet}” — what happened, and how are you feeling about it? Then we can figure out a next step together.`,
  ]);
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
      const answer = nexaReply(text);
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
      <div className="border-t p-3"><PromptInput onSubmit={() => { send(); }} className="mx-auto max-w-3xl"><PromptInputTextarea ref={textareaRef} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Talk to Nexa about anything — work, life, or how you're feeling…"/><PromptInputFooter className="justify-end"><PromptInputSubmit status={status} disabled={!prompt.trim()}/></PromptInputFooter></PromptInput><p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">Review AI-generated guidance before using it at work.</p></div>
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
    {mobileOpen && <button aria-label="Close menu overlay" className="fixed inset-0 z-40 bg-background/70 lg:hidden" onClick={() => setMobileOpen(false)}/>}<main className="min-h-screen px-4 pb-8 pt-24 sm:px-6 lg:ml-64 lg:px-10 lg:pt-10">{threadId ? <ChatWorkspace key={threadId} threadId={threadId}/> : tool === "home" ? <Dashboard openTool={openTool}/> : tool === "chat" ? null : tool === "planner" ? <PlannerTool key="planner"/> : <WorkspaceTool key={tool} kind={tool}/>}</main>
  </div>;
}