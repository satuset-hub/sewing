type ApiItem = { code: string; name: string };
type ApiResponse = { data?: ApiItem[] };

const BASE_URL = "https://wilayah.web.id/api";

async function getItems(path: string) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, { next: { revalidate: 86400 } });
    if (!response.ok) return [];
    const payload = await response.json() as ApiResponse;
    return Array.isArray(payload.data) ? payload.data : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const keyword = params.get("q")?.trim().slice(0, 50) || "";
  const level = params.get("level");
  const parent = params.get("parent") || "";
  if (keyword.length < 2 || !["province", "city", "village"].includes(level || "")) return Response.json({ data: [] });

  const encoded = encodeURIComponent(keyword);
  let data: ApiItem[] = [];
  if (level === "province") {
    data = await getItems(`/provinces?search=${encoded}&limit=20`);
  } else if (level === "city" && /^\d{2}$/.test(parent)) {
    data = await getItems(`/regencies/${parent}?search=${encoded}&limit=50`);
  } else if (level === "village" && /^\d{4}$/.test(parent)) {
    const matches = await getItems(`/villages?search=${encoded}&limit=100`);
    data = matches.filter((item) => item.code.startsWith(parent));
  }

  return Response.json({ data: data.slice(0, 20) }, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
