<template>
  <div class="app">
    <header class="hero hero-plain">
      <div class="hero-left">
        <img class="logo" src="/assets/icon-alt.png" alt="Analogue 3D logo" />
        <div>
          <h1>Labels.db File Extractor &amp; Editor</h1>
          <p class="hero-sub">
            Edit and extract Analogue 3D <code>labels.db</code> files right in
            your browser.
          </p>
        </div>
      </div>
    </header>

    <section class="panel top-panel">
      <div class="panel-header">
        <div>
          <h2>Load Database File</h2>
          <p class="small-note">
            Load your existing <code>labels.db</code> so you can view and edit
            its entries locally in your browser or use the one from
            <a
              href="/assets/labels.db"
              target="_blank"
              title="labels.db file download"
              >here</a
            >.
          </p>
        </div>
      </div>

      <form class="load-grid" @submit.prevent="onLoadDb">
        <Dropzone
          ref="dbFileInput"
          accept=".db"
          required
          placeholder="labels.db"
          :inputId="'labelsUpload'"
          :inputName="'labelsUpload'"
          @select="onDbSelected"
        />
        <div class="button-row">
          <UiButton
            type="submit"
            variant="primary"
            size="md"
            :disabled="state.loadingDb || !canLoadDb"
          >
            <template v-if="state.loadingDb">
              <Spinner /> Loading DB...
            </template>
            <template v-else>Load DB</template>
          </UiButton>
          <UiButton
            v-if="hasDb && !state.loadingDb"
            type="button"
            variant="primary"
            size="md"
            @click="downloadDb"
          >
            Download modified DB
          </UiButton>
          <UiButton
            v-if="hasDb && !state.loadingDb"
            type="button"
            variant="ghost"
            size="md"
            @click="downloadImages"
          >
            Download Images (ZIP)
          </UiButton>
        </div>
      </form>

      <Alert v-if="message" variant="success">{{ message }}</Alert>
    </section>

    <section class="layout" id="editor">
      <div class="panel">
        <div class="panel-header">
          <h2>Modify Database</h2>
        </div>

        <div v-if="!hasDb" class="no-db-loaded">
          <p class="small-note">
            No database loaded. Please load a labels.db file to view entries.
          </p>
        </div>

        <div v-else>
          <p class="small-note">
            Add a new image or replace an existing one using its CRC32 cartridge
            signature.
          </p>

          <form class="stacked" @submit.prevent="onAdd">
            <Dropzone
              label="PNG Image"
              hint="any size; will be resized to 74x86"
              ref="imageInput"
              accept="image/png"
              :inputId="'imageUpload'"
              :inputName="'imageUpload'"
              required
              placeholder="Select or drop a PNG"
              @select="onImageSelected"
            />
            <InputUi
              label="Cartridge Signature"
              hint="CRC32, 8-digit Hex"
              v-model="crcValue"
              :inputId="'crcInput'"
              :inputName="'crcInput'"
              type="text"
              placeholder="03CC04EE"
              required
            />
            <UiButton
              type="submit"
              variant="primary"
              size="sm"
              :disabled="!canInsert"
            >
              Insert / Replace
            </UiButton>
          </form>

          <div class="stacked search-block">
            <InputUi
              label="Search list"
              :inputId="'filterInput'"
              :inputName="'filterInput'"
              v-model="searchQuery"
              placeholder="E.g. 04079B93,52BA66FA"
            />
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="images-header">
          <h2>Extracted Images</h2>
          <!--<small>{{ countLabel }}</small>-->
          <small
            ><Badge>{{ dbStatus }}</Badge></small
          >
        </div>
        <div v-if="state.loadingDb" class="panel-loading">
          <Spinner :class="'ui-spinner-lg'" />
          <span>Loading database...</span>
        </div>
        <div v-else-if="!hasDb" class="no-db-loaded">
          <p class="small-note">
            No database loaded. Please load a labels.db file to view entries.
          </p>
        </div>
        <div v-else id="card-grid" class="card-grid">
          <UiCard
            v-for="(entry, idx) in filteredEntries"
            :key="entry.display"
            :id="entry.display"
          >
            <img class="card-thumb" :src="entry.url" alt="label preview" />
            <div class="card-meta">
              <div class="card-id">
                {{ entry.display }}
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="copy-btn"
                  @click="copyToClipboard(entry.display)"
                >
                  <img
                    class="ui-icon-sm icon-copy"
                    src="/assets/copy-icon.svg"
                    alt="Copy to clipboard"
                  />
                </UiButton>
              </div>
              <div class="card-name" v-if="entry.filename">
                {{ entry.filename }}
              </div>
            </div>
            <UiButton
              variant="destructive"
              size="sm"
              class="full"
              @click="removeEntry(idx)"
              >Remove</UiButton
            >
          </UiCard>
        </div>
      </div>
    </section>

    <footer id="copyright">
      <div>&copy; {{ year }} by Christopher Matthes</div>
      <div>
        Visit me on:
        <a href="https://github.com/Chrisser73" target="_blank">Github</a> |
        <a href="https://christopher-matthes.de" target="_blank">Homepage</a> |
        <a href="https://www.instagram.com/crysercore/" target="_blank"
          >Instagram</a
        >
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import JSZip from "jszip";
import Alert from "./components/ui/Alert.vue";
import Badge from "./components/ui/Badge.vue";
import UiButton from "./components/ui/Button.vue";
import UiCard from "./components/ui/Card.vue";
import InputUi from "./components/ui/Input.vue";
import Dropzone from "./components/ui/Dropzone.vue";
import Spinner from "./components/ui/Spinner.vue";

