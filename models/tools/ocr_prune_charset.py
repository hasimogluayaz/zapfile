import onnx, numpy as np, json, unicodedata, sys
from onnx import numpy_helper, helper
src, dst_model, dst_dict = sys.argv[1:4]
chars = json.load(open('/home/user/zapfile/models/ppocrv6-small/dict.json'))['characters']
def keep(c):
    if len(c) != 1: return False
    o = ord(c)
    if 0x20 <= o <= 0x7E: return True                       # ASCII
    if 0xA0 <= o <= 0xFF: return c not in "¤¦¨¯´¸"           # Latin-1 (no bare diacritics)
    if 0x100 <= o <= 0x17F: return True                     # Latin Extended-A (Turkish ğ ı İ ş, Polish, Czech…)
    if o in (0x18F, 0x259, 0x218, 0x219, 0x21A, 0x21B): return True  # Ə ə (Azerbaijani), Ș ș Ț ț (Romanian)
    if 0x370 <= o <= 0x3FF: return True                     # Greek
    if 0x2010 <= o <= 0x205E: return True                   # punctuation (dashes, quotes, …, ‰)
    if 0x20A0 <= o <= 0x20CF: return True                   # currency (€, ₺)
    if o in (0x2116, 0x2122, 0x2103) or 0x2190 <= o <= 0x21FF: return True  # № ™ ℃, arrows
    if o in (0x2212, 0x221E, 0x2248, 0x2260, 0x2264, 0x2265, 0x221A, 0x2022, 0x25CF, 0x2713, 0x2714): return True
    return False
idx = [i for i, c in enumerate(chars) if keep(c)]
print(len(idx), 'of', len(chars), ''.join(chars[i] for i in idx if ord(chars[i]) > 0x7e)[:400])
cls = [0] + [i + 1 for i in idx]
m = onnx.load(src); g = m.graph
for init in g.initializer:
    if init.name in ('linear_8.w_0', 'linear_8.b_0'):
        a = numpy_helper.to_array(init)
        a = a[:, cls] if a.ndim == 2 else a[cls]
        init.CopyFrom(numpy_helper.from_array(np.ascontiguousarray(a), init.name))
g.output[0].type.tensor_type.shape.dim[2].dim_value = len(cls)
# Drop shape annotations that still say 18710 classes.
stale = [vi for vi in g.value_info if any(d.dim_value == len(chars) + 1 for d in vi.type.tensor_type.shape.dim)]
for vi in stale: g.value_info.remove(vi)
onnx.checker.check_model(m)
onnx.save(m, dst_model)
json.dump({'characters': [chars[i] for i in idx]}, open(dst_dict, 'w'), ensure_ascii=False, separators=(',', ':'))
