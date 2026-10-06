const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Notification = require("../models/notificationModel");
const { requireAuth, requireRole } = require("../middleware/auth");

// Plenty for a notification dropdown - this is a recent-activity feed, not
// a full history/audit log.
const NOTIFICATION_LIMIT = 50;

// List this company's notifications, newest first. companyId always comes
// from the verified JWT, never the request - same company-scoping pattern
// as every other list endpoint in this app (GET /ride, GET /driver, etc).
router.get("/", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  try {
    const notifications = await Notification.find({ companyId: req.user.companyId })
      .sort({ createdAt: -1 })
      .limit(NOTIFICATION_LIMIT);
    res.json(notifications);
  } catch (error) {
    res.status(500).send({ message: "Could not retrieve notifications" });
  }
});

router.patch("/:id/read", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid notification id" });
  }

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).send({ message: "Notification not found" });
    res.json(notification);
  } catch (error) {
    res.status(500).send({ message: "Could not update notification" });
  }
});

router.patch("/read-all", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  try {
    await Notification.updateMany({ companyId: req.user.companyId, isRead: false }, { isRead: true });
    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    res.status(500).send({ message: "Could not update notifications" });
  }
});

module.exports = router;
