# Garment models and mockups

The Atelier (`/atelier`, where customers design a garment) can customise seven garments. Each needs a
3D model (`public/models/<id>.glb`) and flat 2D mockups (`public/mockups/<id>-front|back.png`, each with
a `-light.png` beside it). The 2D mockups are **photographs**, never renders of the 3D models.

| Garment | 3D model | 2D mockup |
| --- | --- | --- |
| T-shirt, hoodie | hand-made (Blender), in the repo | studio flat-lay photographs (`photos/`), converted by `convert-photos.mjs` |
| Long-sleeve tee | the T-shirt model with its sleeves extended (`derive-long-sleeve.mjs`) | the collection photograph, cut out by `cutout.mjs` |
| Utility vest | **generated** by code (`vest.mjs`, `models.mjs`, built by `build.mjs`) | the collection photograph, cut out by `cutout.mjs` (its back is built from it) |
| Sweatpants | **imported**: "Baggy Pants FREE" by artemlevandovskiy24, CC BY 4.0 (its button removed) | the collection photograph, cut out by `cutout.mjs` |
| Work apron | **imported**: "Caçador de Ents - Avental" by Pedro Vaz, CC BY 4.0 (wider, patch pocket added: `apron-finish.mjs`) | the collection photograph, cut out by `cutout.mjs` |
| Canvas tote | **imported**: "Rattan Tote Bag" by eeelabvisual, CC BY 4.0 | the collection photograph, cut out by `cutout.mjs` |

The hoodie model once carried a flame graphic round its lower body: thousands of tiny topstitching pieces along a
flame-shaped seam between two body panels, the same seam drawn as lines in its normal map, and a faint crease in the
cloth where the panels meet. Nov 2026: the stitching pieces were removed, the seam lines were repainted out of
`hoodie_normal_1001` with the fabric's own grain, and the seam's hairline gaps and shading step were closed. The
original file is in git history if the flames are ever wanted back. (Its 2D mockup is a photograph and never had them.)

The vest and the long-sleeve tee are built to match the garments in the collection photographs
(`public/images/collections/white-label`): a mesh utility vest with a V-neck, centre zip and four flap
pockets, and a boxy long-sleeve tee with plain cuffs. No suitably licensed model of either could be found, so
they are made here. (A catalogue sweep for the vest, Nov 2026, found only waistcoats, high-visibility tabards, puffer
vests, tactical plate carriers and a few field and work jackets; none has the zip and four flap pockets.)
The sweatpants and the apron are real models, the closest licensed ones to the photographs: wide straight-leg
trousers with real simulated folds, and a bib apron with a neck strap and long ties.

```
npm run garments                                  # all of the below, in order
node scripts/garments/build.mjs [id ...]          # the generated models -> public/models/<id>.glb
node scripts/garments/derive-long-sleeve.mjs      # the long-sleeve tee -> public/models/long-sleeve.glb
node scripts/garments/import-glb.mjs [id ...]     # the imported models -> public/models/<id>.glb
node scripts/garments/cutout.mjs [id ...]        # the collection photographs -> scripts/garments/photos/<id>-front|back.png
node scripts/garments/convert-photos.mjs          # every mockup, the thumbnails, lib/garment-mockups.json (from scripts/garments/photos)
```

