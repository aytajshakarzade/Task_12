const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDB } = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const supportRoutes = require("./routes/supportRoutes");

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/", (req, res) => {
    res.send("Server is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/support", supportRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});