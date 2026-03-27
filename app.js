import express from "express";
import cors from "cors";
import lineRoutes from "./routes/line.routes.js";
import modelRoutes from "./routes/model.routes.js";
import partRoutes from "./routes/part.routes.js";
import mpdetailRoutes from "./routes/mpdetail.routes.js";
import sectionRoutes from "./routes/section.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Connected to DStockPart API");
});

app.use("/api/lines", lineRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/parts", partRoutes);
app.use("/api/mpdetails", mpdetailRoutes);
app.use("/api/sections", sectionRoutes);

export default app;