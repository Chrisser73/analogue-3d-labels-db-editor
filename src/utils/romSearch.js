export function parseSearchTerms(query = "") {
  return (query || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length);
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightWithTerms(text, terms = []) {
  if (!terms.length) return escapeHtml(text);

  const escapedTerms = terms.map((t) => escapeRegExp(t));
  const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi");
  const safe = escapeHtml(text);
  return safe.replace(regex, '<span class="hl">$1</span>');
}

export function cleanRomName(raw) {
  const noExt = raw.replace(/\.[a-z0-9]{2,4}$/i, "");
  const lowerFull = noExt.toLowerCase();

  const segments = [...noExt.matchAll(/\(([^)]+)\)/g)].map((m) =>
    (m[1] || "").trim().toLowerCase()
  );

  let region = null;
  const extras = [];

  const markRegion = (code) => {
    if (region) return;
    region = code;
  };

  segments.forEach((lower) => {
    if (!lower) return;
    if (lower.includes("proto")) extras.push("Proto");
    else if (lower.includes("aftermarket")) extras.push("Aftermarket");
    else if (lower.includes("unl") || lower.includes("unlicensed")) extras.push("UNL");
    else if (lower.includes("demo")) extras.push("Demo");
    else if (lower.includes("ntsc-j") || lower.includes("japan")) markRegion("NTSC-J");
    else if (
      lower === "ntsc" ||
      lower.includes("usa") ||
      lower.includes("u.s.a") ||
      lower.includes("north america")
    )
      markRegion("NTSC");
    else if (
      lower === "pal" ||
      lower.includes("europe") ||
      lower.includes("australia") ||
      lower.includes("germany") ||
      lower.includes("france") ||
      lower.includes("spain") ||
      lower.includes("italy") ||
      lower.includes("uk") ||
      lower.includes("england")
    )
      markRegion("PAL");
  });

  if (!region && (lowerFull.includes("ntsc-j") || lowerFull.includes("japan"))) {
    markRegion("NTSC-J");
  }
  if (
    !region &&
    (lowerFull.includes("ntsc") ||
      lowerFull.includes("usa") ||
      lowerFull.includes("u.s.a") ||
      lowerFull.includes("north america"))
  ) {
    markRegion("NTSC");
  }
  if (
    !region &&
    (lowerFull.includes("pal") ||
      lowerFull.includes("europe") ||
      lowerFull.includes("australia") ||
      lowerFull.includes("germany") ||
      lowerFull.includes("france") ||
      lowerFull.includes("spain") ||
      lowerFull.includes("italy") ||
      lowerFull.includes("uk") ||
      lowerFull.includes("england"))
  ) {
    markRegion("PAL");
  }

  const base = noExt.replace(/\s*\([^)]*\)/g, "").trim().replace(/\s+/g, " ");
  const tail = [region, ...extras].filter(Boolean);
  if (!tail.length) return base;
  return `${base} (${tail.join(" / ")})`;
}

function isRegionSegment(segmentLower = "") {
  const seg = segmentLower.trim();
  if (!seg) return false;
  return (
    seg === "pal" ||
    seg === "ntsc" ||
    seg === "ntsc-j" ||
    seg === "ntsc j" ||
    seg === "ntsc-u" ||
    seg === "ntsc u"
  );
}

function isLanguageSegment(segmentRaw = "") {
  const parts = segmentRaw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return false;
  return parts.every((p) => /^[a-z]{2}$/i.test(p));
}

export function cleanRomNameForSearch(raw) {
  const noExt = raw.replace(/\.[a-z0-9]{2,4}$/i, "");
  const base = noExt.replace(/\s*\([^)]*\)/g, "").trim().replace(/\s+/g, " ");
  const segments = [...noExt.matchAll(/\(([^)]+)\)/g)]
    .map((m) => (m[1] || "").trim())
    .filter(Boolean);
  const keptSegments = segments.filter((seg) => {
    const lower = seg.toLowerCase();
    if (isRegionSegment(lower)) return false;
    if (isLanguageSegment(seg)) return false;
    return true;
  });
  const tail = keptSegments.map((seg) => seg.trim()).filter(Boolean);
  if (!tail.length) return base;
  return `${base} ${tail.map((seg) => `(${seg})`).join(" ")}`.trim();
}

