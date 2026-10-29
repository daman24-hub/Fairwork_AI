import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const port = Number(process.env.PORT || 5000);

try {
  await connectDB();
  app.listen(port, () => console.log(`FairWork API listening on port ${port}`));
} catch (error) {
  console.error("Could not start server:", error.message);
  process.exit(1);
}
