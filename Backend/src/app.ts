import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes"
dotenv.config();
const PORT = Number(process.env.PORT) || 8080


const app = express();

app.use(express.json());


app.use("/auth", authRoutes);
app.use("/users", userRoutes);

app.listen(PORT, () => console.log(`server is running on port ${PORT}`));