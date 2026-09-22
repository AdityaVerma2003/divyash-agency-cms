import "dotenv/config";
import app from "./app";
import { startCron } from "./lib/cron";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`Divyash Agency API listening on http://localhost:${PORT}`);
  startCron();
});
