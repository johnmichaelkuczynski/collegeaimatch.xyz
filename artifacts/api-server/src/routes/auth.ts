import { Router, type IRouter } from "express";
import passport from "../lib/passport";

const router: IRouter = Router();

// GET /api/auth/google — redirect to Google consent screen
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// GET /api/auth/google/callback — Google redirects here after login
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login?error=1" }),
  (req, res) => {
    // On success, send the user to the app root
    const base = process.env.BASE_URL ?? "/college-finder";
    res.redirect(base + "/");
  }
);

// GET /api/auth/me — returns current user or 401
router.get("/auth/me", (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(req.user);
});

// POST /api/auth/logout — destroys the session
router.post("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ ok: true });
  });
});

export default router;
