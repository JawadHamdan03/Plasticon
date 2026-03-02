import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes"
dotenv.config();

const app = express();

app.use(express.json());


app.use("/auth", authRoutes);
app.use("/users", userRoutes);

app.listen(5000, () => console.log("server is running on port 5000"));