export function detectRegion(name = "") {
  const lowerFull = name.toLowerCase();
  const segments = [...name.matchAll(/\(([^)]+)\)/g)].map((m) =>
    (m[1] || "").trim().toLowerCase()
  );

  let region = null;
  const markRegion = (code) => {
    if (!region) region = code;
  };

  segments.forEach((lower) => {
    if (!lower) return;
    if (lower.includes("ntsc-j") || lower.includes("japan")) markRegion("NTSC-J");
    else if (
      lower === "ntsc" ||
      lower.includes("usa") ||
      lower.includes("u.s.a") ||
      lower.includes("north america")
    )
      markRegion("NTSC");
    else if (
      lower === "pal" ||
      lower.includes("europe") ||
      lower.includes("australia") ||
      lower.includes("germany") ||
      lower.includes("france") ||
      lower.includes("spain") ||
      lower.includes("italy") ||
      lower.includes("uk") ||
      lower.includes("england")
    )
      markRegion("PAL");
  });

  if (!region && (lowerFull.includes("ntsc-j") || lowerFull.includes("japan"))) {
    markRegion("NTSC-J");
  }
  if (
    !region &&
    (lowerFull.includes("ntsc") ||
      lowerFull.includes("usa") ||
      lowerFull.includes("u.s.a") ||
      lowerFull.includes("north america"))
  ) {
    markRegion("NTSC");
  }
  if (
    !region &&
    (lowerFull.includes("pal") ||
      lowerFull.includes("europe") ||
      lowerFull.includes("australia") ||
      lowerFull.includes("germany") ||
      lowerFull.includes("france") ||
      lowerFull.includes("spain") ||
      lowerFull.includes("italy") ||
      lowerFull.includes("uk") ||
      lowerFull.includes("england"))
  ) {
    markRegion("PAL");
  }

  return region;
}

export function splitTitleAndRegion(name) {
  const match = name.match(/^(.*?)(\s*\((NTSC-J|NTSC|PAL)\))$/i);
  if (match) {
    const title = match[1].trim();
    const regionTag = match[3].toUpperCase();
    return [title, regionTag];
  }
  return [name, null];
}

export function parseRomCsv(csv = "") {
  if (!csv) return new Map();
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const map = new Map();
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const parsed = line.match(/"([^"]+)"\s*,\s*"([0-9A-Fa-f]{8})"/);
    if (!parsed) continue;
    const rawName = parsed[1];
    const sig = parsed[2].toUpperCase();
    if (map.has(sig)) continue;
    map.set(sig, cleanRomName(rawName));
  }
  return map;
}

export async function fetchRomMap() {
  let csv = "";
  try {
    const resp = await fetch("/assets/rom_signatures.csv");
    if (resp.ok) {
      csv = await resp.text();
    }
  } catch (err) {
    console.error("Failed to fetch rom signatures, trying import fallback", err);
  }

  return parseRomCsv(csv);
}

export function parseRomCsvRaw(csv = "") {
  if (!csv) return new Map();
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const map = new Map();
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const parsed = line.match(/"([^"]+)"\s*,\s*"([0-9A-Fa-f]{8})"/);
    if (!parsed) continue;
    const rawName = parsed[1];
    const sig = parsed[2].toUpperCase();
    if (map.has(sig)) continue;
    map.set(sig, rawName);
  }
  return map;
}

export async function fetchRomMapRaw() {
  let csv = "";
  try {
    const resp = await fetch("/assets/rom_signatures.csv");
    if (resp.ok) {
      csv = await resp.text();
    }
  } catch (err) {
    console.error("Failed to fetch rom signatures, trying import fallback", err);
  }

  return parseRomCsvRaw(csv);
}

export function mapToEntries(mapLike = new Map()) {
  const map =
    mapLike?.value instanceof Map
      ? mapLike.value
      : mapLike instanceof Map
        ? mapLike
        : new Map();
  return Array.from(map.entries()).map(([crc, name]) => {
    const [title, region] = splitTitleAndRegion(name);
    return {
      crc: crc.toUpperCase(),
      name,
      title,
      region,
    };
  });
}

export function mapToEntriesRaw(mapLike = new Map()) {
  const map =
    mapLike?.value instanceof Map
      ? mapLike.value
      : mapLike instanceof Map
        ? mapLike
        : new Map();
  return Array.from(map.entries()).map(([crc, rawName]) => {
    const region = detectRegion(rawName);
    const displayName = cleanRomNameForSearch(rawName);
    return {
      crc: crc.toUpperCase(),
      name: displayName,
      title: displayName,
      region,
    };
  });
}

export function filterRomEntries(entries = [], terms = []) {
  if (!terms.length) return [];

  return (entries || []).filter((entry) => {
    const nameLower = (entry.name || "").toLowerCase();
    const titleLower = (entry.title || "").toLowerCase();
    const id = (entry.crc || "").toUpperCase();
    return terms.some((termRaw) => {
      const termLower = termRaw.toLowerCase();
      const isHex = /^[0-9a-f]{1,8}$/i.test(termRaw);
      if (isHex) {
        return id.includes(termRaw.toUpperCase());
      }
      return (
        nameLower.includes(termLower) ||
        titleLower.includes(termLower) ||
        id.includes(termRaw.toUpperCase())
      );
    });
  });
}
