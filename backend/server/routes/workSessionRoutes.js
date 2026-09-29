const express = require("express");
const router = express.Router();
const WorkSession = require("../models/workSessionModel");
const { requireAuth, requireRole } = require("../middleware/auth");

const SESSION_HISTORY_DAYS = 30;
const COMPANY_HISTORY_DAYS = 60;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// Punch in/out is dispatcher-only - a Manager viewing the Dispatcher portal
// is not an hourly employee being time-tracked, they're just viewing it.
router.post("/punch-in", requireAuth, requireRole("dispatcher"), async (req, res) => {
  try {
    const openSession = await WorkSession.findOne({ user: req.user.id, punchOut: null });
    if (openSession) return res.status(409).send({ message: "Already clocked in" });

    const punchIn = new Date();
    const session = new WorkSession({
      user: req.user.id,
      companyId: req.user.companyId,
      companyName: req.user.companyName,
      companySlug: req.user.companySlug,
      punchIn,
      date: startOfDay(punchIn),
    });
    const saved = await session.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).send({ message: "Could not punch in" });
  }
});

router.post("/punch-out", requireAuth, requireRole("dispatcher"), async (req, res) => {
  try {
    const openSession = await WorkSession.findOne({ user: req.user.id, punchOut: null });
    if (!openSession) return res.status(409).send({ message: "Not currently clocked in" });

    const punchOut = new Date();
    openSession.punchOut = punchOut;
    openSession.durationMinutes = Math.round((punchOut.getTime() - openSession.punchIn.getTime()) / 60000);
    const saved = await openSession.save();
    res.json(saved);
  } catch (err) {
    res.status(500).send({ message: "Could not punch out" });
  }
});

// The frontend always recomputes elapsed time from openSession.punchIn - a
// page refresh just re-fetches this and the timer picks up correctly.
router.get("/me", requireAuth, requireRole("dispatcher"), async (req, res) => {
  try {
    const openSession = await WorkSession.findOne({ user: req.user.id, punchOut: null });
    const sessions = await WorkSession.find({
      user: req.user.id,
      punchOut: { $ne: null },
      date: { $gte: startOfDay(daysAgo(SESSION_HISTORY_DAYS)) },
    }).sort({ punchIn: -1 });
    res.json({ openSession, sessions });
  } catch (err) {
    res.status(500).send({ message: "Could not retrieve work sessions" });
  }
});

router.get("/company", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const sessions = await WorkSession.find({
      companyId: req.user.companyId,
      date: { $gte: startOfDay(daysAgo(COMPANY_HISTORY_DAYS)) },
    })
      .populate("user", "fullName email")
      .sort({ punchIn: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).send({ message: "Could not retrieve company work sessions" });
  }
});

module.exports = router;
