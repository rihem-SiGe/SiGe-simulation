const userEmail = localStorage.getItem('userEmail');
if(!userEmail) window.location.href = 'login.html';

document.getElementById('lancerBtn').onclick = async () => {
    const v = document.getElementById('currentVar').value;
    const tP = [+document.getElementById('tMin').value, +document.getElementById('tMax').value, +document.getElementById('tStep').value];
    const pP = [+document.getElementById('pMin').value, +document.getElementById('pMax').value, +document.getElementById('pStep').value];
    const xP = [+document.getElementById('xMin').value, +document.getElementById('xMax').value, +document.getElementById('xStep').value];

    let xRange = [], tRange = [], pRange = [];
    for(let x=xP[0]; x<=xP[1]; x=parseFloat((x+xP[2]).toFixed(2))) xRange.push(x);
    for(let t=tP[0]; t<=tP[1]; t+=tP[2]) tRange.push(t);
    for(let p=pP[0]; p<=pP[1]; p+=pP[2]) pRange.push(p);

    // 1. جلب كل البيانات بطلب واحد (سرعة قصوى)
    const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ varKey: v, xRange, tRange, pRange, unitRho: document.getElementById('unitRho').value, unitOthers: document.getElementById('unitOthers').value })
    });
    const allData = await response.json();

    document.getElementById('bodyPage').classList.remove('initial-view');
    document.getElementById('resultsContainer').classList.remove('hidden');

    // 2. تعمير جدول الحرارة (P constant)
    let hT = `<table><tr><th>T(K) \\ x</th>` + xRange.map(x=>`<th>x=${x}</th>`).join('') + `</tr>`;
    tRange.forEach(t => {
        hT += `<tr><td><strong>${t}</strong></td>` + xRange.map(x => {
            const d = allData[x].find(item => item.t === t && item.p === pP[0]);
            return `<td>${d ? d.val : '-'}</td>`;
        }).join('') + `</tr>`;
    });
    document.getElementById('tableTemp').innerHTML = hT + `</table>`;

    // 3. تعمير جدول الضغط (T constant)
    let hP = `<table><tr><th>P(GPa) \\ x</th>` + xRange.map(x=>`<th>x=${x}</th>`).join('') + `</tr>`;
    pRange.forEach(p => {
        hP += `<tr><td><strong>${p}</strong></td>` + xRange.map(x => {
            const d = allData[x].find(item => item.p === p && item.t === tP[0]);
            return `<td>${d ? d.val : '-'}</td>`;
        }).join('') + `</tr>`;
    });
    document.getElementById('tablePress').innerHTML = hP + `</table>`;

    // 4. رسم 2D (الحرارة)
    let tracesT = xRange.map(x => ({
        x: tRange, y: tRange.map(t => allData[x].find(d=>d.t===t && d.p===pP[0]).val),
        name: `x=${x}`, type: 'scatter', mode: 'lines+markers'
    }));
    Plotly.newPlot('plotTemp', tracesT, { title: 'Étude Thermique', xaxis: {title: 'T(K)'}, yaxis: {range: [+document.getElementById('yTMin').value, +document.getElementById('yTMax').value]} });

    // 5. رسم 2D (الضغط)
    let tracesP = xRange.map(x => ({
        x: pRange, y: pRange.map(p => allData[x].find(d=>d.p===p && d.t===tP[0]).val),
        name: `x=${x}`, type: 'scatter', mode: 'lines+markers'
    }));
    Plotly.newPlot('plotPress', tracesP, { title: 'Étude Barométrique', xaxis: {title: 'P(GPa)'}, yaxis: {range: [+document.getElementById('yPMin').value, +document.getElementById('yPMax').value]} });

    // 6. الرسم 3D الأسطوري (Z = x)
    let traces3D = xRange.map(x => {
        let zMat = [], tAx = [], pAx = [];
        // نستخدم خطوات أدق للـ 3D
        for(let p=pP[0]; p<=pP[1]; p+=1) {
            pAx.push(p); let row = [];
            for(let t=tP[0]; t<=tP[1]; t+=20) {
                if(p===pP[0]) tAx.push(t);
                const k_eff = (1 - x) * 0.021 + x * 0.026;
                const d_eff = (1 - x) * 4.2 + x * 4.6;
                const si = PhysData.Si[v], ge = PhysData.Ge[v];
                const Y_ref = (1 - x) * si + x * ge;
                row.push(parseFloat((Y_ref + (d_eff * p) - (k_eff * (t - 300))).toFixed(2)));
            }
            zMat.push(row);
        }
        return { x: tAx, y: pAx, z: pAx.map(()=>tAx.map(()=>x)), surfacecolor: zMat, type: 'surface', name: `x=${x}`, showscale: x===xRange[xRange.length-1] };
    });
    Plotly.react('plot3D', traces3D, { scene: {xaxis:{title:'T(K)'}, yaxis:{title:'P(GPa)'}, zaxis:{title:'Fraction x', range:[0,1], tickvals:xRange}} });

    window.scrollTo({ top: document.getElementById('resultsContainer').offsetTop, behavior: 'smooth' });
};

// 7. الـ PDF الشامل والنهائي
document.getElementById('pdfBtn').onclick = async () => {
    alert("Génération du rapport complet...");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const now = new Date();

    doc.setFontSize(18); doc.setTextColor(0, 82, 204);
    doc.text("Plateforme de Simulation Scientifique SiGe", 105, 20, {align: 'center'});
    doc.setFontSize(10); doc.text(`Date: ${now.toLocaleString()}`, 105, 28, {align: 'center'});

    doc.autoTable({ html: '#tableTemp table', startY: 40, theme: 'grid' });
    const imgT = await Plotly.toImage('plotTemp', {format: 'png'});
    doc.addImage(imgT, 'PNG', 15, doc.lastAutoTable.finalY + 10, 180, 80);

    doc.addPage();
    doc.autoTable({ html: '#tablePress table', startY: 20, theme: 'grid' });
    const imgP = await Plotly.toImage('plotPress', {format: 'png'});
    doc.addImage(imgP, 'PNG', 15, doc.lastAutoTable.finalY + 10, 180, 80);

    doc.addPage();
    doc.text("Modélisation 3D Multi-paramétrique", 15, 20);
    const img3D = await Plotly.toImage('plot3D', {format: 'png', width: 1000, height: 800});
    doc.addImage(img3D, 'PNG', 10, 30, 190, 150);

    doc.save(`Rapport_Final_SiGe.pdf`);
};

const PhysData = { Si: {c11: 165.7, c12: 63.9, c44: 79.6, k: 0.021, d: 4.2, rho: 2329, B: 97.8, G: 79.6, E: 165.7, VL: 9000, VT: 5400, VR: 4900}, Ge: {c11: 128.5, c12: 48.3, c44: 67.1, k: 0.026, d: 4.6, rho: 5323, B: 75.8, G: 67.1, E: 128.5, VL: 5400, VT: 3000, VR: 2800} };

