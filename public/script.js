// 1. حماية الدخول
const userEmail = localStorage.getItem('userEmail');
if(!userEmail) window.location.href = 'login.html';

// 2. دالة جلب البيانات من السيرفر
async function getVal(varKey, x, P, T) {
    const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            email: userEmail, varKey, x, P, T,
            unitRho: document.getElementById('unitRho').value,
            unitOthers: document.getElementById('unitOthers').value
        })
    });
    const data = await res.json();
    if (res.status === 403) {
        alert(data.message);
        window.location.href = 'login.html';
        return 0;
    }
    return data.result;
}

// 3. المحرك الأساسي (عند الضغط على الزر)
document.getElementById('lancerBtn').onclick = async () => {
    // إظهار الحاويات المخفية
    document.getElementById('bodyPage').classList.remove('initial-view');
    document.getElementById('resultsContainer').classList.remove('hidden');

    const v = document.getElementById('currentVar').value;
    const tP = [+document.getElementById('tMin').value, +document.getElementById('tMax').value, +document.getElementById('tStep').value];
    const pP = [+document.getElementById('pMin').value, +document.getElementById('pMax').value, +document.getElementById('pStep').value];
    const xP = [+document.getElementById('xMin').value, +document.getElementById('xMax').value, +document.getElementById('xStep').value];

    let xRange = [];
    for(let x=xP[0]; x<=xP[1]; x=parseFloat((x+xP[2]).toFixed(2))) xRange.push(x);

    // --- أ. الدراسة الحرارية (Température) ---
    let tData = [];
    for(let t=tP[0]; t<=tP[1]; t+=tP[2]) {
        let row = { label: t };
        for(let x of xRange) row[x] = await getVal(v, x, pP[0], t);
        tData.push(row);
    }
    renderTable('tableTemp', tData, xRange, 'T(K)');
    draw2D('plotTemp', tData, xRange, 'Température T (K)', `Variation de ${v.toUpperCase()} f(T)`, [+document.getElementById('yTMin').value, +document.getElementById('yTMax').value]);

    // --- ب. الدراسة البارومترية (Pression) ---
    let pData = [];
    for(let p=pP[0]; p<=pP[1]; p+=pP[2]) {
        let row = { label: p };
        for(let x of xRange) row[x] = await getVal(v, x, p, tP[0]);
        pData.push(row);
    }
    renderTable('tablePress', pData, xRange, 'P(GPa)');
    draw2D('plotPress', pData, xRange, 'Pression P (GPa)', `Variation de ${v.toUpperCase()} f(P)`, [+document.getElementById('yPMin').value, +document.getElementById('yPMax').value]);

    // --- ج. الرسم ثلاثي الأبعاد المطور ---
    draw3DNew(v, xRange, tP, pP);

    window.scrollTo({ top: document.getElementById('resultsContainer').offsetTop, behavior: 'smooth' });
};

// دالة بناء الجداول
function renderTable(id, data, xRange, col1) {
    let h = `<table><thead><tr><th>${col1} \\ x</th>` + xRange.map(x=>`<th>x=${x}</th>`).join('') + `</tr></thead><tbody>`;
    data.forEach(d => {
        h += `<tr><td><strong>${d.label}</strong></td>` + xRange.map(x=>`<td>${d[x]}</td>`).join('') + `</tr>`;
    });
    document.getElementById(id).innerHTML = h + `</tbody></table>`;
}

// دالة الرسم 2D
function draw2D(id, data, xRange, xTitle, title, yScale) {
    let traces = xRange.map(x => ({
        x: data.map(d => d.label), y: data.map(d => d[x]),
        name: `x=${x}`, type: 'scatter', mode: 'lines+markers'
    }));
    Plotly.newPlot(id, traces, { title: title, xaxis: {title: xTitle}, yaxis: {title: 'Valeur', range: yScale} });
}

// دالة الرسم 3D
async function draw3DNew(v, xRange, tP, pP) {
    let traces = [];
    for(let x of xRange) {
        let valMat = [], tAx = [], pAx = [];
        for(let p = pP[0]; p <= pP[1]; p += 1) {
            pAx.push(p); let row = [];
            for(let t = tP[0]; t <= tP[1]; t += 20) {
                if(p === pP[0]) tAx.push(t);
                row.push(await getVal(v, x, p, t));
            }
            valMat.push(row);
        }
        traces.push({
            x: tAx, y: pAx, z: pAx.map(() => tAx.map(() => x)),
            surfacecolor: valMat, type: 'surface', name: `x=${x}`,
            showscale: x === xRange[xRange.length - 1]
        });
    }
    Plotly.newPlot('plot3D', traces, { 
        scene: { xaxis: {title:'T(K)'}, yaxis: {title:'P(GPa)'}, zaxis: {title:'x', range:[0,1], tickvals:xRange} }
    });
}

// --- 4. توليد تقرير PDF شامل (المصحح) ---
document.getElementById('pdfBtn').onclick = async () => {
    alert("Génération du rapport complet en cours...");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const prop = document.getElementById('currentVar').options[document.getElementById('currentVar').selectedIndex].text;
    const now = new Date();

    // الصفحة 1: العنوان والدراسة الحرارية
    doc.setFontSize(18); doc.setTextColor(0, 82, 204);
    doc.text("Plateforme de Simulation des Alliages Si1-xGex", 105, 20, {align: 'center'});
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Date: ${now.toLocaleDateString()} | Heure: ${now.toLocaleTimeString()}`, 105, 28, {align: 'center'});
    doc.line(20, 32, 190, 32);

    doc.setFontSize(14); doc.setTextColor(0);
    doc.text(`1. Analyse Thermique - Propriété: ${prop}`, 15, 45);
    doc.autoTable({ html: '#tableTemp table', startY: 50, theme: 'grid', headStyles: {fillColor: [0, 82, 204]} });
    
    const imgT = await Plotly.toImage('plotTemp', {format: 'png', width: 800, height: 400});
    doc.addImage(imgT, 'PNG', 15, doc.lastAutoTable.finalY + 10, 180, 80);

    // الصفحة 2: الدراسة البارومترية
    doc.addPage();
    doc.text("2. Analyse Barométrique (Pression variable)", 15, 20);
    doc.autoTable({ html: '#tablePress table', startY: 25, theme: 'grid', headStyles: {fillColor: [0, 82, 204]} });
    
    const imgP = await Plotly.toImage('plotPress', {format: 'png', width: 800, height: 400});
    doc.addImage(imgP, 'PNG', 15, doc.lastAutoTable.finalY + 10, 180, 80);

    // الصفحة 3: النمذجة 3D
    doc.addPage();
    doc.text("3. Modélisation 3D Multi-paramétrique (T, P, x)", 15, 20);
    const img3D = await Plotly.toImage('plot3D', {format: 'png', width: 1000, height: 800});
    doc.addImage(img3D, 'PNG', 10, 30, 190, 150);

    doc.save(`Rapport_SiGe_${now.toLocaleDateString()}.pdf`);
};


