require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({ origin: "http://localhost:8080", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret", // Use a fallback for debugging
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// GitHub OAuth Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "http://localhost:8080/auth/github/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      console.log("GitHub Profile Data:", profile); // Debugging
      profile.accessToken = accessToken; // Store token in session
      return done(null, profile);
    }
  )
);

// Serialize & Deserialize User
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Routes
app.get("/", (req, res) => {
  res.send("🚀 GitHub OAuth Server is Running!");
});

// GitHub OAuth Login Route
app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));

// GitHub OAuth Callback Route
app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "http://localhost:8080", }),
  (req, res) => {
    console.log("Authenticated User:", req.user); // Debugging
    res.redirect(`http://localhost:8080/dashboard?user=${encodeURIComponent(JSON.stringify(req.user))}`);
  }
);

// Get Authenticated User Info
app.get("/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: "User not authenticated" });
  }
});

// Logout Route
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie("connect.sid"); // Clear session cookie
      res.redirect("http://localhost:8080");
    });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
