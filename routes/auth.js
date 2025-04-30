const express = require("express");
const passport = require("passport");
const router = express.Router();

// مسار تسجيل الدخول عبر ديسكورد
router.get("/discord", passport.authenticate("discord"));

// المسار الذي يتم الوصول إليه بعد المصادقة عبر ديسكورد
router.get(
  "/discord/callback",
  passport.authenticate("discord", {
    failureRedirect: `${process.env.SERVER_URL}/login`, // استخدام SERVER_URL من env
    successRedirect: `${process.env.SERVER_URL}/profile`, // استخدام SERVER_URL من env
  })
);

// مسار تسجيل الخروج
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send("حدث خطأ أثناء تسجيل الخروج.");
    }
    res.redirect(process.env.SERVER_URL || "http://localhost:3000"); // إعادة توجيه للموقع الذي تم تحديده في البيئة
  });
});

module.exports = router;