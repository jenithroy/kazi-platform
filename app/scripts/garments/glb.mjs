// Minimal binary glTF (.glb) writer: one node, one mesh, one material. That is all the Design
// page's viewer needs (it finds the first mesh, tints its material and stamps decals on it).

function pad4(buffer, fill = 0) {
  const rem = buffer.length % 4;
  return rem === 0 ? buffer : Buffer.concat([buffer, Buffer.alloc(4 - rem, fill)]);
}

/**
 * @param {object} mesh  { positions, normals, uvs, indices, min, max } as typed arrays
 * @param {object} opts  { name, colors?: Float32Array (RGB per vertex, optional),
 *                         copyright?: string (credit line, stored in the file's asset block) }
 */
export function writeGlb(mesh, { name, colors, copyright } = {}) {
  const { positions, normals, uvs, indices, min, max } = mesh;
  const chunks = [];
  const views = [];
  const accessors = [];

  function addView(array, target) {
    const buf = pad4(Buffer.from(array.buffer, array.byteOffset, array.byteLength));
    const byteOffset = chunks.reduce((n, c) => n + c.length, 0);
    chunks.push(buf);
    views.push({ buffer: 0, byteOffset, byteLength: array.byteLength, ...(target ? { target } : {}) });
    return views.length - 1;
  }
  function addAccessor(view, componentType, count, type, extra = {}) {
    accessors.push({ bufferView: view, componentType, count, type, ...extra });
    return accessors.length - 1;
  }

  const FLOAT = 5126;
  const attributes = {
    POSITION: addAccessor(addView(positions, 34962), FLOAT, positions.length / 3, "VEC3", { min, max }),
    NORMAL: addAccessor(addView(normals, 34962), FLOAT, normals.length / 3, "VEC3"),
    TEXCOORD_0: addAccessor(addView(uvs, 34962), FLOAT, uvs.length / 2, "VEC2"),
  };
  if (colors) attributes.COLOR_0 = addAccessor(addView(colors, 34962), FLOAT, colors.length / 3, "VEC3");

  // 16-bit indices when they fit: smaller download for the garment picker.
  const small = positions.length / 3 < 65535;
  const indexArray = small ? Uint16Array.from(indices) : indices;
  const indexAccessor = addAccessor(addView(indexArray, 34963), small ? 5123 : 5125, indices.length, "SCALAR");

  const json = {
    asset: {
      version: "2.0",
      generator: "kazi garment scripts (app/scripts/garments)",
      ...(copyright ? { copyright } : {}),
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives: [{ attributes, indices: indexAccessor, material: 0 }] }],
    materials: [
      {
        name: `${name}-neutral`,
        doubleSided: true,
        pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.8 },
      },
    ],
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: chunks.reduce((n, c) => n + c.length, 0) }],
  };

  const jsonChunk = pad4(Buffer.from(JSON.stringify(json)), 0x20);
  const binChunk = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // "BIN\0"
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
}
