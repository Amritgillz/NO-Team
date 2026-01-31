import { useMemo, useState } from "react";
import { Redirect, useLocation } from "wouter";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  Shield,
  Video,
  Camera,
  PenLine,
  LogOut,
  TrendingUp,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

type RoleId = "admin" | "editor" | "shooter" | "writer";

type User = {
  name: string;
  role: RoleId;
};

type Attendance = {
  dateKey: string; // yyyy-MM-dd
  checkedInAt?: string;
  checkedOutAt?: string;
};

type Task = {
  id: string;
  title: string;
  role: Exclude<RoleId, "admin">;
  dueDateKey: string;
  status: "todo" | "in_progress" | "done";
};

type EditorLog = {
  id: string;
  dateKey: string;
  client: string;
  videoType: string;
  count: number;
};

type ShooterLog = {
  id: string;
  dateKey: string;
  client: string;
  videoType: string;
  shoots: number;
};

type WriterItem = {
  id: string;
  title: string;
  client: string;
  status: "written" | "approved" | "dropped";
};

function safeParseUser(): User | null {
  try {
    const raw = sessionStorage.getItem("crewops_user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u?.name || !u?.role) return null;
    return { name: String(u.name), role: u.role as RoleId };
  } catch {
    return null;
  }
}

function dateKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function buildWeekDays(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
}

function clampInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function pillColorForDownDay(val: number) {
  if (val === 0) return "bg-destructive/10 text-destructive border-destructive/20";
  if (val <= 1) return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300";
  return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300";
}

function TopBar({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const Icon =
    user.role === "admin"
      ? Shield
      : user.role === "editor"
        ? Video
        : user.role === "shooter"
          ? Camera
          : PenLine;

  return (
    <div className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border bg-card shadow-sm">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm text-muted-foreground" data-testid="text-app-brand">
              CrewOps
            </div>
            <div className="truncate font-semibold" data-testid="text-app-user">
              {user.name} • {user.role.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-9"
            onClick={onLogout}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  testId,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: any;
  testId: string;
}) {
  return (
    <Card className="glass noise rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground" data-testid={`text-stat-label-${testId}`}>
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold" data-testid={`text-stat-value-${testId}`}>
            {value}
          </div>
          {hint ? (
            <div className="mt-1 text-xs text-muted-foreground" data-testid={`text-stat-hint-${testId}`}>
              {hint}
            </div>
          ) : null}
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl border bg-card/70">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Card>
  );
}

function AttendanceCard({
  todayKey,
  attendance,
  setAttendance,
}: {
  todayKey: string;
  attendance: Attendance;
  setAttendance: (a: Attendance) => void;
}) {
  const checkedIn = Boolean(attendance.checkedInAt);
  const checkedOut = Boolean(attendance.checkedOutAt);

  return (
    <Card className="glass noise rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <div className="font-semibold" data-testid="text-attendance-title">
              Today’s attendance
            </div>
          </div>
          <div className="mt-1 text-sm text-muted-foreground" data-testid="text-attendance-date">
            {todayKey}
          </div>
        </div>
        <Badge
          variant="secondary"
          className={
            "border " +
            (checkedIn && !checkedOut
              ? "bg-primary/10 text-primary border-primary/20"
              : checkedIn && checkedOut
                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300"
                : "bg-muted text-muted-foreground")
          }
          data-testid="status-attendance"
        >
          {checkedIn ? (checkedOut ? "Checked out" : "Checked in") : "Not started"}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button
          className="h-11"
          disabled={checkedIn}
          onClick={() => setAttendance({ ...attendance, checkedInAt: format(new Date(), "HH:mm") })}
          data-testid="button-checkin"
        >
          Check in
        </Button>
        <Button
          variant="secondary"
          className="h-11"
          disabled={!checkedIn || checkedOut}
          onClick={() => setAttendance({ ...attendance, checkedOutAt: format(new Date(), "HH:mm") })}
          data-testid="button-checkout"
        >
          Check out
        </Button>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center justify-between rounded-xl border bg-card/50 px-4 py-2">
          <span className="text-muted-foreground" data-testid="text-checkin-label">
            Checked in
          </span>
          <span className="font-medium" data-testid="text-checkin-time">
            {attendance.checkedInAt ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border bg-card/50 px-4 py-2">
          <span className="text-muted-foreground" data-testid="text-checkout-label">
            Checked out
          </span>
          <span className="font-medium" data-testid="text-checkout-time">
            {attendance.checkedOutAt ?? "—"}
          </span>
        </div>
      </div>
    </Card>
  );
}

function WeeklyAnalytics({
  title,
  metricLabel,
  data,
  downThreshold,
  testIdPrefix,
}: {
  title: string;
  metricLabel: string;
  data: { day: string; value: number }[];
  downThreshold?: number;
  testIdPrefix: string;
}) {
  const downDays = useMemo(() => {
    const t = downThreshold ?? 0;
    return data.filter((d) => d.value <= t);
  }, [data, downThreshold]);

  const bestDay = useMemo(() => {
    if (!data.length) return null;
    return data.reduce((a, b) => (b.value > a.value ? b : a));
  }, [data]);

  return (
    <Card className="glass noise rounded-2xl p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <div className="font-semibold" data-testid={`text-${testIdPrefix}-title`}>
              {title}
            </div>
          </div>
          <div className="mt-1 text-sm text-muted-foreground" data-testid={`text-${testIdPrefix}-subtitle`}>
            Track weekly productivity and identify down days.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {bestDay ? (
            <Badge
              variant="secondary"
              className="border bg-primary/10 text-primary border-primary/20"
              data-testid={`badge-${testIdPrefix}-bestday`}
            >
              Best: {bestDay.day} ({bestDay.value})
            </Badge>
          ) : null}
          <Badge
            variant="secondary"
            className={
              "border " +
              (downDays.length
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300")
            }
            data-testid={`badge-${testIdPrefix}-downdays`}
          >
            Down days: {downDays.length}
          </Badge>
        </div>
      </div>

      <div className="mt-5 h-56 w-full" data-testid={`chart-${testIdPrefix}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 2, right: 2, top: 10, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.18} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.6)" }}
              contentStyle={{
                background: "hsl(var(--card) / 0.92)",
                border: "1px solid hsl(var(--card-border) / 0.8)",
                borderRadius: 14,
                boxShadow: "var(--shadow)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar
              dataKey="value"
              name={metricLabel}
              radius={[10, 10, 10, 10]}
              fill="hsl(var(--chart-1))"
              isAnimationActive
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {data.map((d) => (
          <span
            key={d.day}
            className={
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs " +
              pillColorForDownDay(d.value)
            }
            data-testid={`pill-${testIdPrefix}-${d.day}`}
          >
            <span className="font-medium">{d.day}</span>
            <span className="tabular-nums">{d.value}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}

function TasksCard({
  tasks,
  onToggleDone,
  title,
  testIdPrefix,
}: {
  tasks: Task[];
  onToggleDone: (id: string) => void;
  title: string;
  testIdPrefix: string;
}) {
  return (
    <Card className="glass noise rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <div className="font-semibold" data-testid={`text-${testIdPrefix}-title`}>
            {title}
          </div>
        </div>
        <Badge variant="secondary" className="border" data-testid={`badge-${testIdPrefix}-count`}>
          {tasks.filter((t) => t.status !== "done").length} open
        </Badge>
      </div>

      <div className="mt-4 grid gap-2">
        {tasks.map((t) => (
          <button
            key={t.id}
            type="button"
            className={
              "group flex w-full items-center justify-between gap-3 rounded-xl border bg-card/50 px-4 py-3 text-left transition hover:bg-card/70 " +
              (t.status === "done" ? "opacity-70" : "")
            }
            onClick={() => onToggleDone(t.id)}
            data-testid={`row-task-${t.id}`}
          >
            <div className="min-w-0">
              <div className="truncate font-medium" data-testid={`text-task-title-${t.id}`}>
                {t.title}
              </div>
              <div
                className="mt-1 text-xs text-muted-foreground"
                data-testid={`text-task-due-${t.id}`}
              >
                Due {t.dueDateKey}
              </div>
            </div>
            <Badge
              variant="secondary"
              className={
                "border " +
                (t.status === "done"
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300"
                  : t.status === "in_progress"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground")
              }
              data-testid={`status-task-${t.id}`}
            >
              {t.status === "done" ? "Done" : t.status === "in_progress" ? "In progress" : "To do"}
            </Badge>
          </button>
        ))}
      </div>

      <div className="mt-4 text-xs text-muted-foreground" data-testid={`text-${testIdPrefix}-hint`}>
        Tip: Click a task to toggle between “To do” and “Done” for this prototype.
      </div>
    </Card>
  );
}

function EditorPanel({
  weekDays,
  logs,
  setLogs,
}: {
  weekDays: Date[];
  logs: EditorLog[];
  setLogs: (v: EditorLog[]) => void;
}) {
  const [client, setClient] = useState("NovaCare");
  const [videoType, setVideoType] = useState("Reel");
  const [count, setCount] = useState(3);
  const [dayKey, setDayKey] = useState(dateKey(new Date()));

  const weekData = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of weekDays) map.set(dateKey(d), 0);
    for (const l of logs) {
      if (map.has(l.dateKey)) map.set(l.dateKey, (map.get(l.dateKey) ?? 0) + l.count);
    }
    return weekDays.map((d) => {
      const dk = dateKey(d);
      return { day: format(d, "EEE"), value: map.get(dk) ?? 0 };
    });
  }, [logs, weekDays]);

  return (
    <div className="grid gap-6">
      <Card className="glass noise rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold" data-testid="text-editorlog-title">
              Log videos edited
            </div>
            <div className="mt-1 text-sm text-muted-foreground" data-testid="text-editorlog-subtitle">
              Add today’s edited videos with video type + client.
            </div>
          </div>
          <Badge variant="secondary" className="border" data-testid="badge-editorlog-weekcount">
            This week: {weekData.reduce((s, d) => s + d.value, 0)}
          </Badge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="grid gap-2">
            <Label data-testid="label-editor-day">Day</Label>
            <Select value={dayKey} onValueChange={setDayKey}>
              <SelectTrigger data-testid="select-editor-day">
                <SelectValue placeholder="Choose day" />
              </SelectTrigger>
              <SelectContent>
                {weekDays.map((d) => {
                  const dk = dateKey(d);
                  return (
                    <SelectItem key={dk} value={dk} data-testid={`option-editor-day-${dk}`}>
                      {format(d, "EEE, MMM d")}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="editor-client" data-testid="label-editor-client">
              Client
            </Label>
            <Input
              id="editor-client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Client name"
              data-testid="input-editor-client"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="editor-type" data-testid="label-editor-type">
              Video type
            </Label>
            <Input
              id="editor-type"
              value={videoType}
              onChange={(e) => setVideoType(e.target.value)}
              placeholder="Reel, Podcast, Ad..."
              data-testid="input-editor-type"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="editor-count" data-testid="label-editor-count">
              Count
            </Label>
            <Input
              id="editor-count"
              type="number"
              value={count}
              onChange={(e) => setCount(clampInt(Number(e.target.value)))}
              data-testid="input-editor-count"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            className="h-11"
            onClick={() => {
              const id = String(Date.now());
              setLogs([
                ...logs,
                {
                  id,
                  dateKey: dayKey,
                  client: client.trim() || "Client",
                  videoType: videoType.trim() || "Video",
                  count: clampInt(count),
                },
              ]);
            }}
            data-testid="button-editor-addlog"
          >
            Add log
          </Button>

          <div className="text-sm text-muted-foreground" data-testid="text-editorlog-note">
            Your analytics update instantly.
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-2">
          {logs.slice(-5).reverse().map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card/50 px-4 py-3"
              data-testid={`row-editor-log-${l.id}`}
            >
              <div className="min-w-0">
                <div className="font-medium" data-testid={`text-editor-log-main-${l.id}`}>
                  {l.client} • {l.videoType}
                </div>
                <div className="text-xs text-muted-foreground" data-testid={`text-editor-log-date-${l.id}`}>
                  {l.dateKey}
                </div>
              </div>
              <Badge
                variant="secondary"
                className="border bg-primary/10 text-primary border-primary/20"
                data-testid={`badge-editor-log-count-${l.id}`}
              >
                +{l.count}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <WeeklyAnalytics
        title="Weekly editor productivity"
        metricLabel="Videos"
        data={weekData}
        downThreshold={0}
        testIdPrefix="editor-weekly"
      />
    </div>
  );
}

function ShooterPanel({
  weekDays,
  logs,
  setLogs,
}: {
  weekDays: Date[];
  logs: ShooterLog[];
  setLogs: (v: ShooterLog[]) => void;
}) {
  const [client, setClient] = useState("Aura Fitness");
  const [videoType, setVideoType] = useState("Product");
  const [shoots, setShoots] = useState(2);
  const [dayKey, setDayKey] = useState(dateKey(new Date()));

  const weekData = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of weekDays) map.set(dateKey(d), 0);
    for (const l of logs) {
      if (map.has(l.dateKey)) map.set(l.dateKey, (map.get(l.dateKey) ?? 0) + l.shoots);
    }
    return weekDays.map((d) => {
      const dk = dateKey(d);
      return { day: format(d, "EEE"), value: map.get(dk) ?? 0 };
    });
  }, [logs, weekDays]);

  return (
    <div className="grid gap-6">
      <Card className="glass noise rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold" data-testid="text-shooterlog-title">
              Log shoots
            </div>
            <div className="mt-1 text-sm text-muted-foreground" data-testid="text-shooterlog-subtitle">
              Add how many shoots you did, what type of video, and for whom.
            </div>
          </div>
          <Badge variant="secondary" className="border" data-testid="badge-shooterlog-weekcount">
            This week: {weekData.reduce((s, d) => s + d.value, 0)}
          </Badge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="grid gap-2">
            <Label data-testid="label-shooter-day">Day</Label>
            <Select value={dayKey} onValueChange={setDayKey}>
              <SelectTrigger data-testid="select-shooter-day">
                <SelectValue placeholder="Choose day" />
              </SelectTrigger>
              <SelectContent>
                {weekDays.map((d) => {
                  const dk = dateKey(d);
                  return (
                    <SelectItem key={dk} value={dk} data-testid={`option-shooter-day-${dk}`}>
                      {format(d, "EEE, MMM d")}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="shooter-client" data-testid="label-shooter-client">
              Client
            </Label>
            <Input
              id="shooter-client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Client name"
              data-testid="input-shooter-client"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="shooter-type" data-testid="label-shooter-type">
              Video type
            </Label>
            <Input
              id="shooter-type"
              value={videoType}
              onChange={(e) => setVideoType(e.target.value)}
              placeholder="Reel, Product, Event..."
              data-testid="input-shooter-type"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="shooter-count" data-testid="label-shooter-count">
              Shoots
            </Label>
            <Input
              id="shooter-count"
              type="number"
              value={shoots}
              onChange={(e) => setShoots(clampInt(Number(e.target.value)))}
              data-testid="input-shooter-count"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            className="h-11"
            onClick={() => {
              const id = String(Date.now());
              setLogs([
                ...logs,
                {
                  id,
                  dateKey: dayKey,
                  client: client.trim() || "Client",
                  videoType: videoType.trim() || "Video",
                  shoots: clampInt(shoots),
                },
              ]);
            }}
            data-testid="button-shooter-addlog"
          >
            Add log
          </Button>

          <div className="text-sm text-muted-foreground" data-testid="text-shooterlog-note">
            Weekly analytics update instantly.
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-2">
          {logs.slice(-5).reverse().map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card/50 px-4 py-3"
              data-testid={`row-shooter-log-${l.id}`}
            >
              <div className="min-w-0">
                <div className="font-medium" data-testid={`text-shooter-log-main-${l.id}`}>
                  {l.client} • {l.videoType}
                </div>
                <div className="text-xs text-muted-foreground" data-testid={`text-shooter-log-date-${l.id}`}>
                  {l.dateKey}
                </div>
              </div>
              <Badge
                variant="secondary"
                className="border bg-primary/10 text-primary border-primary/20"
                data-testid={`badge-shooter-log-count-${l.id}`}
              >
                +{l.shoots}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <WeeklyAnalytics
        title="Weekly shooter productivity"
        metricLabel="Shoots"
        data={weekData}
        downThreshold={0}
        testIdPrefix="shooter-weekly"
      />
    </div>
  );
}

function WriterPanel({
  items,
  setItems,
}: {
  items: WriterItem[];
  setItems: (v: WriterItem[]) => void;
}) {
  const [title, setTitle] = useState("3 tips for better lighting");
  const [client, setClient] = useState("Bloom Studio");

  return (
    <div className="grid gap-6">
      <Card className="glass noise rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold" data-testid="text-writer-title">
              Content pipeline
            </div>
            <div className="mt-1 text-sm text-muted-foreground" data-testid="text-writer-subtitle">
              Track written content, approvals, and dropped items.
            </div>
          </div>
          <Badge variant="secondary" className="border" data-testid="badge-writer-total">
            Total: {items.length}
          </Badge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="writer-title" data-testid="label-writer-title">
              Title
            </Label>
            <Input
              id="writer-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-writer-title"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="writer-client" data-testid="label-writer-client">
              Client
            </Label>
            <Input
              id="writer-client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              data-testid="input-writer-client"
            />
          </div>
          <div className="grid gap-2">
            <Label data-testid="label-writer-status">Status</Label>
            <Select
              value={"written"}
              onValueChange={() => {
                // controlled per action buttons
              }}
            >
              <SelectTrigger data-testid="select-writer-status" disabled>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="written">Written</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            className="h-11"
            onClick={() => {
              const id = String(Date.now());
              setItems([
                ...items,
                {
                  id,
                  title: title.trim() || "Untitled",
                  client: client.trim() || "Client",
                  status: "written",
                },
              ]);
            }}
            data-testid="button-writer-add"
          >
            Add written content
          </Button>
          <div className="text-sm text-muted-foreground" data-testid="text-writer-note">
            Move items across tabs as they progress.
          </div>
        </div>
      </Card>

      <Card className="glass noise rounded-2xl p-5">
        <Tabs defaultValue="written" className="w-full">
          <TabsList className="w-full justify-start" data-testid="tabs-writer">
            <TabsTrigger value="written" data-testid="tab-written">
              Written
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved
            </TabsTrigger>
            <TabsTrigger value="dropped" data-testid="tab-dropped">
              Dropped
            </TabsTrigger>
          </TabsList>

          {(["written", "approved", "dropped"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <div className="grid gap-2">
                {items
                  .filter((i) => i.status === tab)
                  .map((i) => (
                    <div
                      key={i.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card/50 px-4 py-3"
                      data-testid={`row-writer-item-${i.id}`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium" data-testid={`text-writer-item-title-${i.id}`}>
                          {i.title}
                        </div>
                        <div className="text-xs text-muted-foreground" data-testid={`text-writer-item-client-${i.id}`}>
                          {i.client}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {tab !== "approved" ? (
                          <Button
                            variant="secondary"
                            className="h-9"
                            onClick={() =>
                              setItems(
                                items.map((x) =>
                                  x.id === i.id ? { ...x, status: "approved" } : x,
                                ),
                              )
                            }
                            data-testid={`button-writer-approve-${i.id}`}
                          >
                            Approve
                          </Button>
                        ) : null}
                        {tab !== "dropped" ? (
                          <Button
                            variant="secondary"
                            className="h-9"
                            onClick={() =>
                              setItems(
                                items.map((x) =>
                                  x.id === i.id ? { ...x, status: "dropped" } : x,
                                ),
                              )
                            }
                            data-testid={`button-writer-drop-${i.id}`}
                          >
                            Drop
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}

                {items.filter((i) => i.status === tab).length === 0 ? (
                  <div
                    className="rounded-xl border bg-card/50 p-6 text-sm text-muted-foreground"
                    data-testid={`empty-writer-${tab}`}
                  >
                    No items in this tab yet.
                  </div>
                ) : null}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
}

function AdminPanel({
  weekDays,
  tasks,
  onToggleDone,
  attendanceByRole,
  editorWeek,
  shooterWeek,
  writerWeek,
}: {
  weekDays: Date[];
  tasks: Task[];
  onToggleDone: (id: string) => void;
  attendanceByRole: Record<Exclude<RoleId, "admin">, Attendance>;
  editorWeek: { day: string; value: number }[];
  shooterWeek: { day: string; value: number }[];
  writerWeek: { day: string; value: number }[];
}) {
  const activity = useMemo(() => {
    return weekDays.map((d) => {
      const day = format(d, "EEE");
      const v =
        (editorWeek.find((x) => x.day === day)?.value ?? 0) +
        (shooterWeek.find((x) => x.day === day)?.value ?? 0) +
        (writerWeek.find((x) => x.day === day)?.value ?? 0);
      return { day, value: v };
    });
  }, [editorWeek, shooterWeek, weekDays, writerWeek]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Team open tasks"
          value={String(tasks.filter((t) => t.status !== "done").length)}
          hint="Across all roles"
          icon={ClipboardList}
          testId="teamtasks"
        />
        <Stat
          label="Today activity"
          value={String(activity.find((x) => x.day === format(new Date(), "EEE"))?.value ?? 0)}
          hint="Total logs + content" 
          icon={TrendingUp}
          testId="todayactivity"
        />
        <Stat
          label="Down days this week"
          value={String(activity.filter((d) => d.value === 0).length)}
          hint="Where graphs are down"
          icon={Timer}
          testId="downdays"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass noise rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold" data-testid="text-admin-attendance-title">
                Attendance overview
              </div>
              <div className="mt-1 text-sm text-muted-foreground" data-testid="text-admin-attendance-subtitle">
                Who checked in / checked out today (prototype data).
              </div>
            </div>
            <Badge variant="secondary" className="border" data-testid="badge-admin-attendance-date">
              {format(new Date(), "yyyy-MM-dd")}
            </Badge>
          </div>

          <div className="mt-4 grid gap-2">
            {(
              [
                { role: "editor", label: "Editors" },
                { role: "shooter", label: "Shooters" },
                { role: "writer", label: "Writers" },
              ] as const
            ).map((r) => {
              const a = attendanceByRole[r.role];
              const state = a.checkedInAt
                ? a.checkedOutAt
                  ? "Checked out"
                  : "Checked in"
                : "Not started";

              return (
                <div
                  key={r.role}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card/50 px-4 py-3"
                  data-testid={`row-admin-attendance-${r.role}`}
                >
                  <div className="font-medium" data-testid={`text-admin-attendance-role-${r.role}`}>
                    {r.label}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground" data-testid={`text-admin-attendance-times-${r.role}`}>
                      {a.checkedInAt ? `In ${a.checkedInAt}` : "In —"} • {a.checkedOutAt ? `Out ${a.checkedOutAt}` : "Out —"}
                    </span>
                    <Badge
                      variant="secondary"
                      className={
                        "border " +
                        (state === "Checked in"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : state === "Checked out"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground")
                      }
                      data-testid={`status-admin-attendance-${r.role}`}
                    >
                      {state}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="glass noise rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold" data-testid="text-admin-activity-title">
                Weekly activity graph
              </div>
              <div className="mt-1 text-sm text-muted-foreground" data-testid="text-admin-activity-subtitle">
                Combined output from all roles.
              </div>
            </div>
            <Badge
              variant="secondary"
              className={
                "border " +
                (activity.filter((d) => d.value === 0).length
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300")
              }
              data-testid="badge-admin-activity-downdays"
            >
              Down days: {activity.filter((d) => d.value === 0).length}
            </Badge>
          </div>

          <div className="mt-5 h-56" data-testid="chart-admin-activity">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activity} margin={{ left: 2, right: 2, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeOpacity={0.18} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ stroke: "hsl(var(--muted-foreground) / 0.35)" }}
                  contentStyle={{
                    background: "hsl(var(--card) / 0.92)",
                    border: "1px solid hsl(var(--card-border) / 0.8)",
                    borderRadius: 14,
                    boxShadow: "var(--shadow)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--background))" }}
                  activeDot={{ r: 6 }}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {activity.map((d) => (
              <span
                key={d.day}
                className={
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs " +
                  pillColorForDownDay(d.value)
                }
                data-testid={`pill-admin-activity-${d.day}`}
              >
                <span className="font-medium">{d.day}</span>
                <span className="tabular-nums">{d.value}</span>
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TasksCard
          tasks={tasks}
          onToggleDone={onToggleDone}
          title="Team tasks"
          testIdPrefix="admin-tasks"
        />

        <Card className="glass noise rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold" data-testid="text-admin-roleperf-title">
                Role performance
              </div>
              <div className="mt-1 text-sm text-muted-foreground" data-testid="text-admin-roleperf-subtitle">
                Weekly totals by role.
              </div>
            </div>
          </div>

          <div className="mt-5 h-56" data-testid="chart-admin-roleperf">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { role: "Editors", value: editorWeek.reduce((s, x) => s + x.value, 0) },
                  { role: "Shooters", value: shooterWeek.reduce((s, x) => s + x.value, 0) },
                  { role: "Writers", value: writerWeek.reduce((s, x) => s + x.value, 0) },
                ]}
                margin={{ left: 2, right: 2, top: 10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeOpacity={0.18} />
                <XAxis dataKey="role" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.6)" }}
                  contentStyle={{
                    background: "hsl(var(--card) / 0.92)",
                    border: "1px solid hsl(var(--card-border) / 0.8)",
                    borderRadius: 14,
                    boxShadow: "var(--shadow)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar
                  dataKey="value"
                  radius={[10, 10, 10, 10]}
                  fill="hsl(var(--chart-1))"
                  isAnimationActive
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function Shell() {
  const user = safeParseUser();
  const [, navigate] = useLocation();

  const [darkMode, setDarkMode] = useState(false);
  const [anchorDay, setAnchorDay] = useState(() => new Date());

  const weekDays = useMemo(() => buildWeekDays(anchorDay), [anchorDay]);
  const today = new Date();
  const todayKey = dateKey(today);

  // Prototype state (in-memory, per session)
  const [attendanceByRole, setAttendanceByRole] = useState<
    Record<Exclude<RoleId, "admin">, Attendance>
  >(() => ({
    editor: { dateKey: todayKey, checkedInAt: "09:21" },
    shooter: { dateKey: todayKey },
    writer: { dateKey: todayKey, checkedInAt: "09:07", checkedOutAt: "18:02" },
  }));

  const [myAttendance, setMyAttendance] = useState<Attendance>(() => ({
    dateKey: todayKey,
  }));

  const [tasks, setTasks] = useState<Task[]>(() => [
    {
      id: "t1",
      title: "Cut 60s Reel for NovaCare",
      role: "editor",
      dueDateKey: todayKey,
      status: "in_progress",
    },
    {
      id: "t2",
      title: "Shoot product b-roll for Aura Fitness",
      role: "shooter",
      dueDateKey: todayKey,
      status: "todo",
    },
    {
      id: "t3",
      title: "Write caption set for Bloom Studio",
      role: "writer",
      dueDateKey: todayKey,
      status: "todo",
    },
    {
      id: "t4",
      title: "Weekly report export (Admin)",
      role: "editor",
      dueDateKey: dateKey(addDays(today, 2)),
      status: "todo",
    },
  ]);

  const [editorLogs, setEditorLogs] = useState<EditorLog[]>(() => [
    { id: "e1", dateKey: dateKey(weekDays[0]), client: "NovaCare", videoType: "Reel", count: 2 },
    { id: "e2", dateKey: dateKey(weekDays[1]), client: "NovaCare", videoType: "Reel", count: 3 },
    { id: "e3", dateKey: dateKey(weekDays[3]), client: "Skyline", videoType: "Podcast", count: 1 },
  ]);

  const [shooterLogs, setShooterLogs] = useState<ShooterLog[]>(() => [
    { id: "s1", dateKey: dateKey(weekDays[0]), client: "Aura Fitness", videoType: "Product", shoots: 1 },
    { id: "s2", dateKey: dateKey(weekDays[2]), client: "NovaCare", videoType: "Event", shoots: 2 },
  ]);

  const [writerItems, setWriterItems] = useState<WriterItem[]>(() => [
    { id: "w1", title: "Lighting tips carousel", client: "Bloom Studio", status: "written" },
    { id: "w2", title: "Script: Founder story", client: "NovaCare", status: "approved" },
    { id: "w3", title: "Caption pack v1", client: "Aura Fitness", status: "dropped" },
  ]);

  const writerWeek = useMemo(() => {
    // Simple heuristic: count written+approved per day from ids for demo
    return weekDays.map((d, idx) => ({
      day: format(d, "EEE"),
      value: idx === 2 ? 0 : idx % 2 === 0 ? 2 : 1,
    }));
  }, [weekDays]);

  const editorWeek = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of weekDays) map.set(format(d, "EEE"), 0);
    for (const l of editorLogs) {
      const day = format(new Date(l.dateKey), "EEE");
      if (map.has(day)) map.set(day, (map.get(day) ?? 0) + l.count);
    }
    return weekDays.map((d) => ({ day: format(d, "EEE"), value: map.get(format(d, "EEE")) ?? 0 }));
  }, [editorLogs, weekDays]);

  const shooterWeek = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of weekDays) map.set(format(d, "EEE"), 0);
    for (const l of shooterLogs) {
      const day = format(new Date(l.dateKey), "EEE");
      if (map.has(day)) map.set(day, (map.get(day) ?? 0) + l.shoots);
    }
    return weekDays.map((d) => ({ day: format(d, "EEE"), value: map.get(format(d, "EEE")) ?? 0 }));
  }, [shooterLogs, weekDays]);

  if (!user) return <Redirect to="/login" />;

  return (
    <div className={(darkMode ? "dark " : "") + "min-h-dvh app-shell-bg noise"}>
      <TopBar
        user={user}
        onLogout={() => {
          sessionStorage.removeItem("crewops_user");
          navigate("/login");
        }}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-serif text-3xl tracking-tight" data-testid="text-dashboard-title">
              {user.role === "admin" ? "Admin dashboard" : "My dashboard"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="text-dashboard-subtitle">
              {user.role === "admin"
                ? "Complete team progress, attendance, and weekly analytics." 
                : "Your tasks, attendance, and weekly analytics."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2">
              <span className="text-sm text-muted-foreground" data-testid="text-week-label">
                Week
              </span>
              <Select
                value={dateKey(anchorDay)}
                onValueChange={(v) => setAnchorDay(new Date(v))}
              >
                <SelectTrigger className="h-8 w-[180px]" data-testid="select-week">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 7, 14].map((delta) => {
                    const d = addDays(new Date(), -delta);
                    return (
                      <SelectItem
                        key={dateKey(d)}
                        value={dateKey(d)}
                        data-testid={`option-week-${dateKey(d)}`}
                      >
                        Week of {format(startOfWeek(d, { weekStartsOn: 1 }), "MMM d")}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2">
              <span className="text-sm text-muted-foreground" data-testid="text-theme-label">
                Dark
              </span>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
                data-testid="switch-theme"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          {user.role !== "admin" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <AttendanceCard
                todayKey={todayKey}
                attendance={myAttendance}
                setAttendance={setMyAttendance}
              />
              <TasksCard
                tasks={tasks.filter((t) => t.role === user.role)}
                onToggleDone={(id) =>
                  setTasks(
                    tasks.map((t) =>
                      t.id === id
                        ? { ...t, status: t.status === "done" ? "todo" : "done" }
                        : t,
                    ),
                  )
                }
                title="My tasks"
                testIdPrefix="mytasks"
              />
            </div>
          ) : null}

          <div className="grid gap-6">
            {user.role === "editor" ? (
              <EditorPanel weekDays={weekDays} logs={editorLogs} setLogs={setEditorLogs} />
            ) : user.role === "shooter" ? (
              <ShooterPanel weekDays={weekDays} logs={shooterLogs} setLogs={setShooterLogs} />
            ) : user.role === "writer" ? (
              <WriterPanel items={writerItems} setItems={setWriterItems} />
            ) : (
              <AdminPanel
                weekDays={weekDays}
                tasks={tasks}
                onToggleDone={(id) =>
                  setTasks(
                    tasks.map((t) =>
                      t.id === id
                        ? { ...t, status: t.status === "done" ? "todo" : "done" }
                        : t,
                    ),
                  )
                }
                attendanceByRole={attendanceByRole}
                editorWeek={editorWeek}
                shooterWeek={shooterWeek}
                writerWeek={writerWeek}
              />
            )}
          </div>

          <div className="rounded-2xl border bg-card/50 p-5 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div data-testid="text-prototype-note">
                Prototype note: This is a frontend mockup. Data resets when you refresh.
              </div>
              <Button
                variant="secondary"
                className="h-9"
                onClick={() => {
                  sessionStorage.removeItem("crewops_user");
                  navigate("/login");
                }}
                data-testid="button-switchuser"
              >
                Switch user
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
