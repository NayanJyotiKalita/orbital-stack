const express = require("express");
const app = express();

app.get("/health/ready", (req, res) => res.send("READY"));
app.get("/health/live", (req, res) => res.send("ALIVE"));

app.get("/api/v1/test", (req, res) => {
  res.json({ message: "Device API working" });
});

app.listen(9000, () => {
  console.log("Device API running on port 9000");
});