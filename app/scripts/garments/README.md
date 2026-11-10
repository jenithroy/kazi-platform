# Garment models and mockups

The Atelier (`/atelier`, where customers design a garment) can customise seven garments. Each needs a
3D model (`public/models/<id>.glb`) and flat 2D mockups (`public/mockups/<id>-front|back.png`).

| Garment | 3D model | Where it comes from |
| --- | --- | --- |
| T-shirt, hoodie | hand-made (Blender) | in the repo; the 2D mockups are photographs |
| Long-sleeve tee | **imported**: a raglan crew-neck sweatshirt (ribbed collar, cuffs and hem), about 45k triangles | "Sweatshirt Raglan Sleeves Colorway 1" by benski77, CC BY 4.0 |
| Utility vest | **imported**: a quilted puffer vest (stand collar, zip front, side pockets, ribbed hem), about 90k triangles | "Winter Jacket" by Flow Studio, CC BY 4.0, made into a vest by leaving out the sleeves |
| Sweatpants, canvas tote | **imported** | "The Pants" by ARize and "Rattan Tote Bag" by eeelabvisual, CC BY 4.0 |
| Work apron | **generated** by code | `models.mjs` → `build.mjs` |

The imported ones are listed in `sources.json` and built by `import-glb.mjs`.

```
npm run garments                                  # all of the below
node scripts/garments/build.mjs                   # the generated apron -> public/models/apron.glb
node scripts/garments/import-glb.mjs [id ...]     # the imported models -> public/models/<id>.glb
node scripts/garments/render-mockups.mjs [id ...] # the 2D mockups, thumbnails and lib/garment-mockups.json
```

Run them from `app/`. The import and mockup steps need Chrome or Chromium (`CHROME_PATH` if it isn't on
the PATH); they use it headless, with software GL, to run the same three.js the site uses.

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
the viewer expects: front toward +z, hem on the same floor as the tee (y = -0.356), sized like the others.
The options are described at the top of the script: `fit` sets the size; `exclude` leaves pieces out;
`simplify` reduces a very dense mesh; `dimInside` turns on darker shading for the inside of a garment
where it shows (neck, armholes, mouth) — leave it off for a mesh that speckles with it (see
`dimInsideFaces` in `components/Atelier/GarmentViewer.jsx`).

**Choosing a model.** Detail is what makes a garment look real: look for cloth made in CLO or Marvelous
Designer (many separate panels, real folds, ribbed bands), roughly 30k to 300k triangles, in a natural
pose, hollow, with an open neck. Objaverse's metadata (`allenai/objaverse` on Hugging Face, `metadata/`)
lists licence, face count and tags for every model. Two traps seen so far:

- **Doubled panels.** Some exports contain every panel twice: an outer copy and an inner lining whose
  normals point into the garment. Keep the outer one with `exclude`. If you keep the inner one the model
  looks fine (cloth is drawn two-sided) but the viewer's artwork filter rejects every face and nothing
  can be printed. The importer checks that the front-most surface faces forward and the back-most faces
  backward ("normals outward" in its output: about +0.5 to +0.9 for a sound garment) and refuses a model
  whose normals point inwards. It warns below +0.3, but treat that as a prompt to look, not a verdict:
  trousers read low even when printing works. Always print on the front and back in the Atelier.
- **Dense simulations.** A cloth sim can have hundreds of thousands of triangles. `simplify` reduces it
  with meshoptimizer's quadric edge collapse (the package ships with three.js's tooling; otherwise
  `npm i -D meshoptimizer`). Borders (hems, armholes) stay where they are and normals travel with the
  vertices, so quilting and folds survive: the vest went from 264k to 90k triangles at 0.07% error.

A jacket can become a vest: when the sleeves are separate panels, leave them out with `exclude` (that is
how the utility vest was made). To find the piece names, render the model with one colour per mesh.

**Adding or swapping a garment's model:** only use a model whose licence you have checked (CC0 or
CC BY; not "NonCommercial", "NoDerivatives", "ShareAlike" or a personal-use licence), and check it is
still published (`https://api.sketchfab.com/v3/models/<uid>` answers 200, with the licence and the real
author link) — an author can delete a model. Add it to `sources.json`, run `import-glb.mjs`, then
`render-mockups.mjs`, then add the garment to `lib/garments.js` (label, fabrics, where the preset logo
goes) and a product to `lib/products.js` with `garmentModel` set to its id. Print on the front and the back
in the Atelier before you ship it. A model you bought or were given needs no CC credit: put the file in
`public/models` yourself and skip `sources.json`.

## The generated apron

No suitably licensed bib apron could be found, so `models.mjs` builds one: it describes the apron as a
solid (a signed-distance function, `sdf.mjs`), `mesher.mjs` meshes it with marching cubes and clips the
openings, and `glb.mjs` writes the `.glb`. It is a stand-in; replace it with a real model when you have one.

## The 2D mockups

`render-mockups.mjs` photographs each model from the front and the back under soft studio light, trims
it, brightens it so lit cloth is almost white, and saves a greyscale PNG with an alpha channel. The editor
draws the chosen colour under it and multiplies the shading on top
(`components/Atelier/GarmentMockup2D.jsx`), so folds and seams read through any colour. It also writes
`lib/garment-mockups.json` (each image's size and where the garment sits in it), which `lib/garments.js`
reads, and a small picker thumbnail per garment in `public/mockups/thumbs`.
