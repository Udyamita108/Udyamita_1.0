require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 5000;
const CLIENT_URL = "http://localhost:8080"; // Your frontend URL

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
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
      callbackURL: "http://localhost:5000/auth/github/callback",
      scope: ["user", "repo"] // Add necessary scopes
    },
    function (accessToken, refreshToken, profile, done) {
      // Store access token with the profile
      profile.accessToken = accessToken;
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
app.get("/auth/github", 
  passport.authenticate("github", { scope: ["user", "repo"] })
);

// GitHub OAuth Callback Route
app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: `${CLIENT_URL}/login` }),
  (req, res) => {
    // Redirect with user data in the URL
    res.redirect(`${CLIENT_URL}/dashboard?user=${encodeURIComponent(JSON.stringify(req.user))}`);
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
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});