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
