const OpenAPIResponseValidator =
  require("openapi-response-validator").default;
const spec = require("../../openapi.json");

// Match concrete paths like /api/ratings/user/ani to spec templates like
// /api/ratings/user/{userName}. Literal segments win over `{param}` ones.
const templates = Object.keys(spec.paths)
  .map((template) => ({ template, segments: template.split("/") }))
  .sort(
    (a, b) =>
      b.segments.filter((s) => !s.startsWith("{")).length -
      a.segments.filter((s) => !s.startsWith("{")).length
  );

const findOperation = (method, path) => {
  const segments = path.replace(/\/+$/, "").split("/");
  const match = templates.find(
    ({ segments: templateSegments }) =>
      templateSegments.length === segments.length &&
      templateSegments.every(
        (segment, i) =>
          (segment.startsWith("{") && segments[i] !== "") ||
          segment === segments[i]
      )
  );

  if (!match) {
    return { error: `no path in openapi.json matches ${path}` };
  }

  const operation = spec.paths[match.template][method.toLowerCase()];
  if (!operation) {
    return {
      error: `${match.template} in openapi.json has no ${method.toUpperCase()} operation`,
    };
  }

  return { template: match.template, operation };
};

// openapi-response-validator resolves $refs inside schemas, but not a whole
// response that points at #/components/responses/<Name>.
const resolveResponseRefs = (responses) =>
  Object.fromEntries(
    Object.entries(responses).map(([status, response]) => {
      const ref = response.$ref;
      if (!ref) {
        return [status, response];
      }
      const name = ref.replace("#/components/responses/", "");
      if (!spec.components.responses?.[name]) {
        throw new Error(`openapi.json: unresolved response $ref ${ref}`);
      }
      return [status, spec.components.responses[name]];
    })
  );

/**
 * expect(supertestResponse).toSatisfyApiSpec()
 *
 * Fails if the request's method + path isn't in openapi.json, the status code
 * isn't documented for it, or the body doesn't match the documented schema.
 */
expect.extend({
  toSatisfyApiSpec(response) {
    const method = response.req.method;
    const path = response.req.path.split("?")[0];
    const label = `${method} ${path} → ${response.status}`;

    const { template, operation, error } = findOperation(method, path);
    if (error) {
      return { pass: false, message: () => `${label}: ${error}` };
    }

    const validator = new OpenAPIResponseValidator({
      responses: resolveResponseRefs(operation.responses),
      components: spec.components,
    });
    const result = validator.validateResponse(response.status, response.body);

    if (result) {
      return {
        pass: false,
        message: () =>
          `${label} does not match openapi.json (${method} ${template}):\n` +
          `${JSON.stringify(result.errors || result, null, 2)}\n` +
          `Body: ${JSON.stringify(response.body, null, 2)}`,
      };
    }

    return {
      pass: true,
      message: () => `${label} matches openapi.json, but expected it not to`,
    };
  },
});
