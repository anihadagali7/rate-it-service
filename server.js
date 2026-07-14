const app = require("./app");
require("./configuration/mongoDbConnection");

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Application Started on PORT ${PORT}`);
});
