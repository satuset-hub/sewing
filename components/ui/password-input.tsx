"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return <div className="relative">
    <Input {...props} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
    <button type="button" onClick={() => setVisible((current) => !current)} className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-cream hover:text-primary" aria-label={visible ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={visible}>
      {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  </div>;
}
