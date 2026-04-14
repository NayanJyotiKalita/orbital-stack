const express = require("express");
const app = express();

app.get("/ready", (req, res) => res.send("READY"));
app.get("/health", (req, res) => res.send("ALIVE"));

app.post("/drain", (req, res) => {
  console.log("Draining OTA tasks...");
  setTimeout(() => {
    res.send("Drained");
  }, 3000);
});

app.listen(7070, () => {
  console.log("OTA Controller running on port 7070");
});