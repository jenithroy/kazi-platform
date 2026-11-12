// Mesh reduction shared by the import script and the model generator.

/**
 * Reduces a welded triangle mesh to about `triangles` triangles. Cloth-simulation exports (and the
 * marching-cubes meshes the generator makes) are far denser than a web page needs, and most of that
 * is flat cloth. Normals travel with the vertices so the shading of the quilting, folds and seams
 * survives; the vertices on open borders (hems, armholes, collars) are locked so the silhouette does
 * not shrink. `mesh` is { positions, normals, indices } as typed arrays; the result has the same shape
 * plus the `error` the reduction reached.
 */
export async function simplify(mesh, { triangles, error = 0.02, normalWeight = 1 }) {
  let MeshoptSimplifier;
  try {
    ({ MeshoptSimplifier } = await import("meshoptimizer"));
  } catch {
    throw new Error('"simplify" needs the meshoptimizer package (it comes with three.js\'s tooling; otherwise `npm i -D meshoptimizer`)');
  }
  await MeshoptSimplifier.ready;
  const positions = Float32Array.from(mesh.positions);
  const normals = Float32Array.from(mesh.normals);
  const indices = Uint32Array.from(mesh.indices);
  const weights = [normalWeight, normalWeight, normalWeight];
  const [count, achieved] = MeshoptSimplifier.simplifyWithUpdate(
    indices, positions, 3, normals, 3, weights, null, Math.min(indices.length, triangles * 3), error, ["LockBorder", "Prune"],
  );
  for (let i = 0; i < normals.length; i += 3) {
    const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= l; normals[i + 1] /= l; normals[i + 2] /= l;
  }
  return { positions, normals, indices: indices.slice(0, count), error: achieved };
}
