# Models

On-device AI models used by ZapFile tools. They are downloaded by the browser
from a pinned commit of this repository via jsDelivr (fallback:
raw.githubusercontent.com), cached in Cache Storage and verified by SHA-256
before use. They are excluded from Vercel deployments (`.vercelignore`).

## birefnet-lite-768/ — Background Remover

| | |
|---|---|
| Model | BiRefNet lite (Swin-T), "general" weights, epoch 232 |
| Source | `BiRefNet-general-bb_swin_v1_tiny-epoch_232.pth` from https://github.com/ZhengPeng7/BiRefNet/releases/tag/v1 |
| License | MIT (see `birefnet-lite-768/LICENSE`) |
| Input | `input_image` float32 [1, 3, 768, 768], RGB, ImageNet mean/std |
| Output | `output_image` float32 [1, 1, 768, 768], logits (apply sigmoid) |
| File | 94,370,922 bytes, SHA-256 `94db4755eef843b440490b19b5bfcf4695ff5a2550238fefeb583663304eba27` |
| Parts | `part-00.bin` … `part-04.bin`, concatenate in order |

Why a re-export instead of the published ONNX files:

- The published 1024×1024 export peaks at ~6.7 GB during inference
  (its deformable convolutions are exported as huge gather ops), which is
  over WebAssembly's 4 GB limit, so it cannot run in browsers without a GPU.
- `tools/export.py` replaces `torchvision.ops.deform_conv2d` with an exactly
  equivalent `grid_sample` formulation (max |Δlogit| ≈ 1e-4, checked by the
  script) and exports at 768×768: peak memory drops below 1 GB and the mask
  matches the 1024 model closely (IoU ≥ 0.98 on test photos). Full-resolution
  edge detail is recovered by ZapFile's guided-filter refinement.
- `tools/fp16store.py` stores weights as float16 with a Cast to float32 at
  load time: half the download, compute stays float32 (max |Δprob| < 1e-6).

Reproduce:

```sh
python tools/export.py BiRefNet-general-bb_swin_v1_tiny-epoch_232.pth 768 brn768.onnx
python tools/fp16store.py brn768.onnx model.onnx
split -b 19000000 -d -a 2 --additional-suffix=.bin model.onnx birefnet-lite-768/part-
```

`export.py` expects the BiRefNet source tree in `./src` (commit used:
`main` as of 2026-10) and `torch`, `torchvision`, `timm`, `einops`,
`kornia`, `huggingface_hub`, `onnx`, `onnxruntime`.

## libreoffice-2.7.2/ — Word, Excel and PowerPoint to PDF

| | |
|---|---|
| Engine | LibreOffice compiled to WebAssembly, from the npm package `@matbee/libreoffice-converter@2.7.2` (`wasm/soffice.wasm`, `wasm/soffice.data`) |
| Source | https://github.com/matbeedotcom/libreoffice-document-converter (build scripts) and https://www.libreoffice.org (LibreOffice sources) |
| License | MPL-2.0 (LibreOffice); unmodified binaries |
| `soffice.wasm` | 147,416,331 bytes raw; stored gzipped (48,600,040 bytes, SHA-256 `7301d283e77df88c11e6cd429b7e23624d29584c55cd3aee79b56f4e3121b189`) as `wasm-part-00.bin` … `wasm-part-02.bin` |
| `soffice.data` | 99,735,918 bytes raw; stored gzipped (28,465,699 bytes, SHA-256 `4f4b6375f2669f8a08a63e3573afb3695b21a438deaad38c8e81697bf5d3c5cc`) as `data-part-00.bin`, `data-part-01.bin` |

The browser concatenates the parts, checks the SHA-256 of the gzip stream, keeps it in Cache Storage and
unpacks it with `DecompressionStream`. The small loader scripts (`soffice.js`, `soffice.worker.js`,
`browser.worker.global.js`) are copied from the npm package into `public/vendor/libreoffice-<version>/`.
To recreate the parts: `gzip -9 -n -c soffice.wasm | split -b 19000000 -d -a 2 --additional-suffix=.bin - wasm-part-`.

## ppocrv6-small/ — Handwriting to Text

