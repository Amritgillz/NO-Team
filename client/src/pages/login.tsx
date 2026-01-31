import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, Users, Video, Camera, PenLine, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES = [
  { id: "admin", label: "Admin", icon: Shield },
  { id: "editor", label: "Editor", icon: Video },
  { id: "shooter", label: "Shooter", icon: Camera },
  { id: "writer", label: "Content Writer", icon: PenLine },
] as const;

type RoleId = (typeof ROLES)[number]["id"];

export default function Login() {
  const [, navigate] = useLocation();
  const [role, setRole] = useState<RoleId>("admin");
  const [name, setName] = useState("Ayesha");

  const roleMeta = useMemo(() => ROLES.find((r) => r.id === role)!, [role]);
  const RoleIcon = roleMeta.icon;

  return (
    <div className="min-h-dvh app-shell-bg noise">
      <div className="mx-auto flex min-h-dvh max-w-6xl items-center px-4 py-10">
        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-2 lg:items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-between"
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1.5 text-sm shadow-sm backdrop-blur">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">CrewOps</span>
                <span className="text-muted-foreground">Team Ops + Analytics</span>
              </div>

              <h1
                className="mt-6 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl"
                data-testid="text-login-title"
              >
                Daily check-ins.
                <br />
                Clean accountability.
                <br />
                Weekly performance graphs.
              </h1>
              <p
                className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground"
                data-testid="text-login-subtitle"
              >
                Log attendance, tasks, and output by role (Editor / Shooter / Writer). Admin
                gets the full view: progress, attendance, and weekly reports.
              </p>

              <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="glass noise rounded-xl p-4">
                  <div className="text-sm font-semibold" data-testid="text-feature-attendance">
                    Attendance
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">Check-in/out daily</div>
                </div>
                <div className="glass noise rounded-xl p-4">
                  <div className="text-sm font-semibold" data-testid="text-feature-tasks">
                    Tasks
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">Assigned + tracked</div>
                </div>
                <div className="glass noise rounded-xl p-4">
                  <div className="text-sm font-semibold" data-testid="text-feature-analytics">
                    Analytics
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">Weekly graphs</div>
                </div>
              </div>
            </div>

            <div className="mt-10 hidden lg:block">
              <div className="hairline" />
              <p className="mt-4 text-xs text-muted-foreground" data-testid="text-login-footnote">
                Prototype mode: your selections are stored only in your browser session.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="flex"
          >
            <Card className="glass noise w-full rounded-2xl p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-muted-foreground" data-testid="text-login-welcome">
                    Welcome back
                  </div>
                  <div className="mt-1 text-xl font-semibold" data-testid="text-login-signin">
                    Sign in
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border bg-card/70 px-3 py-2">
                  <RoleIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium" data-testid="text-login-role-badge">
                    {roleMeta.label}
                  </span>
                </div>
              </div>

              <div className="mt-7 grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="name" data-testid="label-name">
                    Display name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Ayesha"
                    data-testid="input-name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label data-testid="label-role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as RoleId)}>
                    <SelectTrigger data-testid="select-role">
                      <SelectValue placeholder="Choose role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.id} value={r.id} data-testid={`option-role-${r.id}`}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="group h-11"
                  onClick={() => {
                    sessionStorage.setItem(
                      "crewops_user",
                      JSON.stringify({ name: name.trim() || "User", role }),
                    );
                    navigate("/");
                  }}
                  data-testid="button-login"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>

                <div className="rounded-xl border bg-card/50 p-4 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground" data-testid="text-login-demo">
                    Demo tip
                  </div>
                  <p className="mt-1" data-testid="text-login-demo-copy">
                    Use <span className="font-medium text-foreground">Admin</span> to see the
                    full dashboard, or switch to a role to see the individual view.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
