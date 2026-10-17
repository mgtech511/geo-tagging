const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'users.json');

const defaultUsers = {
    "admin": { 
        password: "admin@1", 
        status: "active", 
        expiry: "2029-12-31", 
        serialKey: "ADMINKEY", 
        isKeyUsed: true, 
        role: "admin",
        latLongPass: "123456",
        name: "Master Admin",
        mobile: "9999999999"
    }
};

function loadUsers() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, JSON.stringify(defaultUsers, null, 2));
            return defaultUsers;
        }
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(fileData);
    } catch (e) {
        return defaultUsers;
    }
}

function saveUsers(usersData) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(usersData, null, 2));
    } catch (e) {}
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

    if (!user) return res.json({ success: false, message: "User nahi mila!" });
    if (user.serialKey !== serialKey) return res.json({ success: false, message: "Galat Serial Key!" });
    if (user.isKeyUsed) return res.json({ success: false, message: "Serial Key pehle hi use ho chuki hai!" });

    user.isKeyUsed = true;
    saveUsers(usersDatabase);
    res.json({ success: true, message: "Serial Key verified successfully!" });
});

// 3. Admin: Create New User
app.post('/api/admin/create-user', (req, res) => {
    const { admin_pass, username, password, expiry, name, mobile } = req.body;
    if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

    const usersDatabase = loadUsers();
    if (usersDatabase[username]) return res.json({ success: false, message: "User pehle se maujud hai!" });

    const randomKey = Math.floor(1000000000 + Math.random() * 900000000).toString();
    const initialLatLongPass = generateOTP();

    usersDatabase[username] = {
        password: password || "12345",
        status: "active",
        expiry: expiry || "2026-12-31",
        serialKey: randomKey,
        isKeyUsed: false,
        role: "client",
        latLongPass: initialLatLongPass,
        name: name || "N/A",
        mobile: mobile || "N/A"
    };

    saveUsers(usersDatabase);
    res.json({ success: true, message: "User ban gaya!" });
});

// 4. Admin: Delete User API
app.post('/api/admin/delete-user', (req, res) => {
    const { admin_pass, username } = req.body;
    if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

    const usersDatabase = loadUsers();
    if (!usersDatabase[username]) return res.json({ success: false, message: "User nahi mila" });

    delete usersDatabase[username];
    saveUsers(usersDatabase);
    res.json({ success: true, message: "User delete ho gaya!" });
});

// 5. Admin Actions: Reset Password, Regenerate Serial, Regenerate OTP
app.post('/api/admin/action', (req, res) => {
    const { admin_pass, username, actionType } = req.body;
    if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

    const usersDatabase = loadUsers();
    const user = usersDatabase[username];
    if (!user) return res.json({ success: false, message: "User nahi mila" });

    if (actionType === 'reset_pass') {
        user.password = "12345";
    } else if (actionType === 'regen_serial') {
        user.serialKey = Math.floor(1000000000 + Math.random() * 900000000).toString();
        user.isKeyUsed = false;
    } else if (actionType === 'regen_otp') {
        user.latLongPass = generateOTP();
    }

    saveUsers(usersDatabase);
    res.json({ success: true, message: "Action successful!" });
});

// 6. Verify & Regenerate Lat/Long Password
app.post('/api/verify-latlong-pass', (req, res) => {
    const { username, pass } = req.body;
    const usersDatabase = loadUsers();
    const user = usersDatabase[username];

    if (!user) return res.json({ success: false, message: "User nahi mila" });

    if (user.latLongPass === pass) {
        user.latLongPass = generateOTP();
        saveUsers(usersDatabase);
        return res.json({ success: true, message: "Password Verified! New OTP Generated." });
    } else {
        return res.json({ success: false, message: "Galat Lat/Long Password!" });
    }
});

// 7. Change Password API
app.post('/api/change-password', (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    const usersDatabase = loadUsers();
    const user = usersDatabase[username];

    if (!user || user.password !== oldPassword) {
        return res.json({ success: false, message: "Purana Password Galat Hai!" });
    }

    user.password = newPassword;
    saveUsers(usersDatabase);
    res.json({ success: true, message: "Password kamyabi se badal gaya!" });
});

// 8. Admin: Update Status / Expiry / Get Users
app.post('/api/admin/update-status', (req, res) => {
    const { admin_pass, username, status } = req.body;
    if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

    const usersDatabase = loadUsers();
    if (usersDatabase[username]) {
        usersDatabase[username].status = status;
        saveUsers(usersDatabase);
    }
    res.json({ success: true });
});

app.post('/api/admin/update-expiry', (req, res) => {
    const { admin_pass, username, expiry } = req.body;
    if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

    const usersDatabase = loadUsers();
    if (usersDatabase[username]) {
        usersDatabase[username].expiry = expiry;
        saveUsers(usersDatabase);
    }
    res.json({ success: true });
});

app.get('/api/admin/get-users', (req, res) => {
    res.json(loadUsers());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
