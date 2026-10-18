const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB Connection URI (Provided by you)
const MONGO_URI = "mongodb+srv://admin:admin123@mgtech.kpluc1a.mongodb.net/gps_database?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB Atlas Successfully! 🚀");
}).catch((err) => {
    console.error("MongoDB Connection Error:", err);
});

// Mongoose User Schema & Model
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, default: "12345" },
    status: { type: String, default: "active" },
    expiry: { type: String, default: "2026-12-31" },
    serialKey: { type: String },
    isKeyUsed: { type: Boolean, default: false },
    role: { type: String, default: "client" },
    latLongPass: { type: String },
    name: { type: String, default: "N/A" },
    mobile: { type: String, default: "N/A" }
});

const User = mongoose.model('User', userSchema);

// Initialize Default Admin if not exists
async function initAdmin() {
    try {
        let admin = await User.findOne({ username: 'admin' });
        if (!admin) {
            await User.create({
                username: "admin",
                password: "admin@1",
                status: "active",
                expiry: "2029-12-31",
                serialKey: "ADMINKEY",
                isKeyUsed: true,
                role: "admin",
                latLongPass: "123456",
                name: "Master Admin",
                mobile: "9999999999"
            });
            console.log("Default Admin Created in MongoDB!");
        }
    } catch (e) {
        console.log("Error initializing admin:", e);
    }
}
initAdmin();

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Default Root Route
app.get('/', (req, res) => {
    res.send("MGTech GPS MongoDB Cloud Server is Running Live 🚀");
});

// 1. Login API
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

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
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 2. Get Users Route
app.get('/api/admin/get-users', async (req, res) => {
    try {
        const users = await User.find({});
        let usersMap = {};
        users.forEach(u => {
            usersMap[u.username] = {
                password: u.password,
                status: u.status,
                expiry: u.expiry,
                serialKey: u.serialKey,
                isKeyUsed: u.isKeyUsed,
                role: u.role,
                latLongPass: u.latLongPass,
                name: u.name,
                mobile: u.mobile
            };
        });
        res.json(usersMap);
    } catch (e) {
        res.status(500).json({});
    }
});

// 3. Verify Serial Key API
app.post('/api/verify-serial', async (req, res) => {
    try {
        const { username, serialKey } = req.body;
        const user = await User.findOne({ username });

        if (!user) return res.json({ success: false, message: "User nahi mila!" });
        if (user.serialKey !== serialKey) return res.json({ success: false, message: "Galat Serial Key!" });
        if (user.isKeyUsed) return res.json({ success: false, message: "Serial Key pehle hi use ho chuki hai!" });

        user.isKeyUsed = true;
        await user.save();
        res.json({ success: true, message: "Serial Key verified successfully!" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 4. Admin: Create New User
app.post('/api/admin/create-user', async (req, res) => {
    try {
        const { admin_pass, username, password, expiry, name, mobile } = req.body;
        if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

        const existingUser = await User.findOne({ username });
        if (existingUser) return res.json({ success: false, message: "User pehle se maujud hai!" });

        const randomKey = Math.floor(1000000000 + Math.random() * 900000000).toString();
        const initialLatLongPass = generateOTP();

        await User.create({
            username,
            password: password || "12345",
            status: "active",
            expiry: expiry || "2026-12-31",
            serialKey: randomKey,
            isKeyUsed: false,
            role: "client",
            latLongPass: initialLatLongPass,
            name: name || "N/A",
            mobile: mobile || "N/A"
        });

        res.json({ success: true, message: "User ban gaya!" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 5. Admin Actions
app.post('/api/admin/action', async (req, res) => {
    try {
        const { admin_pass, username, actionType } = req.body;
        if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

        const user = await User.findOne({ username });
        if (!user) return res.json({ success: false, message: "User nahi mila" });

        if (actionType === 'reset_pass') {
            user.password = "12345";
        } else if (actionType === 'regen_serial') {
            user.serialKey = Math.floor(1000000000 + Math.random() * 900000000).toString();
            user.isKeyUsed = false;
        } else if (actionType === 'regen_otp') {
            user.latLongPass = generateOTP();
        }

        await user.save();
        res.json({ success: true, message: "Action successful!" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 6. Verify & Regenerate Lat/Long Password
app.post('/api/verify-latlong-pass', async (req, res) => {
    try {
        const { username, pass } = req.body;
        const user = await User.findOne({ username });

        if (!user) return res.json({ success: false, message: "User nahi mila" });

        if (user.latLongPass === pass) {
            user.latLongPass = generateOTP();
            await user.save();
            return res.json({ success: true, message: "Password Verified! New OTP Generated." });
        } else {
            return res.json({ success: false, message: "Galat Lat/Long Password!" });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 7. Change Password API
app.post('/api/change-password', async (req, res) => {
    try {
        const { username, oldPassword, newPassword } = req.body;
        const user = await User.findOne({ username });

        if (!user || user.password !== oldPassword) {
            return res.json({ success: false, message: "Purana Password Galat Hai!" });
        }

        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: "Password kamyabi se badal gaya!" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 8. Admin: Update Status / Expiry
app.post('/api/admin/update-status', async (req, res) => {
    try {
        const { admin_pass, username, status } = req.body;
        if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

        await User.findOneAndUpdate({ username }, { status });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/admin/update-expiry', async (req, res) => {
    try {
        const { admin_pass, username, expiry } = req.body;
        if (admin_pass !== "admin@1") return res.status(401).json({ success: false, message: "Unauthorized" });

        await User.findOneAndUpdate({ username }, { expiry });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
