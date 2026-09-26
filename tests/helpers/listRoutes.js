// Lists every route registered on an Express 4 app as "METHOD /path", with
// Express `:param` segments written OpenAPI-style as `{param}`.

// Express 4 keeps a mounted router's path only as a regexp, e.g.
// /^\/api\/ratings\/?(?=\/|$)/i for app.use("/api/ratings", router).
const mountPath = (layer) => {
  if (layer.regexp.fast_slash) {
    return "";
  }
  const path = layer.regexp.source
    .replace(/^\^/, "")
    .replace("\\/?(?=\\/|$)", "")
    .replace(/\\\//g, "/");

  if (/[\\^$()[\]*+?|]/.test(path)) {
    throw new Error(`Can't read mount path from ${layer.regexp}`);
  }
  return path;
};

const normalize = (path) =>
  (path.replace(/\/+$/, "") || "/").replace(/:(\w+)/g, "{$1}");

const collect = (stack, prefix, routes) => {
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).filter(
        (method) => method !== "_all"
      );
      for (const method of methods) {
        routes.push(
          `${method.toUpperCase()} ${normalize(prefix + layer.route.path)}`
        );
      }
    } else if (layer.name === "router" && layer.handle.stack) {
      collect(layer.handle.stack, prefix + mountPath(layer), routes);
    }
  }
  return routes;
};

const listRoutes = (app) => [...new Set(collect(app._router.stack, "", []))].sort();

// Same format from openapi.json.
const listSpecRoutes = (spec) =>
  Object.entries(spec.paths)
    .flatMap(([path, operations]) =>
      Object.keys(operations).map(
        (method) => `${method.toUpperCase()} ${normalize(path)}`
      )
    )
    .sort();

module.exports = { listRoutes, listSpecRoutes };
