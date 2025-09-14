export type View =
  | "library"
  | "results"
  | "people"
  | "collections"
  | "smart"
  | "saved"
  | "map"
  | "trips"
  | "videos"
  | "tasks";

export function viewToPath(view: string): string {
  switch (view) {
    case "results":
      return "/search";
    case "library":
      return "/library";
    case "people":
      return "/people";
    case "collections":
      return "/collections";
    case "smart":
      return "/smart";
    case "saved":
      return "/saved";
    case "map":
      return "/map";
    case "trips":
      return "/trips";
    case "videos":
      return "/videos";
    default:
      return "/library";
  }
}

export function pathToView(pathname: string): View {
  const seg = (pathname || "/library").split("/").filter(Boolean)[0] || "library";
  switch (seg) {
    case "search":
      return "results";
    case "library":
      return "library";
    case "people":
      return "people";
    case "collections":
      return "collections";
    case "smart":
      return "smart";
    case "saved":
      return "saved";
    case "map":
      return "map";
    case "trips":
      return "trips";
    case "videos":
      return "videos";
    default:
      return "library";
  }
}

// Non-view route helpers
export function isSharePath(pathname: string): boolean {
  const segs = (pathname || "").split("/").filter(Boolean);
  return segs[0] === "share" && typeof segs[1] === "string" && segs[1].length > 0;
}

export function shareTokenFromPath(pathname: string): string | null {
  const segs = (pathname || "").split("/").filter(Boolean);
  return segs[0] === "share" && segs[1] ? segs[1] : null;
}
