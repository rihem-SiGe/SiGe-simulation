const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.static('public'));

const users = [
    { email: "prof@univ.dz", password: "123", expiryDate: "2026-12-31" },
    { email: "user@univ.dz", password: "456", expiryDate: "2024-01-01" }
];

const PhysData = {
    Si: { c11: 165.7, c12: 63.9, c44: 79.6, k: 0.021, d: 4.2, rho: 2329, B: 97.8, G: 79.6, E: 165.7, VL: 9000, VT: 5400, VR: 4900 },
    Ge: { c11: 128.5, c12: 48.3, c44: 67.1, k: 0.026, d: 4.6, rho: 5323, B: 75.8, G: 67.1, E: 128.5, VL: 5400, VT: 3000, VR: 2800 }
};

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ success: false, message: "Email/Pass incorrect" });
    if (new Date() > new Date(user.expiryDate)) return res.status(403).json({ success: false, message: "Abonnement expiré !" });
    res.json({ success: true, email: user.email });
});

// محرك الحسابات الجماعي (Batch Engine)
app.post('/api/simulate', (req, res) => {
    const { varKey, xRange, tRange, pRange, unitRho, unitOthers } = req.body;
    let results = {};

    xRange.forEach(x => {
        results[x] = [];
        const si = PhysData.Si[varKey], ge = PhysData.Ge[varKey];
        const k_eff = (1 - x) * 0.021 + x * 0.026;
        const d_eff = (1 - x) * 4.2 + x * 4.6;
        const Y_ref = (1 - x) * si + x * ge;

        tRange.forEach(t => {
            pRange.forEach(p => {
                let val = Y_ref + (d_eff * p) - (k_eff * (t - 300));
                if (varKey === 'rho' && unitRho === 'g/cm3') val /= 1000;
                if (unitOthers === 'Pa_cms') {
                    if (['c11', 'c12', 'c44', 'B', 'G', 'E'].includes(varKey)) val *= 1e9;
                    if (['VL', 'VT', 'VR'].includes(varKey)) val *= 100;
                }
                results[x].push({ t, p, val: parseFloat(val.toFixed(3)) });
            });
        });
    });
    res.json(results);
});

app.listen(PORT, () => console.log(`Server Live on port ${PORT}`));








































