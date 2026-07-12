const { createApp } = require("./app");
const { env } = require("./env");
const { schedulePurge } = require("./jobs/purge");
const { scheduleMonthlyReports } = require("./jobs/reports");

const app = createApp();

app.listen(env.port, () => {
  console.log(`\n  Sello API  ->  http://localhost:${env.port}`);
  console.log(`  Salud      ->  http://localhost:${env.port}/api/health\n`);
  schedulePurge(); // job de depuracion diaria
  scheduleMonthlyReports(); // reportes mensuales por marca
});
