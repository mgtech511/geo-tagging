const express = require('express');
const app = express();
app.use(express.json());

// Server par users ka data store karne ke liye (Aap ise database se bhi jod sakte hain)
let usersDatabase = {
    "user1": { status: "active", version: "1.0.0", expiry: "2026-12-31" },
    "user2": { status: "active", version: "1.0.0", expiry: "2026-12-31" }
};

const LATEST_VERSION = "1.0.1";
const DOWNLOAD_URL = "https://mgtechsolution.in.net/downloads/latest-app.apk";

// 1. App dwara status check karne ke liye API
app.get('/api/check-status', (req, res) => {
    const deviceId = req.query.device_id;
    const user = usersDatabase[deviceId];

    if (!user) {
        // Agar user server par nahi hai, toh default active ya block set kar sakte hain
        return res.json({ 
            deviceId: deviceId, 
            status: "active", 
            updateAvailable: false,
            latestVersion: LATEST_VERSION,
            downloadUrl: DOWNLOAD_URL 
        });
    }

    res.json({
        deviceId: deviceId,
        status: user.status, // "active" ya "deactive"
        expiry: user.expiry,
        updateAvailable: user.version !== LATEST_VERSION,
        latestVersion: LATEST_VERSION,
        downloadUrl: DOWNLOAD_URL
    });
});

// 2. Admin dwara kahin se bhi user ko Active/Deactive karne ke liye API
app.post('/api/update-status', (req, res) => {
    const { admin_pass, device_id, status } = req.body;

    // Security check for admin
    if (admin_pass !== "admin@1") {
        return res.status(401).json({ success: false, message: "Unauthorized Admin Password" });
    }

    if (!usersDatabase[device_id]) {
        usersDatabase[device_id] = { status: "active", version: "1.0.0", expiry: "2026-12-31" };
    }

    usersDatabase[device_id].status = status; // "active" or "deactive"
    res.json({ success: true, message: `Device ${device_id} status updated to ${status}` });
});

// Server Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`MG Tech Server running on port ${PORT}`);
});