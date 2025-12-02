import { computed, nextTick, onMounted, reactive, ref } from "vue";
import JSZip from "jszip";

const HEADER_SIZE = 0x100;
const INDEX_START = 0x100;
const IMAGES_START = 0x4100;
const IMAGE_W = 74;
const IMAGE_H = 86;
const IMAGE_PIXELS = IMAGE_W * IMAGE_H * 4;
const IMAGE_BLOCK = 25600;

export function useLabelsDb() {
  const state = reactive({
    db: null,
    message: "",
    status: "No DB loaded",
    loadingDb: false,
    inserting: false,
    lastInsertedCrc: null,
    packingZip: false,
  });

  const dbFileInput = ref(null);
  const imageInput = ref(null);
  const crcValue = ref("");
  const selectedDbFile = ref(null);
  const selectedImageFile = ref(null);
  const searchQuery = ref("");
  const romNames = ref(new Map());
  const removingSet = ref(new Set());
  const highlightSig = ref(null);
  const imageResetKey = ref(0);

  const message = computed(() => state.message);
  const dbStatus = computed(() => state.status);
  const hasDb = computed(() => state.db !== null);
  const countLabel = computed(() =>
    state.db ? `${state.db.signatures.length} entries` : "0 entries"
  );
  const searchTerms = computed(() =>
    searchQuery.value
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length)
  );
  const canInsert = computed(() => {
    const crc = crcValue.value.trim().toUpperCase();
    const file =
      selectedImageFile.value || imageInput.value?.inputEl?.files?.[0] || null;
    return !!file && /^[0-9A-F]{8}$/.test(crc);
  });
  const canLoadDb = computed(() => !!selectedDbFile.value);
  const year = new Date().getFullYear();

  const cardEntries = computed(() => {
    const romMap = romNames.value;
    if (!state.db) return [];

    const entries = state.db.signatures.map((sig, idx) => {
      const key = sig.toString(16).toUpperCase().padStart(8, "0");
      const nameEntry = romMap.get(key) ?? "";
      const [title, regionTag] = splitTitleAndRegion(nameEntry);
      return {
        sig,
        display: key,
        url: bgraToDataURL(state.db.images[idx]),
        filename: title,
        region: regionTag,
      };
    });

    entries.sort((a, b) => a.display.localeCompare(b.display));
    return entries;
  });

  const filteredEntries = computed(() => {
    const terms = searchTerms.value;
    if (!terms.length) return cardEntries.value;

    return cardEntries.value.filter((entry) => {
      const name = (entry.filename || "").toLowerCase();
      const id = entry.display.toUpperCase();
      return terms.some((termRaw) => {
        const termLower = termRaw.toLowerCase();
        const isHex = /^[0-9a-f]{1,8}$/i.test(termRaw);
        if (isHex) {
          return id.includes(termRaw.toUpperCase());
        }
        return name.includes(termLower) || id.includes(termRaw.toUpperCase());
      });
    });
  });

  function setMessage(text) {
    state.message = text || "";
    state.lastInsertedCrc = null;
  }

  function onDbSelected(file) {
    selectedDbFile.value = file;
  }

  function onImageSelected(file) {
    selectedImageFile.value = file;
  }

  async function onLoadDb() {
    if (!selectedDbFile.value) {
      setMessage("Please choose a labels.db file.");
      return;
    }
    state.loadingDb = true;
    try {
      const buf = await selectedDbFile.value.arrayBuffer();
      state.db = parseLabelsDb(buf);
      state.status = `${state.db.signatures.length} images loaded`;
      setMessage("DB loaded successfully.");
    } catch (err) {
      console.error(err);
      state.db = null;
      state.status = "No DB loaded";
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(`Error loading DB: ${msg}`);
    } finally {
      state.loadingDb = false;
    }
  }

  async function onAdd() {
    if (!state.db) {
      setMessage("No DB loaded - please load labels.db first.");
      return;
    }

    const imgFile =
      selectedImageFile.value || imageInput.value?.inputEl?.files?.[0] || null;
    const crc = crcValue.value.trim().toUpperCase().replace(/^0X/, "");

    if (!imgFile || crc.length !== 8 || !/^[0-9A-F]{8}$/.test(crc)) {
      setMessage("Please select a PNG and enter a valid 8-digit hex CRC32.");
      return;
    }

    try {
      state.inserting = true;
      const bgra = await pngFileToBGRA(imgFile);
      const sig = parseInt(crc, 16) >>> 0;

      const idx = state.db.signatures.findIndex((s) => s === sig);
      if (idx === -1) {
        state.db.signatures.push(sig);
        state.db.images.push(bgra);
      } else {
        state.db.images[idx] = bgra;
      }

      state.lastInsertedCrc = crc;
      state.message = `Inserted / updated CRC ${crc}`;
      crcValue.value = "";
      if (imageInput.value?.clear) {
        imageInput.value.clear();
      }
      selectedImageFile.value = null;
      imageResetKey.value += 1;
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(`Error processing PNG: ${msg}`);
    } finally {
      state.inserting = false;
    }
  }

  function removeEntry(sig) {
    if (!state.db) return;
    const idx = state.db.signatures.findIndex((s) => s === sig);
    if (idx === -1) return;

    const next = new Set(removingSet.value);
    next.add(sig);
    removingSet.value = next;

    setTimeout(() => {
      state.db.signatures.splice(idx, 1);
      state.db.images.splice(idx, 1);
      state.status = `${state.db.signatures.length} images`;

      const updated = new Set(removingSet.value);
      updated.delete(sig);
      removingSet.value = updated;
    }, 0);
  }

  function downloadDb() {
    if (!state.db) {
      setMessage("No DB loaded - nothing to download.");
      return;
    }

    const bytes = buildLabelsDb(state.db);
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "labels_modified.db";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadImages() {
    if (!state.db) {
      setMessage("No DB loaded - please load labels.db first.");
      return;
    }

    state.packingZip = true;
    await nextTick(); // render spinner before heavy work starts

    if (!JSZip) {
      setMessage("JSZip not found - make sure it is installed.");
      state.packingZip = false;
      return;
    }

    const zip = new JSZip();

    state.db.signatures.forEach((sig, idx) => {
      const filename = sig.toString(16).toUpperCase().padStart(8, "0") + ".png";
      const dataUrl = bgraToDataURL(state.db.images[idx]);
      const base64 = dataUrl.split(",")[1];
      zip.file(filename, base64, { base64: true });
    });

    try {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "labels-images.zip";
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Images ZIP downloaded.");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(`Error creating ZIP: ${msg}`);
    } finally {
      state.packingZip = false;
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard
      ?.writeText(text)
      .then(() => setMessage(`Copied ${text} to clipboard.`))
      .catch(() => setMessage("Could not copy to clipboard."));
  }

  async function injectPresetEntries(presets = []) {
    if (!state.db) {
      setMessage("No DB loaded - please load labels.db first.");
      return;
    }

    const toAdd = presets
      .filter((p) => p?.crc && p?.asset)
      .map((p) => ({
        crc: p.crc.toUpperCase(),
        asset: p.asset,
        name: p.name ?? p.crc.toUpperCase(),
      }));

    const existing = new Set(
      state.db.signatures.map((s) => s.toString(16).toUpperCase().padStart(8, "0"))
    );
    const pending = toAdd.filter((p) => !existing.has(p.crc));

    if (!pending.length) {
      setMessage("Selected entries are already present.");
      return;
    }

    try {
      for (const entry of pending) {
        const sig = parseInt(entry.crc, 16) >>> 0;
        const resp = await fetch(entry.asset);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const file = new File([blob], `${entry.crc}.png`, { type: blob.type || "image/png" });
        const bgra = await pngFileToBGRA(file);
        state.db.signatures.push(sig);
        state.db.images.push(bgra);
      }
      state.status = `${state.db.signatures.length} images loaded`;
      state.message = `Injected ${pending.length} quick-fix entr${pending.length === 1 ? "y" : "ies"}.`;
      state.lastInsertedCrc = pending[pending.length - 1].crc;
    } catch (err) {
      console.error("Failed to inject preset entries", err);
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(`Could not inject presets: ${msg}`);
    }
  }

  function scrollToCrc(crc) {
    const target = document.getElementById(crc.toUpperCase());
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      highlightSig.value = crc.toUpperCase();
      setTimeout(() => {
        if (highlightSig.value === crc.toUpperCase()) {
          highlightSig.value = null;
        }
      }, 1400);
    }
  }

  function isRemoving(sig) {
    return removingSet.value.has(sig);
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightText(text) {
    const terms = searchTerms.value;
    if (!terms.length) return escapeHtml(text);

    const escapedTerms = terms.map((t) => escapeRegExp(t));
    const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi");
    const safe = escapeHtml(text);
    return safe.replace(regex, '<span class="hl">$1</span>');
  }

  async function loadRomNames() {
    let csv = "";
    try {
      const resp = await fetch("/assets/rom_signatures.csv");
      csv = await resp.text();
    } catch (err) {
      console.error("Failed to fetch rom signatures, trying import fallback", err);
      try {
        const mod = await import("../data/rom_signatures.csv?raw");
        csv = mod.default || "";
      } catch (e) {
        console.error("Fallback import for rom signatures failed", e);
        return;
      }
    }

    if (!csv) return;

    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const map = new Map();
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      const parsed = line.match(/"([^"]+)"\s*,\s*"([0-9A-Fa-f]{8})"/);
      if (!parsed) continue;
      const rawName = parsed[1];
      const sig = parsed[2].toUpperCase();
      if (map.has(sig)) continue; // drop duplicate signatures
      map.set(sig, cleanRomName(rawName));
    }
    romNames.value = map;
  }

  function cleanRomName(raw) {
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
      // ignore rev/version tags
    });

    // fallback detection from full string
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

  function splitTitleAndRegion(name) {
    const match = name.match(/^(.*?)(\s*\((NTSC-J|NTSC|PAL)\))$/i);
    if (match) {
      const title = match[1].trim();
      const regionTag = match[3].toUpperCase();
      return [title, regionTag];
    }
    return [name, null];
  }

  onMounted(() => {
    loadRomNames();
  });

  return {
    state,
    dbFileInput,
    imageInput,
    crcValue,
    selectedDbFile,
    selectedImageFile,
    searchQuery,
    romNames,
    removingSet,
    highlightSig,
    imageResetKey,
    message,
    dbStatus,
    hasDb,
    countLabel,
    searchTerms,
    canInsert,
    canLoadDb,
    year,
    cardEntries,
    filteredEntries,
    setMessage,
    onDbSelected,
    onImageSelected,
    onLoadDb,
    onAdd,
    removeEntry,
    downloadDb,
    downloadImages,
    copyToClipboard,
    injectPresetEntries,
    scrollToCrc,
    isRemoving,
    highlightText,
  };
}

