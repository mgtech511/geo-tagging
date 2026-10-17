const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'users.json');

// Initial default users
const defaultUsers = {
    "admin": { password: "admin@1", status: "active", expiry: "2029-12-31", serialKey: "ADMINKEY", isKeyUsed: true, role: "admin" }
};

// Helper function to load users from file
function loadUsers() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, JSON.stringify(defaultUsers, null, 2));
            return defaultUsers;
        }
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(fileData);
    } catch (e) {
        console.error("Error reading users file:", e);
        return defaultUsers;
    }
}

// Helper function to save users to file
function saveUsers(usersData) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(usersData, null, 2));
    } catch (e) {
        console.error("Error saving users file:", e);
    }
}

// 1. Login API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const usersDatabase = loadUsers();
    const user = usersDatabase[username];

    if (!user || user.password !== password) {
        return res.json({ success: false, message: "Galat Username ya Password!" });
    }

    if (user.status === 'deactive') {
        return res.json({ success: false, message: "Yeh account deactive hai!" });
    }

    if (user.expiry && new Date() > new Date(user.expiry)) {
        return res.json({ success: false, message: "Aapka license expire ho chuka hai!" });
    }

    res.json({ success: true, role: user.role, expiry: user.expiry });
});

// 2. Verify Serial Key API
app.post('/api/verify-serial', (req, res) => {
    const { username, serialKey } = req.body;
    const usersDatabase = loadUsers();
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
    saveUsers(usersDatabase);
    res.json({ success: true, message: "Serial Key verified successfully!" });
});

// 3. Admin: Create New User
app.post('/api/admin/create-user', (req, res) => {
    const { admin_pass, username, password, expiry } = req.body;
    if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

    const usersDatabase = loadUsers();

    if (usersDatabase[username]) {
        return res.json({ success: false, message: "User pehle se maujud hai!" });
    }

    const randomKey = Math.floor(1000000000 + Math.random() * 900000000).toString();

    usersDatabase[username] = {
        password: password || "12345",
        status: "active", // Default active
        expiry: expiry || "2026-12-31",
        serialKey: randomKey,
        isKeyUsed: false,
        role: "client"
    };

    saveUsers(usersDatabase);
    res.json({ success: true, serialKey: randomKey, message: "User ban gaya!" });
});

// 4. Admin: Update Status (Active/Deactive)
app.post('/api/admin/update-status', (req, res) => {
    const { admin_pass, username, status } = req.body;
    if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

    const usersDatabase = loadUsers();
    if (!usersDatabase[username]) return res.json({ success: false, message: "User nahi mila" });

    usersDatabase[username].status = status;
    saveUsers(usersDatabase);
    res.json({ success: true, message: `Status updated to ${status}` });
});

// 5. Admin: Update Expiry Date
app.post('/api/admin/update-expiry', (req, res) => {
    const { admin_pass, username, expiry } = req.body;
    if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

    const usersDatabase = loadUsers();
    if (!usersDatabase[username]) return res.json({ success: false, message: "User nahi mila" });

    usersDatabase[username].expiry = expiry;
    saveUsers(usersDatabase);
    res.json({ success: true, message: `Expiry updated to ${expiry}` });
});

// 6. Get All Users for Admin Panel
app.get('/api/admin/get-users', (req, res) => {
    const usersDatabase = loadUsers();
    res.json(usersDatabase);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
