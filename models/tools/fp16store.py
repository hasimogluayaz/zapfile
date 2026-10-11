"""Store large float32 initializers as float16 + Cast; compute stays fp32."""
import sys, onnx, numpy as np
from onnx import numpy_helper, helper, TensorProto
src, dst = sys.argv[1:3]
m = onnx.load(src)
g = m.graph
new_inits, casts = [], []
for init in g.initializer:
    if init.data_type == TensorProto.FLOAT and np.prod(init.dims) >= 1024:
        arr = numpy_helper.to_array(init)
        f16 = arr.astype(np.float16)
        assert np.isfinite(f16).all(), init.name
        name16 = init.name + "__fp16"
        new_inits.append(numpy_helper.from_array(f16, name16))
        casts.append(helper.make_node("Cast", [name16], [init.name], to=TensorProto.FLOAT, name=init.name + "__cast"))
    else:
        new_inits.append(init)
del g.initializer[:]
g.initializer.extend(new_inits)
nodes = casts + list(g.node)
del g.node[:]
g.node.extend(nodes)
onnx.checker.check_model(m)
onnx.save(m, dst)
print("saved", dst)
