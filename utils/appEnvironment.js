const APP_ENVIRONMENTS = ["dev", "prod", "test"];

// Only known names are reported, so the public health check never echoes
// arbitrary config values.
const getAppEnvironment = (value = process.env.APP_ENV) =>
  APP_ENVIRONMENTS.includes(value) ? value : "unknown";

module.exports = {
  APP_ENVIRONMENTS,
  getAppEnvironment,
};
