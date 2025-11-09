require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
const path = require("path");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ===== DATABASE =====
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "chatapp"
};
let connection;
(async () => {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Verbonden met MySQL database");
  } catch (err) {
    console.error("❌ Database fout:", err);
  }
})();

// ===== MIDDLEWARE =====
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "geheimecode",
    resave: false,
    saveUninitialized: true,
  })
);

// ===== ROUTES =====
app.get("/", (req, res) => {
  if (req.session.username) return res.redirect("/chat.html");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await connection.execute("SELECT * FROM users WHERE username = ?", [username]);
    if (rows.length > 0) return res.send("<h3>Gebruikersnaam bestaat al. <a href='/'>Terug</a></h3>");
    const hashed = await bcrypt.hash(password, 10);
    await connection.execute("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashed]);
    req.session.username = username;
    res.redirect("/chat.html");
  } catch (err) {
    console.error("Registratiefout:", err);
    res.send("<h3>Fout bij registratie. <a href='/'>Terug</a></h3>");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await connection.execute("SELECT * FROM users WHERE username = ?", [username]);
    if (rows.length === 0) return res.send("<h3>Ongeldige login. <a href='/'>Terug</a></h3>");
    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.send("<h3>Onjuist wachtwoord. <a href='/'>Terug</a></h3>");
    req.session.username = username;
    res.redirect("/chat.html");
  } catch (err) {
    console.error("Loginfout:", err);
    res.send("<h3>Fout bij login. <a href='/'>Terug</a></h3>");
  }
});

app.get("/chat.html", (req, res) => {
  if (!req.session.username) return res.redirect("/");
  res.sendFile(path.join(__dirname, "public", "chat.html"));
});

app.get("/session-user", (req, res) => res.json({ username: req.session.username || null }));

app.get("/messages", async (req, res) => {
  try {
    const [rows] = await connection.execute(
      "SELECT username, message, DATE_FORMAT(time, '%H:%i:%s') as time FROM messages ORDER BY id ASC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Databasefout" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ===== SOCKET.IO =====
const onlineUsers = new Set();

io.on("connection", (socket) => {
  socket.on("join", (username) => {
    socket.username = username;
    onlineUsers.add(username);
    io.emit("chatMessage", {
      username: "Systeem",
      message: `${username} is de chat binnengekomen.`,
      time: new Date().toLocaleTimeString(),
    });
    io.emit("onlineUsers", Array.from(onlineUsers));
  });

  socket.on("chatMessage", async (msg) => {
    const time = new Date().toLocaleTimeString();

    try {
      await connection.execute(
        "INSERT INTO messages (username, message, time) VALUES (?, ?, NOW())",
        [socket.username, msg]
      );
    } catch (err) {
      console.error("Opslaan bericht fout:", err);
    }

    io.emit("chatMessage", { username: socket.username, message: msg, time });

    // ===== AI BOT FUNCTIE =====
    if (msg.toLowerCase().startsWith("@bot")) {
      const vraag = msg.replace("@bot", "").trim();
      if (vraag.length === 0) return;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Je bent een vriendelijke Nederlandse chatbot in een groepschat." },
            { role: "user", content: vraag },
          ],
        });

        const antwoord = completion.choices[0].message.content;

        io.emit("chatMessage", {
          username: "🤖 Bot",
          message: antwoord,
          time: new Date().toLocaleTimeString(),
        });
      } catch (error) {
        console.error("AI-fout:", error);
        io.emit("chatMessage", {
          username: "🤖 Bot",
          message: "Sorry, ik kon nu even geen antwoord geven.",
          time: new Date().toLocaleTimeString(),
        });
      }
    }
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      onlineUsers.delete(socket.username);
      io.emit("chatMessage", {
        username: "Systeem",
        message: `${socket.username} heeft de chat verlaten.`,
        time: new Date().toLocaleTimeString(),
      });
      io.emit("onlineUsers", Array.from(onlineUsers));
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 Server met AI draait op http://localhost:${PORT}`));