| | |
|---|---|
| Model | PP-OCRv6 small: DB text detector + SVTR/CTC text recognizer (printed and handwritten text; Latin incl. Turkish, Greek, Chinese, Japanese) |
| Source | PaddleOCR v3.7.0 (rev `b03f4642`), ONNX exports as packaged in npm `@arcships/light-ocr-model-ppocrv6-small@0.3.4` (`bundle/webgpu/`), converted to float16 with `onnxruntime.transformers.float16` |
| License | Apache-2.0 (see `ppocrv6-small/LICENSE`) |
| `det.onnx` | input `x` float16 [1, 3, H, W] (multiples of 32), BGR, ImageNet mean/std → text probability map [1, 1, H, W]. 4,973,761 bytes, SHA-256 `2f0463ba51af55a9f49cae1f18cf905c578d4752236c30456325c817d8e47a1b` |
| `rec.onnx` | input `x` float16 [N, 3, 48, W ≥ 320], BGR, (x/255 − 0.5)/0.5 → CTC scores [N, W/8, 18711] (blank, `dict.json` characters, space). 10,624,002 bytes, SHA-256 `f6ee9c86013fdd02cf9dfdf311813e1f2fe56e83d2b5f12994617dfa05d3b9cb` |
| `dict.json` | `{ characters: [...] }`, 112,408 bytes, SHA-256 `6e93cc028ff774c8bef0801ad08391f8284f7ef897013a9aeb9cbd515db3276d` |

| `rec-latin.onnx` | `rec.onnx` with its output layer cut to the 566 Latin/Greek/punctuation characters of `dict-latin.json` (`tools/ocr_prune_charset.py`): same results on Latin text (checked on real and test pages), 6,233,083 bytes instead of 10.6 MB, and a 567-class output instead of 18,710 (faster decoding). SHA-256 `01efad51fcf62a4eaf0d2e8a10325c8d02da7b14fbe110af9ed29f03a379875a` |
| `dict-latin.json` | 2,927 bytes, SHA-256 `b1a1c5aa2cc7372f957a46aa664b9e5ca60a6d9a6183773366faa7a8ac4313d1` |

The default is `rec-latin.onnx`; the full `rec.onnx` + `dict.json` are only downloaded for Japanese or Chinese text.

The float16 files run on both ONNX Runtime Web execution providers (WebGPU and
WASM) with the same results as the float32 originals on our test pages.
Pre/post-processing: `src/lib/handwriting/pipeline.ts`.

## lexicons/ — Turkish word list for Handwriting to Text

`tr.txt`: about 288,000 Turkish words with approximate frequency ranks, merged from [wordfreq](https://github.com/rspeer/wordfreq) 3.1.1 by Robyn Speer (top 50,000) and [FrequencyWords](https://github.com/hermitdave/FrequencyWords) by Hermit Dave (OpenSubtitles 2018, top 300,000; rank = the better of the two). Filtered: alphabetic words only, one spelling per form without Turkish letters (the most frequent), no q/w/x, and English words far more frequent in English removed (Turkish rank > 1,000 and > 10 × their wordfreq English rank: "get", "rain", …). **Data license: CC BY-SA 4.0** (both sources); this derived list is shared under the same license (header lines starting with `#`).

Compact format (read by `parseLexicon`): `=R` starts a group of words of about rank R (groups are half powers of two), and inside a group each line is the number of characters shared with the previous word followed by the rest of it. 1,826,254 bytes (≈ 610 KB brotli / 750 KB gzip as jsDelivr serves it), SHA-256 `c7c03dc8d13481e383c861d983aadfa82965da27599ccb988a07f6c27ba99e38`.

Downloaded only for Turkish pages. `src/lib/handwriting/language.ts` re-scores each word with the recognizer's own character probabilities (CTC) plus the word's frequency: it puts back ı/ş/ğ/ç (which the recognizer hardly ever outputs for handwriting) and fixes a handwritten "a" read as "o", but a word is only replaced by one the recognizer considers possible at every letter. Measured on a real notebook page: 50k wordfreq list 18.4 %, this list 17.6 % character errors; with the second, writer-adaptive pass 15.3 % vs 13.4 % (and "Trablusgarp", rank ≈ 250,000, is only in this one).

`en.txt`: the 30,000 most frequent alphabetic English words from wordfreq 3.1.1 (CC BY-SA 4.0, same compact format), 177,710 bytes (≈ 75 KB compressed), SHA-256 `caf4bd24d3c1bf2f51846e21fc4f19c7982a5441aa3a376f230fdf3398e12756`. Loaded only for pages that mix English and Turkish (English lessons with Turkish explanations): clearly English lines and words that are more frequent in English stay as read, only the Turkish is corrected.
