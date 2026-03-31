import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import path from "path";
import { initializeSocketServer } from "./config/socket";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes"
import settingsRoutes from "./routes/settingsRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import productionRoutes from "./routes/productionRoutes";
import maintenanceRoutes from "./routes/maintenanceRoutes";
import qualityRoutes from "./routes/qualityRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import purchaseRoutes from "./routes/purchaseRoutes";
import saleRoutes from "./routes/saleRoutes";
import reportRoutes from "./routes/reportRoutes";
import chatRoutes from "./routes/chatRoutes";
import auditRoutes from "./routes/auditRoutes";

dotenv.config();
const PORT = Number(process.env.PORT) || 8080


const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from prisma/pictures
app.use('/pictures', express.static(path.join(process.cwd(), 'prisma', 'pictures')));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/settings", settingsRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/production", productionRoutes);
app.use("/maintenance", maintenanceRoutes);
app.use("/quality-checks", qualityRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/purchases", purchaseRoutes);
app.use("/sales", saleRoutes);
app.use("/reports", reportRoutes);
app.use("/chat", chatRoutes);
app.use("/audit", auditRoutes);

initializeSocketServer(server);

let hasRetriedPortBind = false;

server.on("error", (error: NodeJS.ErrnoException) => {
	if (error.code === "EADDRINUSE" && !hasRetriedPortBind) {
		hasRetriedPortBind = true;
		console.warn(`port ${PORT} is busy, retrying once...`);
		setTimeout(() => {
			server.listen(PORT);
		}, 1000);
		return;
	}

	console.error("server startup error:", error);
	process.exit(1);
});

server.listen(PORT, () => console.log(`server is running on port ${PORT}`));