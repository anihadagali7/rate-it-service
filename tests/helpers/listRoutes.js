// Lists every route registered on the Express app as "METHOD /path", with
// Express `:param` segments written OpenAPI-style as `{param}`.
//
// Express 5 (router 2.x) doesn't keep a mounted router's path on its layer; it
// only lives inside a matcher closure. So `loadApp()` builds a fresh copy of the
// app with `Router.prototype.use` wrapped to record each mount path as it's
// registered. Test-only; the real app is untouched.

const recordMountPaths = (Router) => {
  const originalUse = Router.prototype.use;

  Router.prototype.use = function use(...args) {
    const path = typeof args[0] === "string" ? args[0] : "/";
    for (const handler of args.flat(Infinity)) {
      if (typeof handler === "function" && Array.isArray(handler.stack)) {
        handler.mountPaths = [...(handler.mountPaths || []), path];
      }
    }
    return originalUse.apply(this, args);
  };
};

const loadApp = () => {
  let app;
  jest.isolateModules(() => {
    recordMountPaths(require("router"));
    app = require("../../app");
  });
  return app;
};

const normalize = (path) =>
  (path.replace(/\/+/g, "/").replace(/\/+$/, "") || "/").replace(
    /:(\w+)/g,
    "{$1}"
  );

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
    } else if (Array.isArray(layer.handle.stack)) {
      if (!layer.handle.mountPaths) {
        throw new Error(
          "Mounted router has no recorded path. Build the app with loadApp()."
        );
      }
      for (const mountPath of layer.handle.mountPaths) {
        const path = mountPath === "/" ? "" : mountPath;
        collect(layer.handle.stack, prefix + path, routes);
      }
    }
  }
  return routes;
};

// `app` must come from loadApp().
const listRoutes = (app) =>
  [...new Set(collect(app.router.stack, "", []))].sort();

// Same format from openapi.json.
const listSpecRoutes = (spec) =>
  Object.entries(spec.paths)
    .flatMap(([path, operations]) =>
      Object.keys(operations).map(
        (method) => `${method.toUpperCase()} ${normalize(path)}`
      )
    )
    .sort();

module.exports = { loadApp, listRoutes, listSpecRoutes };
