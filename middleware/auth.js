const adminAuth = (req, res, next) => {
  const adminKey =
    req.headers["x-admin-key"] ||
    req.headers["authorization"]?.replace("Bearer ", "");
  const expectedAdminKey = process.env.ADMIN_SECRET_KEY || "default_admin_key";

  if (!adminKey) {
    return res.status(401).json({
      status: "error",
      message:
        "Admin authentication required. Please provide x-admin-key header or Authorization header with Bearer token.",
    });
  }

  if (adminKey !== expectedAdminKey) {
    return res.status(403).json({
      status: "error",
      message: "Invalid admin credentials",
    });
  }

  req.isAdmin = true;
  next();
};

module.exports = { adminAuth };
