"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegionOption = { code: string; name: string };
type RegionLevel = "province" | "city" | "village";

function RegionField({ label, name, level, value, code, parentCode = "", disabled = false, placeholder, onTyping, onSelect }: {
  label: string;
  name: string;
  level: RegionLevel;
  value: string;
  code: string;
  parentCode?: string;
  disabled?: boolean;
  placeholder: string;
  onTyping: (value: string) => void;
  onSelect: (option: RegionOption) => void;
}) {
  const [results, setResults] = useState<RegionOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const keyword = value.trim();
    if (!open || disabled || keyword.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({ level, q: keyword });
        if (parentCode) query.set("parent", parentCode);
        const response = await fetch(`/api/regions/search?${query}`, { signal: controller.signal });
        const payload = response.ok ? await response.json() as { data?: RegionOption[] } : { data: [] };
        setResults(Array.isArray(payload.data) ? payload.data : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, level, open, parentCode, value]);

  return <div className="relative">
    <Label htmlFor={name}>{label}</Label>
    <input type="hidden" name={`${name}Code`} value={code} />
    <div className="relative">
      <Input id={name} name={name} value={value} disabled={disabled} onChange={(event) => { onTyping(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} autoComplete="off" placeholder={placeholder} required />
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">{loading ? <LoaderCircle className="size-4 animate-spin text-primary" /> : code ? <Check className="size-4 text-success" /> : <MapPin className="size-4 text-muted" />}</div>
    </div>
    {open && !disabled && value.trim().length >= 2 && <div role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-white p-1 shadow-xl">{results.map((option) => <button key={option.code} type="button" role="option" aria-selected={option.code === code} onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(option); setOpen(false); setResults([]); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-cream"><span className="font-semibold">{option.name}</span><span className="ml-2 text-xs text-muted">{option.code}</span></button>)}<p className="px-3 py-2 text-xs text-muted">{loading ? "Mencari wilayah…" : results.length ? "Pilih salah satu hasil." : "Tidak ditemukan. Coba kata kunci lain."}</p></div>}
    <p className="mt-1 text-xs text-muted">{disabled ? "Pilih wilayah sebelumnya terlebih dahulu." : code ? "Wilayah sudah dipilih dari daftar." : "Ketik minimal 2 huruf, lalu pilih dari daftar."}</p>
  </div>;
}

export function RegionAutocomplete({ village = "", city = "", province = "", villageCode = "", cityCode = "", provinceCode = "" }: {
  village?: string;
  city?: string;
  province?: string;
  villageCode?: string;
  cityCode?: string;
  provinceCode?: string;
}) {
  const [provinceState, setProvinceState] = useState({ name: province, code: provinceCode });
  const [cityState, setCityState] = useState({ name: city, code: cityCode });
  const [villageState, setVillageState] = useState({ name: village, code: villageCode });

  return <div className="grid gap-4 sm:grid-cols-2">
    <div className="sm:col-span-2"><RegionField label="Provinsi" name="province" level="province" value={provinceState.name} code={provinceState.code} placeholder="Ketik nama provinsi" onTyping={(name) => { setProvinceState({ name, code: "" }); setCityState({ name: "", code: "" }); setVillageState({ name: "", code: "" }); }} onSelect={(option) => { setProvinceState({ name: option.name, code: option.code }); setCityState({ name: "", code: "" }); setVillageState({ name: "", code: "" }); }} /></div>
    <div><RegionField label="Kota / Kabupaten" name="city" level="city" value={cityState.name} code={cityState.code} parentCode={provinceState.code} disabled={!provinceState.code} placeholder="Ketik nama kota/kabupaten" onTyping={(name) => { setCityState({ name, code: "" }); setVillageState({ name: "", code: "" }); }} onSelect={(option) => { setCityState({ name: option.name, code: option.code }); setVillageState({ name: "", code: "" }); }} /></div>
    <div><RegionField label="Kelurahan / Desa" name="village" level="village" value={villageState.name} code={villageState.code} parentCode={cityState.code} disabled={!cityState.code} placeholder="Ketik nama kelurahan/desa" onTyping={(name) => setVillageState({ name, code: "" })} onSelect={(option) => setVillageState({ name: option.name, code: option.code })} /></div>
  </div>;
}
