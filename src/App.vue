<template>
  <div class="app">
    <header>
      <h1>
        <img class="logo" src="/assets/icon-alt.png" alt="Analogue 3D logo" />
        <span class="logo-text">Labels.db File Extractor &amp; Editor</span>
      </h1>
    </header>

    <section class="panel top-panel">
      <div class="panel-header">
        <div>
          <h2>Load Database File</h2>
          <p class="small-note">
            Load your existing <code>labels.db</code> so you can view and edit its entries locally in your browser or use the one from
            <a href="/assets/labels.db" target="_blank" title="labels.db file download">here</a>.
          </p>
        </div>
        <small>{{ dbStatus }}</small>
      </div>

      <form class="form-grid" @submit.prevent="onLoadDb">
        <label>
          <strong>labels.db file:</strong>
          <br />
          <input type="file" ref="dbFileInput" accept=".db" required />
        </label>
        <div class="button-row">
          <button type="submit" class="btn-primary">Load DB</button>
          <button type="button" class="btn-secondary" :disabled="!hasDb" @click="downloadDb">
            Download Modified DB
          </button>
          <button type="button" class="btn-secondary" :disabled="!hasDb" @click="downloadImages">
            Download Images (ZIP)
          </button>
        </div>
      </form>

      <div v-if="message" class="message">{{ message }}</div>
    </section>

    <section v-if="hasDb" class="layout" id="editor">
      <div class="panel">
        <h2>Modify Database</h2>
        <p class="small-note">Add a new image or replace an existing one using its CRC32 cartridge signature.</p>
        <form @submit.prevent="onAdd">
          <label>
            <strong>PNG Image</strong> (any size; will be resized to 74x86):
            <input type="file" ref="imageInput" accept="image/png" required />
          </label>
          <label>
            <strong>Cartridge Signature</strong> (CRC32, first 8KiB / Byteorder):
            <input v-model="crcValue" type="text" placeholder="98E67875" required />
          </label>
          <button type="submit" class="btn-primary">Insert / Replace</button>
        </form>
      </div>

      <div class="panel">
        <div class="images-header">
          <h2>Extracted Images</h2>
          <small>{{ countLabel }}</small>
        </div>
        <div id="card-grid" class="card-grid">
          <div v-for="(entry, idx) in cardEntries" :key="entry.display" class="card">
            <img class="card-thumb" :src="entry.url" alt="label preview" />
            <div class="card-id">{{ entry.display }}</div>
            <button type="button" class="btn-danger card-remove" @click="removeEntry(idx)">
              Remove
            </button>
          </div>
        </div>
      </div>
    </section>

    <footer id="copyright">
      <div>&copy; {{ year }} by Christopher Matthes</div>
      <div>
        Visit me on:
        <a href="https://github.com/Chrisser73" target="_blank">Github</a> |
        <a href="https://christopher-matthes.de" target="_blank">Homepage</a> |
        <a href="https://www.instagram.com/crysercore/" target="_blank">Instagram</a>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import JSZip from "jszip";

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
});

const dbFileInput = ref(null);
const imageInput = ref(null);
const crcValue = ref("");

const message = computed(() => state.message);
const dbStatus = computed(() => state.status);
const hasDb = computed(() => state.db !== null);
const countLabel = computed(() => (state.db ? `${state.db.signatures.length} entries` : "0 entries"));
const year = new Date().getFullYear();

const cardEntries = computed(() => {
  if (!state.db) return [];
  return state.db.signatures.map((sig, idx) => ({
    sig,
    display: sig.toString(16).toUpperCase().padStart(8, "0"),
    url: bgraToDataURL(state.db.images[idx]),
  }));
});

function setMessage(text) {
  state.message = text || "";
}

async function onLoadDb() {
  const file = dbFileInput.value?.files?.[0];
  if (!file) {
    setMessage("Please choose a labels.db file.");
    return;
  }
  try {
    const buf = await file.arrayBuffer();
    state.db = parseLabelsDb(buf);
    state.status = `${state.db.signatures.length} images loaded`;
    setMessage("DB loaded successfully.");
  } catch (err) {
    console.error(err);
    state.db = null;
    state.status = "No DB loaded";
    const msg = err instanceof Error ? err.message : String(err);
    setMessage(`Error loading DB: ${msg}`);
  }
}

async function onAdd() {
  if (!state.db) {
    setMessage("No DB loaded - please load labels.db first.");
    return;
  }

  const imgFile = imageInput.value?.files?.[0];
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
    if (imageInput.value) {
      imageInput.value.value = "";
    }
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
  state.status = `${state.db.signatures.length} images loaded`;
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
  const dv = new DataView(indexRegion.buffer, indexRegion.byteOffset, indexRegion.byteLength);
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
</script>
