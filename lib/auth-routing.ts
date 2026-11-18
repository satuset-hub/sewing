export type AppRole = "admin" | "member";

function isSafeLocalPath(path: string | undefined) {
  return Boolean(path?.startsWith("/") && !path.startsWith("//") && !path.includes("\\"));
}

export function resolvePostLoginPath(role: AppRole, requestedPath?: string) {
  const home = role === "admin" ? "/admin" : "/member";
  if (!requestedPath || !isSafeLocalPath(requestedPath)) return home;
  if (role !== "admin" && (requestedPath === "/admin" || requestedPath.startsWith("/admin/"))) {
    return "/member?error=forbidden";
  }
  return requestedPath;
}