Run them from `app/`. The import step needs Chrome or Chromium (`CHROME_PATH` if it isn't on the PATH); it uses it
headless, with software GL, to run the same three.js the site uses.

## What the viewer needs from a model

`components/Atelier/GarmentViewer.jsx` takes the **first mesh** in the file and projects artwork onto it, so a
model must be: one mesh; hollow (open neck, hem, cuffs, armholes: no mannequin inside); front toward +z, up
toward +y, the hem on the same floor as the tee (y = -0.356) and a similar size; and with its normals pointing
outwards on the front and the back (the artwork filter keeps only faces whose normal points to +z on the front
and -z on the back; a model whose outer surface faces inwards looks fine but nothing can be printed on it).
The importer checks this and prints a "normals outward" figure (about +0.5 to +0.9 for a sound garment).
Always print on the front and the back in the Atelier before shipping a model.

## Generated garments

`models.mjs` and `vest.mjs` describe a garment as a solid (a signed-distance function, `sdf.mjs`); `mesher.mjs`
meshes it with marching cubes, keeps only its skin (a thin cloth shell) and clips the openings; `simplify.mjs`
reduces the mesh; `glb.mjs` writes the `.glb`. Raised details (pockets, flaps, seams, zip) are real geometry.
`node scripts/garments/build.mjs vest` regenerates it. (`sweatpants.mjs`, the generated sweatpants, is retired: see
its first lines.)

## The long-sleeve tee

`derive-long-sleeve.mjs` reads `public/models/tshirt.glb` and extends its sleeve openings into long sleeves with
plain cuffs, so the long-sleeve tee has exactly the T-shirt's body, collar and seams.

## Imported models and their licences

The imported garments are Creative Commons **CC BY 4.0** models published on Sketchfab. CC BY lets
us use and adapt them, commercially, **as long as the authors are credited** — so the credits are part
of the product, not an extra:

- `sources.json` records each model's title, author, source page, licence and download link.
- The credit is stored inside each `.glb` (its `asset.copyright`), and the Atelier shows it under
  "3D model credits" in the garment picker (from `lib/garment-models.json`).
- We changed the models: the pieces are merged, textures removed, the result resized and repositioned,
  and for some, pieces were left out or the mesh simplified. `adapted` in `sources.json` says what, and
  the credit repeats it.

`import-glb.mjs` downloads each model (from Objaverse's public mirror of Sketchfab's CC models), merges
its pieces into one mesh (they arrive as one mesh per fabric panel), welds the seams, smooths the shading,
drops the baked-in colours and textures (customers choose the colour), and stands the garment up the way
the viewer expects. The options are described at the top of the script: `fit` sets the size; `exclude` leaves
pieces out; `simplify` reduces a very dense mesh; `postprocess` runs a finishing step written for one garment on
the merged mesh (`apron-finish.mjs`: widens the apron, curves its sides back and adds the photographed patch pocket,
sampled from the apron's own front wall); `dimInside` turns on darker shading for the inside of a garment
where it shows (neck, armholes, mouth) — leave it off for a mesh that speckles with it (see
`dimInsideFaces` in `components/Atelier/GarmentViewer.jsx`).

**Choosing a model.** Detail is what makes a garment look real: look for cloth made in CLO or Marvelous
Designer (many separate panels, real folds, ribbed bands), roughly 30k to 300k triangles, in a natural
pose, hollow, with an open neck. Objaverse's metadata (`allenai/objaverse` on Hugging Face, `metadata/`)
lists licence, face count, tags and a thumbnail for every model. Two traps seen so far:

- **Doubled panels.** Some exports contain every panel twice: an outer copy and an inner lining whose
  normals point into the garment. Keep the outer one with `exclude`. If you keep the inner one the model
  looks fine (cloth is drawn two-sided) but nothing can be printed. The importer refuses a model whose
  normals point inwards and warns below +0.3 (trousers read low even when printing works, and a flat apron
  made of two thin walls, front and back, reads low too: print on both sides to be sure).
- **Layers on top of each other.** Some cloth exports stack several coincident or near-coincident copies
  of the panels (look at the model with each source mesh in its own colour: a camouflage pattern means
  z-fighting layers). Keep one set with `exclude`. A flat piece such as an apron can be a slab of two walls a
  few millimetres apart: anything that samples its surface (as `apron-finish.mjs` does for the pocket) must
  use the front wall only.
- **Dense simulations.** A cloth sim can have hundreds of thousands of triangles. `simplify` reduces it
  with meshoptimizer's quadric edge collapse. Borders (hems, armholes) stay where they are and normals
  travel with the vertices, so quilting and folds survive.

Look at what a model really is before choosing it: a catalogue search for "vest" or "long sleeve" mostly turns
up body armour, dress shirts and game props, and a CC model rarely matches a specific product (the vest and the
long-sleeve tee were generated or derived for that reason). A jacket can become a vest: when the sleeves are
separate panels, leave them out with `exclude`.

Where to look: Objaverse's metadata covers Sketchfab's CC models up to about 2023 (what the importer downloads).
Sketchfab's own search (`https://api.sketchfab.com/v3/search?type=models&q=...&downloadable=true`, no login) also
lists newer CC models with their licence, but downloading those needs a Sketchfab account's API token (the
download endpoint answers 401 without one): either use a token, or download the file in a browser and put it in
`public/models` yourself.

**Adding or swapping an imported model:** only use a model whose licence you have checked (CC0 or
CC BY; not "NonCommercial", "NoDerivatives", "ShareAlike" or a personal-use licence), and check it is
still published (`https://api.sketchfab.com/v3/models/<uid>` answers 200, with the licence and the real
author link) — an author can delete a model. Add it to `sources.json`, run `import-glb.mjs`, then add the
garment to `lib/garments.js` (label, fabrics, where the preset logo goes) and a product to `lib/products.js` with
`garmentModel` set to its id, and give it a front and a back picture (see "The 2D mockups"). A model you bought or were given
needs no CC credit: put the file in `public/models` yourself and skip `sources.json`.

## The 2D mockups

Every garment's 2D picture is the same kind of file: a **greyscale shading map with an alpha silhouette**, plus a
soft **highlight map** beside it (`-light.png`), made by `convert-photos.mjs` (with `shade.mjs`) from a photograph of the
garment: a straight, blank flat-lay on a transparent background, from the front and from the back
(`scripts/garments/photos/<name>-front.png` and `-back.png`). They are never renders of the 3D models: a render looks
like a render (that was the complaint that led to this).

- the silhouette is tightened and cleaned (no semi-transparent halo from the original background, stray
  specks removed);
- the flat fabric is mapped to exactly white, so multiplying by a colour gives that colour; only creases and
  shadows are darker, and nothing is brighter than the fabric (a bright thread or seam line would otherwise
  read as a "white stain" on a dark colour);
- thin bright lines are removed, the deepest shadows are softened, and the slow lighting gradient of a
  photograph is taken out (a white garment would otherwise go grey towards its hem);
- a faint dark rim follows the silhouette so a white garment keeps its edge on a pale page;
- the highlight map keeps folds, seams and pockets visible on dark colours, but only where the cloth is clearly lit
  above its flat tone (`light.bias`) and at a low strength: with no bias about a fifth of a hoodie lit up and a dark
  colour looked glossy.

The editor (`components/Atelier/GarmentMockup2D.jsx`) draws the chosen colour inside the silhouette (the
picture's alpha, never its brightness), multiplies the shading on top, and screens the highlights over it.
Multiply alone can only darken (a black garment would lose all its detail) and screen does nothing to white,
so the two together are right for every colour. The Atelier's stage (`stageBackground` in `lib/garments.js`)
deepens behind a pale garment so white does not disappear into the page. Where the picture has holes (the
open weave of the vest) the page shows through them.

**The tee and hoodie** come from studio flat-lay photographs kept in `scripts/garments/photos`
(`convert-photos.mjs`, settings in `PHOTO_OPTIONS`).

**Everything else** comes from the collection page's product photographs (`public/images/collections/white-label`):
each white garment lying on grey concrete, tilted. (The photographs used to carry the Kazi logo; on 2026-11-12 they were
replaced by logo-free versions of the same shots, with the garments in the same places. The pictures in `photos/` and the
mockups were made from the old ones and were not redone; `cutout.mjs` was not re-run on the new files, so check its output
before relying on it. The old photographs are in git history, commit 1a4f6d8.) `cutout.mjs` turns each into what the tee and
hoodie already are: it turns the garment upright (`rotate`, a `shearY` for the vest, a four-corner `quad` for the tote,
which was shot from the side), cuts it out of the floor (white on grey: bright pixels grown into the darker folds that
touch them; real holes stay open, so the neck loop of the apron, the tote's handle and the open weave of the vest show
the page through them), paints the green logo out (and the blue label in the long-sleeve's collar) from the cloth around
it, and writes the front. Every pixel of the cloth is the photograph's; nothing is invented, with these exceptions, which
the photographs cannot show (put real photographs of the backs in `photos/` and take the garment out of `JOBS` to
replace them):

- **backs.** The photographs show fronts only. The back of the tote, sweatpants and long-sleeve tee is the front
  mirrored; the apron's is the front mirrored with the pocket painted out; the vest's keeps the photographed yoke and
  binding and has a plain mesh body (a regular lattice of holes the size and spacing of the photographed ones). The
  long-sleeve tee's back neckline is the front's.
- **the long-sleeve tee's left sleeve** was lying out sideways in the photograph, so it is the mirror image of the right one.

`convert-photos.mjs` then turns every picture into its shading map. The studio photographs (tee, hoodie) are even and flat,
so their shadows are amplified; the concrete photographs are lit from above and full of soft shadows, so they get a lower
gain, a dead zone and a tighter flat-field correction (`FLOOR_PHOTO`), or the shadows read as blotches in a mid colour.

`convert-photos.mjs` also writes `lib/garment-mockups.json` (each picture's size and where the garment sits in it), which
`lib/garments.js` reads, and a small picker thumbnail per garment in `public/mockups/thumbs`. Pass `--out <dir>` to it
(or `--preview <dir>` to `cutout.mjs`) to try settings without touching the site.

The picture and the 3D model are not the same object, so artwork is carried between the 2D and 3D views by where it sits
within the garment's own bounds (`area` in `lib/garment-mockups.json` for the picture, the front's bounding box for the
model): close enough for a logo on a chest or a pocket, not exact.
