const express = require('express');
const app = express();
app.use(express.json());

// Cloud Database (Memory Store for Users)
let usersDatabase = {
    "admin": { password: "admin@1", status: "active", expiry: "2029-12-31", serialKey: "ADMINKEY00", isKeyUsed: true, role: "admin" }
};

const LATEST_VERSION = "1.0.1";
const DOWNLOAD_URL = "https://mgtechsolution.in.net/downloads/latest-app.apk";

// 1. Check Status & Expiry API
app.get('/api/check-status', (req, res) => {
    const deviceId = req.query.device_id;
    const user = usersDatabase[deviceId];

    if (!user) {
        return res.json({ status: "not_found", updateAvailable: false });
    }

    // Expiry check
    if (user.expiry) {
        const expiryDate = new Date(user.expiry);
        if (new Date() > expiryDate) {
            return res.json({ status: "expired", expiry: user.expiry });
        }
    }

    res.json({
        deviceId: deviceId,
        status: user.status, // "active" or "deactive"
        expiry: user.expiry,
        updateAvailable: user.version !== LATEST_VERSION,
        latestVersion: LATEST_VERSION,
        downloadUrl: DOWNLOAD_URL
    });
});

// 2. Verify Serial Key API (First time install)
app.post('/api/verify-serial', (req, res) => {
    const { username, serialKey } = req.body;
    const user = usersDatabase[username];

    if (!user) {
        return res.json({ success: false, message: "User nahi mila!" });
    }

    if (user.serialKey !== serialKey) {
        return res.json({ success: false, message: "Galat Serial Key!" });
    }

    if (user.isKeyUsed) {
        return res.json({ success: false, message: "Serial Key pehle hi use ho chuki hai!" });
    }

    user.isKeyUsed = true;
    res.json({ success: true, message: "Serial Key verified successfully!" });
});

// 3. Admin: Create New User
app.post('/api/admin/create-user', (req, res) => {
    const { admin_pass, username, password, expiry } = req.body;
    if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

    if (usersDatabase[username]) {
        return res.json({ success: false, message: "User pehle se maujud hai!" });
    }

    const randomKey = Math.floor(1000000000 + Math.random() * 900000000).toString();

    usersDatabase[username] = {
        password: password || "12345",
        status: "deactive", // Default deactive
        expiry: expiry || "2026-12-31",
        serialKey: randomKey,
        isKeyUsed: false,
        role: "client"
    };

    res.json({ success: true, serialKey: randomKey, message: "User ban gaya!" });
});

// 4. Admin: Update Status (Active/Deactive)
app.post('/api/admin/update-status', (req, res) => {
    const { admin_pass, username, status } = req.body;
    if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!usersDatabase[username]) return res.json({ success: false, message: "User nahi mila" });

    usersDatabase[username].status = status; // "active" or "deactive"
    res.json({ success: true, message: `Status updated to ${status}` });
});

// 5. Admin: Update Expiry Date
app.post('/api/admin/update-expiry', (req, res) => {
    const { admin_pass, username, expiry } = req.body;
    if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!usersDatabase[username]) return res.json({ success: false, message: "User nahi mila" });

    usersDatabase[username].expiry = expiry;
    res.json({ success: true, message: `Expiry updated to ${expiry}` });
});

// 6. Get All Users for Admin
app.get('/api/admin/get-users', (req, res) => {
    res.json(usersDatabase);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Cloud Server running on port ${PORT}`);
});
