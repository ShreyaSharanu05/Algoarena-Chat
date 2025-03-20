const express = require("express");
const FullRoute = require("./routes/index");
const cors = require("cors");
const setupSocket = require("./socket");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",  // Allow local development
  "https://algoarena-frotend.onrender.com"  // Allow deployed frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  allowedHeaders: ["Authorization", "Content-Type"]
}));

app.use(express.json());
app.use("/api", FullRoute);

const server = app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

setupSocket(server);

