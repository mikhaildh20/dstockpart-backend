import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import lineRoutes from "./routes/line.routes.js";
import modelRoutes from "./routes/model.routes.js";
import partRoutes from "./routes/part.routes.js";
import sectionRoutes from "./routes/section.routes.js";
import planRoutes from "./routes/plan.routes.js";
import wipRoutes from "./routes/wip.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";


const app = express();

app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Connected to DStockPart API");
});

app.use("/api/auth", authRoutes);

app.use("/api/lines", lineRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/parts", partRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/wips", wipRoutes);
app.use("/api/dashboard", dashboardRoutes);

export default app;
