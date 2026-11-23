"use client";

import { Input } from "@/components/ui/input";

export function MonthFilter({ month }: { month: string }) {
  return <form method="get">
    <input type="hidden" name="period" value="month" />
    <Input
      aria-label="Pilih bulan"
      type="month"
      name="month"
      defaultValue={month}
      className="h-9 w-40"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    />
  </form>;
}