function parseLabelsDb(buf) {
  const bytes = new Uint8Array(buf);
  if (bytes.length < IMAGES_START) {
    throw new Error("File too small to be labels.db");
  }

  const header = bytes.slice(0, HEADER_SIZE);
  const indexRegionSz = IMAGES_START - INDEX_START;
  const indexRegion = bytes.slice(INDEX_START, IMAGES_START);
  const dv = new DataView(
    indexRegion.buffer,
    indexRegion.byteOffset,
    indexRegion.byteLength
  );
  const signatures = [];
  const numEntries = indexRegionSz / 4;

  for (let i = 0; i < numEntries; i += 1) {
    const val = dv.getUint32(i * 4, true);
    if (val === 0xffffffff) break;
    signatures.push(val);
  }

  const images = [];
  let pos = IMAGES_START;
  for (let i = 0; i < signatures.length; i += 1) {
    if (pos + IMAGE_BLOCK > bytes.length) {
      throw new Error("Truncated image data");
    }
    images.push(bytes.slice(pos, pos + IMAGE_PIXELS));
    pos += IMAGE_BLOCK;
  }

  return { header, signatures, images, indexRegionSz };
}

function buildLabelsDb(currentDb) {
  const { indexRegionSz } = currentDb;
  const numEntries = indexRegionSz / 4;
  const numImages = currentDb.signatures.length;

  const indices = currentDb.signatures.map((_, i) => i);
  indices.sort((a, b) => currentDb.signatures[a] - currentDb.signatures[b]);

  const sortedSigs = indices.map((i) => currentDb.signatures[i]);
  const sortedImgs = indices.map((i) => currentDb.images[i]);

  const totalSize = IMAGES_START + IMAGE_BLOCK * numImages;
  const out = new Uint8Array(totalSize);
  out.set(currentDb.header, 0);

  const dv = new DataView(out.buffer);
  const indexStart = INDEX_START;

  for (let i = 0; i < numEntries; i += 1) {
    const off = indexStart + i * 4;
    if (i < sortedSigs.length) {
      dv.setUint32(off, sortedSigs[i], true);
    } else {
      dv.setUint32(off, 0xffffffff, true);
    }
  }

  let pos = IMAGES_START;
  for (let i = 0; i < sortedImgs.length; i += 1) {
    out.set(sortedImgs[i], pos);
    pos += IMAGE_BLOCK;
  }

  return out;
}

