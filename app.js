import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// routes
app.get("/", (req, res) => {
  res.send("API jalan bro");
});

export default app;