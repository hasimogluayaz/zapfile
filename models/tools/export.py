"""Export BiRefNet-lite (swin_v1_t, general) to ONNX at a browser-friendly
input size, with a memory-light deformable convolution (grid_sample based)
instead of the gather-heavy exporter. Validates against the PyTorch model.

usage: python export.py <ckpt.pth> <size> <out.onnx>
"""
import sys, os, types
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

sys.path.insert(0, os.path.join(os.getcwd(), "src"))
import config as cfgmod

_orig_init = cfgmod.Config.__init__
def _patched(self):
    _orig_init(self)
    self.bb = "swin_v1_t"
    self.lateral_channels_in_collection = [768 * 2, 384 * 2, 192 * 2, 96 * 2]
    self.cxt = self.lateral_channels_in_collection[1:][::-1][-self.cxt_num:] if self.cxt_num else []
cfgmod.Config.__init__ = _patched

from models.birefnet import BiRefNet
from models.modules import deform_conv as dcmod
from torchvision.ops import deform_conv2d


def deform_conv_gridsample(x, offset, weight, bias, mask, stride, padding):
    """Same maths as torchvision.ops.deform_conv2d (dilation 1, groups 1),
    one kernel tap at a time with grid_sample so peak memory is ~C·H·W."""
    n, c, h, w = (int(v) for v in x.shape)
    oc, _, kh, kw = (int(v) for v in weight.shape)
    sh, sw = stride
    ph, pw = padding
    oh = (h + 2 * ph - kh) // sh + 1
    ow = (w + 2 * pw - kw) // sw + 1
    ys = torch.arange(oh, dtype=x.dtype, device=x.device).view(1, oh, 1) * sh - ph
    xs = torch.arange(ow, dtype=x.dtype, device=x.device).view(1, 1, ow) * sw - pw
    out = None
    for k in range(kh * kw):
        ky, kx = divmod(k, kw)
        py = ys + ky + offset[:, 2 * k]       # (n, oh, ow)
        px = xs + kx + offset[:, 2 * k + 1]
        gx = px * (2.0 / max(w - 1, 1)) - 1.0
        gy = py * (2.0 / max(h - 1, 1)) - 1.0
        grid = torch.stack((gx, gy), dim=-1)  # (n, oh, ow, 2)
        sampled = F.grid_sample(x, grid, mode="bilinear", padding_mode="zeros", align_corners=True)
        sampled = sampled * mask[:, k : k + 1]
        term = F.conv2d(sampled, weight[:, :, ky : ky + 1, kx : kx + 1])
        out = term if out is None else out + term
    if bias is not None:
        out = out + bias.view(1, -1, 1, 1)
    return out


def patched_forward(self, x):
    offset = self.offset_conv(x)
    modulator = 2.0 * torch.sigmoid(self.modulator_conv(x))
    pad = self.padding if isinstance(self.padding, tuple) else (self.padding, self.padding)
    return deform_conv_gridsample(x, offset, self.regular_conv.weight, self.regular_conv.bias, modulator, self.stride, pad)


class Wrapper(nn.Module):
    def __init__(self, m):
        super().__init__()
        self.m = m

    def forward(self, input_image):
        return self.m(input_image)[-1]


def load(ckpt):
    model = BiRefNet(bb_pretrained=False)
    sd = torch.load(ckpt, map_location="cpu", weights_only=True)
    sd = {k.removeprefix("module.").removeprefix("_orig_mod."): v for k, v in sd.items()}
    missing, unexpected = model.load_state_dict(sd, strict=False)
    print("missing", len(missing), missing[:5], "unexpected", len(unexpected), unexpected[:5])
    assert not missing and not unexpected
    return model.eval()


def main():
    ckpt, size, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    torch.manual_seed(0)
    model = load(ckpt)
    x = torch.randn(1, 3, size, size) * 0.5

    # 1. Our deform conv matches torchvision's.
    with torch.no_grad():
        ref = model(x)[-1]
        orig = dcmod.DeformableConv2d.forward
        dcmod.DeformableConv2d.forward = patched_forward
        new = model(x)[-1]
    diff = (ref - new).abs().max().item()
    print(f"deform patch max abs diff on logits: {diff:.2e}")
    assert diff < 1e-2, diff

    # 2. Export.
    wrapper = Wrapper(model).eval()
    torch.onnx.export(
        wrapper, (x,), out, input_names=["input_image"], output_names=["output_image"],
        opset_version=17, do_constant_folding=True, dynamo=False,
    )
    print("exported", out, os.path.getsize(out) / 1e6, "MB")

    # 3. ONNX Runtime agrees with PyTorch.
    import onnxruntime as ort
    s = ort.InferenceSession(out, providers=["CPUExecutionProvider"])
    y = s.run(None, {"input_image": x.numpy()})[0]
    d = np.abs(y - ref.numpy()).max()
    print(f"onnxruntime vs torch max abs diff: {d:.2e}")


if __name__ == "__main__":
    main()