const HEADER_SIZE = 0x100;
const INDEX_START = 0x100;
const IMAGES_START = 0x4100;
const IMAGE_W = 74;
const IMAGE_H = 86;
const IMAGE_PIXELS = IMAGE_W * IMAGE_H * 4;
const IMAGE_BLOCK = 25600;

const state = reactive({
  db: null,
  message: "",
  status: "No DB loaded",
  loadingDb: false,
});

const dbFileInput = ref(null);
const imageInput = ref(null);
const crcValue = ref("");
const selectedDbFile = ref(null);
const selectedImageFile = ref(null);
const searchQuery = ref("");
const romNames = ref(new Map());

const message = computed(() => state.message);
const dbStatus = computed(() => state.status);
const hasDb = computed(() => state.db !== null);
const countLabel = computed(() =>
  state.db ? `${state.db.signatures.length} entries` : "0 entries"
);
const canInsert = computed(() => {
  const crc = crcValue.value.trim().toUpperCase();
  return !!selectedImageFile.value && /^[0-9A-F]{8}$/.test(crc);
});
const canLoadDb = computed(() => !!selectedDbFile.value);
const year = new Date().getFullYear();

const cardEntries = computed(() => {
  const romMap = romNames.value;
  if (!state.db) return [];

  return state.db.signatures.map((sig, idx) => {
    const key = sig.toString(16).toUpperCase().padStart(8, "0");
    return {
      sig,
      display: key,
      url: bgraToDataURL(state.db.images[idx]),
      filename: romMap.get(key) ?? "",
    };
  });
});

const filteredEntries = computed(() => {
  const terms = searchQuery.value
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter((t) => t.length);
  if (!terms.length) return cardEntries.value;
  return cardEntries.value.filter((entry) => terms.includes(entry.display));
});

function setMessage(text) {
  state.message = text || "";
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
    state.status = `${state.db.signatures.length} images`;
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

  const imgFile = selectedImageFile.value;
  const crc = crcValue.value.trim().toUpperCase().replace(/^0X/, "");

  if (!imgFile || crc.length !== 8 || !/^[0-9A-F]{8}$/.test(crc)) {
    setMessage("Please select a PNG and enter a valid 8-digit hex CRC32.");
    return;
  }

  try {
    const bgra = await pngFileToBGRA(imgFile);
    const sig = parseInt(crc, 16) >>> 0;

    const idx = state.db.signatures.findIndex((s) => s === sig);
    if (idx === -1) {
      state.db.signatures.push(sig);
      state.db.images.push(bgra);
    } else {
      state.db.images[idx] = bgra;
    }

    setMessage(`Inserted / updated CRC ${crc}`);
    crcValue.value = "";
    if (imageInput.value?.clear) {
      imageInput.value.clear();
    }
    selectedImageFile.value = null;
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    setMessage(`Error processing PNG: ${msg}`);
  }
}

function removeEntry(idx) {
  if (!state.db) return;
  state.db.signatures.splice(idx, 1);
  state.db.images.splice(idx, 1);
  state.status = `${state.db.signatures.length} images`;
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

  if (!JSZip) {
    setMessage("JSZip not found - make sure it is installed.");
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
  }
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

function copyToClipboard(text) {
  navigator.clipboard
    ?.writeText(text)
    .then(() => setMessage(`Copied ${text} to clipboard.`))
    .catch(() => setMessage("Could not copy to clipboard."));
}

async function loadRomNames() {
  let csv = "";
  try {
    const resp = await fetch("/assets/rom_signatures.csv");
    csv = await resp.text();
  } catch (err) {
    console.error(
      "Failed to fetch rom signatures, trying import fallback",
      err
    );
    try {
      const mod = await import("./data/rom_signatures.csv?raw");
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
  // nur .z64 / .n64 / .zip / .bin / etc. entfernen,
  // nicht "J.League ..."
  const noExt = raw.replace(/\.[A-Za-z0-9]{2,4}$/, "");

  const tags = [];
  const base = noExt.replace(/\s*\([^)]*\)/g, (match) => {
    const inner = match.slice(1, -1).trim();
    if (!inner) return "";

    const lower = inner.toLowerCase();
    if (lower.includes("proto")) {
      tags.push("Proto");
    } else if (lower.includes("aftermarket")) {
      tags.push("Aftermarket");
    } else if (lower.includes("unl") || lower.includes("unlicensed")) {
      tags.push("UNL");
    } else if (lower.startsWith("rev")) {
      tags.push(inner);
    } else if (lower.startsWith("v") && /\d/.test(inner)) {
      tags.push(inner);
    } else if (lower.includes("demo")) {
      tags.push("Demo");
    } else if (lower.includes("ntsc-j")) {
      tags.push("NTSC-J");
    } else if (lower === "pal") {
      tags.push("PAL");
    } else if (lower === "ntsc") {
      tags.push("NTSC");
    } else if (lower.includes("japan")) {
      tags.push("NTSC-J");
    } else if (
      lower.includes("usa") ||
      lower.includes("u.s.a") ||
      lower.includes("north america")
    ) {
      tags.push("NTSC");
    } else if (
      lower.includes("europe") ||
      lower.includes("australia") ||
      lower.includes("germany") ||
      lower.includes("france") ||
      lower.includes("spain") ||
      lower.includes("italy") ||
      lower.includes("uk") ||
      lower.includes("england")
    ) {
      tags.push("PAL");
    }
    return "";
  });

  const cleanedBase = base.trim().replace(/\s+/g, " ");
  const uniqTags = [...new Set(tags)];
  if (!uniqTags.length) return cleanedBase;
  return `${cleanedBase} (${uniqTags.join(" / ")})`;
}

onMounted(() => {
  loadRomNames();
});
</script>
