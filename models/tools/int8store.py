"""Store Conv/MatMul/Gemm weights as per-channel int8 + DequantizeLinear.

Input: the fp16-stored model from fp16store.py (fp16 initializer + Cast).
Only weights feeding the weight input of Conv, MatMul or Gemm are quantized
(symmetric, per output channel); everything else (biases, norms, the
grid_sample coordinate constants) stays float16. Dequantization happens once
at load time, so compute stays float32 — only the download shrinks.
"""
import sys, onnx, numpy as np
from collections import defaultdict
from onnx import numpy_helper, helper, TensorProto

src, dst = sys.argv[1:3]
m = onnx.load(src)
g = m.graph
inits = {i.name: i for i in g.initializer}
consumers = defaultdict(list)
for n in g.node:
    for k, inp in enumerate(n.input):
        consumers[inp].append((n, k))


def out_axis(uses):
    """Output-channel axis of a weight, or None when it isn't a plain weight."""
    axes = set()
    for n, k in uses:
        if n.op_type == "Conv" and k == 1:
            axes.add(0)
        elif n.op_type == "MatMul" and k == 1:
            axes.add(1)
        elif n.op_type == "Gemm" and k == 1:
            trans_b = next((a.i for a in n.attribute if a.name == "transB"), 0)
            axes.add(0 if trans_b else 1)
        elif n.op_type == "Identity":
            inner = out_axis(consumers[n.output[0]])
            if inner is None:
                return None
            axes.add(inner)
        else:
            return None
    return axes.pop() if len(axes) == 1 else None


new_nodes, drop_inits, add_inits = [], set(), []
quantized = 0
for n in g.node:
    if n.op_type == "Cast" and n.input[0] in inits and inits[n.input[0]].data_type == TensorProto.FLOAT16:
        w = numpy_helper.to_array(inits[n.input[0]]).astype(np.float32)
        axis = out_axis(consumers[n.output[0]])
        if axis is not None and w.ndim >= 2:
            red = tuple(i for i in range(w.ndim) if i != axis)
            scale = np.abs(w).max(axis=red) / 127.0
            scale[scale == 0] = 1e-12
            shape = [1] * w.ndim
            shape[axis] = -1
            q = np.clip(np.round(w / scale.reshape(shape)), -127, 127).astype(np.int8)
            base = n.output[0]
            add_inits += [
                numpy_helper.from_array(q, base + "__q"),
                numpy_helper.from_array(scale.astype(np.float32), base + "__scale"),
                numpy_helper.from_array(np.zeros_like(scale, dtype=np.int8), base + "__zp"),
            ]
            new_nodes.append(helper.make_node(
                "DequantizeLinear", [base + "__q", base + "__scale", base + "__zp"], [base],
                axis=axis, name=base + "__dq"))
            drop_inits.add(n.input[0])
            quantized += 1
            continue
    new_nodes.append(n)

kept = [i for i in g.initializer if i.name not in drop_inits]
del g.initializer[:]
g.initializer.extend(kept + add_inits)
del g.node[:]
g.node.extend(new_nodes)
onnx.checker.check_model(m)
onnx.save(m, dst)
print(f"quantized {quantized} weights, saved {dst}")
