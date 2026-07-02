const express = require('express');
const app = express();
const path = require('path');
const PORT = 8000; // هذا البور مقبول في كل المتصفحات

app.use(express.json());
app.use(express.static('public'));

// 1. قاعدة بيانات المستخدمين (إيميل، باسورد، وتاريخ نهاية الاشتراك)
const users = [
    { email: "prof@univ.dz", password: "123", expiryDate: "2026-12-31" },
    { email: "user@univ.dz", password: "456", expiryDate: "2024-01-01" }
];

// 2. الثوابت الفيزيائية الدقيقة (Si & Ge)
const PhysData = {
    Si: { c11: 165.7, c12: 63.9, c44: 79.6, k: 0.021, d: 4.2, rho: 2329, B: 97.8, G: 79.6, E: 165.7, VL: 9000, VT: 5400, VR: 4900 },
    Ge: { c11: 128.5, c12: 48.3, c44: 67.1, k: 0.026, d: 4.6, rho: 5323, B: 75.8, G: 67.1, E: 128.5, VL: 5400, VT: 3000, VR: 2800 }
};

// 3. مسار تسجيل الدخول (Login) مع التحقق من الاشتراك
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) return res.status(401).json({ success: false, message: "Email ou mot de passe incorrect" });

    // التحقق من التاريخ
    const today = new Date();
    const expiry = new Date(user.expiryDate);
    if (today > expiry) return res.status(403).json({ success: false, message: "Abonnement expiré ! Veuillez renouveler." });

    res.json({ success: true, email: user.email });
});

// 4. مسار الحسابات الفيزيائية المحمية
app.post('/api/calculate', (req, res) => {
    const { email, varKey, x, P, T, unitRho, unitOthers } = req.body;
    
    const si = PhysData.Si[varKey];
    const ge = PhysData.Ge[varKey];
    
    const k_eff = (1 - x) * 0.021 + x * 0.026;
    const d_eff = (1 - x) * 4.2 + x * 4.6;
    const Y_ref = (1 - x) * si + x * ge;
    
    let val = Y_ref + (d_eff * P) - (k_eff * (T - 300));
    
    if (varKey === 'rho' && unitRho === 'g/cm3') val /= 1000;
    if (unitOthers === 'Pa_cms') {
        if (['c11', 'c12', 'c44', 'B', 'G', 'E'].includes(varKey)) val *= 1e9;
        if (['VL', 'VT', 'VR'].includes(varKey)) val *= 100;
    }

    res.json({ result: parseFloat(val.toFixed(3)) });
});

// 5. تشغيل السيرفر على البور 8000
app.listen(PORT, () => {
    console.log("==========================================");
    console.log(`  SERVEUR ACTIF: http://localhost:${PORT}/login.html  `);
    console.log("==========================================");
});









































