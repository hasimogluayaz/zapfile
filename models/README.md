# Models

On-device AI models used by ZapFile tools. They are downloaded by the browser
from a pinned commit of this repository via jsDelivr (fallback:
raw.githubusercontent.com), cached in Cache Storage and verified by SHA-256
before use. They are excluded from Vercel deployments (`.vercelignore`).

## birefnet-lite-768-int8/ — Background Remover

| | |
|---|---|
| Model | BiRefNet lite (Swin-T), "general" weights, epoch 232 |
| Source | `BiRefNet-general-bb_swin_v1_tiny-epoch_232.pth` from https://github.com/ZhengPeng7/BiRefNet/releases/tag/v1 |
| License | MIT (see `birefnet-lite-768/LICENSE`) |
| Input | `input_image` float32 [1, 3, 768, 768], RGB, ImageNet mean/std |
| Output | `output_image` float32 [1, 1, 768, 768], logits (apply sigmoid) |
| File | 50,743,355 bytes, SHA-256 `05367cd399191f2260c3e66bbb887a7e3fc5b46ea14aa4309745a3e208012b77` |
| Parts | `part-00.bin` … `part-02.bin`, concatenate in order |

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
- `tools/int8store.py` then stores the Conv/MatMul/Gemm weights as symmetric
  per-channel int8 with Cast + Mul (folded at load, compute stays
  float32); biases, norms and the grid_sample constants stay float16.
  94 MB → 51 MB; mask IoU vs the fp16 file ≥ 0.999 on photos (scikit-image
  astronaut, chelsea, coffee), mean |Δprob| < 0.001. (The previous fp16 file
  is `birefnet-lite-768/` at commit 0eb7589.)

Reproduce:

```sh
python tools/export.py BiRefNet-general-bb_swin_v1_tiny-epoch_232.pth 768 brn768.onnx
python tools/fp16store.py brn768.onnx fp16.onnx
python tools/int8store.py fp16.onnx model.onnx
split -b 19000000 -d -a 2 --additional-suffix=.bin model.onnx birefnet-lite-768-int8/part-
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
