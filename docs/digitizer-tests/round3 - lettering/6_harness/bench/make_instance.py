import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
src, dst, w = sys.argv[1], sys.argv[2], float(sys.argv[3])
f = TTFont(src)
inst = instancer.instantiateVariableFont(f, {"wght": w})
inst.save(dst)
