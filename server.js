const express = require('express');
const app = express();
app.use(express.json());

let usersDatabase = {
    "admin": { password: "admin@1", status: "active", expiry: "2029-12-31", serialKey: "ADMINKEY", isKeyUsed: true, role: "admin" }
};

// 1. Login API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = usersDatabase[username];

    if (!user || user.password !== password) {
        return.json({ success: false, message: "Galat Username ya Password!" });
    }

    if (user.status === 'deactive') {
        return.json({ success: false, message: "Yeh account deactive hai!" });
    }

    if (user.expiry && new Date() > new Date(user.expiry)) {
        return.json({ success: false, message: "Aapka license expire ho chuka hai!" });
    }

    res.json({ success: true, role: user.role, expiry: user.expiry });
});

// 2. Verify Serial Key API (Only for clients on first login)
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
        status: "deactive",
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

    usersDatabase[username].status = status;
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

// 6. Get All Users for Admin Panel
app.get('/api/admin/get-users', (req, res) => {
    res.json(usersDatabase);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