function pngFileToBGRA(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = IMAGE_W;
        canvas.height = IMAGE_H;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, IMAGE_W, IMAGE_H);
        ctx.drawImage(img, 0, 0, IMAGE_W, IMAGE_H);
        const imgData = ctx.getImageData(0, 0, IMAGE_W, IMAGE_H);
        const src = imgData.data;
        const out = new Uint8Array(IMAGE_PIXELS);
        for (let i = 0; i < src.length; i += 4) {
          const r = src[i];
          const g = src[i + 1];
          const b = src[i + 2];
          const a = src[i + 3];
          out[i + 0] = b;
          out[i + 1] = g;
          out[i + 2] = r;
          out[i + 3] = a;
        }
        resolve(out);
      };
      img.onerror = () => reject(new Error("Failed to decode PNG"));
      img.src = fr.result;
    };
    fr.onerror = () => reject(new Error("Failed to read file"));
    fr.readAsDataURL(file);
  });
}

function bgraToDataURL(bgra) {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_W;
  canvas.height = IMAGE_H;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(IMAGE_W, IMAGE_H);
  const dst = imgData.data;

  for (let i = 0; i < bgra.length; i += 4) {
    const b = bgra[i];
    const g = bgra[i + 1];
    const r = bgra[i + 2];
    const a = bgra[i + 3];
    dst[i + 0] = r;
    dst[i + 1] = g;
    dst[i + 2] = b;
    dst[i + 3] = a;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}
