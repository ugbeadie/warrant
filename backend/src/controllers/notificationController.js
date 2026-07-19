import prisma from "../config/prisma.js";

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You cannot modify another user's notification" });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });

    res.status(200).json({ message: "Marked as read", notification: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const setReadStatus = async (req, res) => {
  try {
    const { read } = req.body;

    if (typeof read !== "boolean") {
      return res.status(400).json({ message: "'read' must be a boolean" });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You cannot modify another user's notification" });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read },
    });

    res.status(200).json({
      message: read ? "Marked as read" : "Marked as unread",
      notification: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getMyNotifications, markAsRead, markAllAsRead, setReadStatus };
