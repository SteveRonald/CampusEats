export function getPublicContactInfo(_req, res) {
  res.json({
    supportEmail: process.env.SUPPORT_EMAIL || "support@campuseats.co.ke",
    supportPhone: process.env.SUPPORT_PHONE || "+254700000000",
    supportHours: process.env.SUPPORT_HOURS || "Monday to Sunday, 7:00 AM to 10:00 PM"
  });
}
