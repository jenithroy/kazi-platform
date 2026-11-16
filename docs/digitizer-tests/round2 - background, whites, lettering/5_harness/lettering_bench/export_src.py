import sys, os, json
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
FACES = os.path.join(os.path.dirname(HERE), "faces", "cache")
items = [("reg18","crest_manzanares"),("new55","text_serif_sign_st_xavier"),("new55","text_sans_sign_medstead"),("new55","emblems_seal_torrance_bw"),("new55","emblems_logo_sdl"),("new55","emblems_flag_washington_island")]
os.makedirs(os.path.join(HERE,"cache","src_png"), exist_ok=True)
for s,n in items:
    d = os.path.join(FACES,s,n)
    m = json.load(open(os.path.join(d,"meta.json")))
    a = np.fromfile(os.path.join(d,"image.rgba"), dtype=np.uint8).reshape(m["height"], m["width"], 4)
    Image.fromarray(a, "RGBA").save(os.path.join(HERE,"cache","src_png",f"{s}__{n}.png"))
    print(s,n,m["width"],m["height"])
