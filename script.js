// 1. حماية الدخول
if(!localStorage.getItem('userEmail')) {
    window.location.href = 'login.html';
}

// 2. دالة جلب البيانات من السيرفر
async function getVal(varKey, x, P, T) {
    try {
        const res = await fetch('/api/calculate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                email: localStorage.getItem('userEmail'),
                varKey, x, P, T,
                unitRho: document.getElementById('unitRho').value,
                unitOthers: document.getElementById('unitOthers').value
            })
        });
        const data = await res.json();
        return data.result || 0;
    } catch (err) { return 0; }
}

// 3. زر التشغيل
document.getElementById('lancerBtn').onclick = async () => {
    document.getElementById('bodyPage').classList.remove('initial-view');
    document.getElementById('resultsContainer').classList.remove('hidden');

    const v = document.getElementById('currentVar').value;
    const tP = [+document.getElementById('tMin').value, +document.getElementById('tMax').value, +document.getElementById('tStep').value];
    const pP = [+document.getElementById('pMin').value, +document.getElementById('pMax').value, +document.getElementById('pStep').value];
    const xP = [+document.getElementById('xMin').value, +document.getElementById('xMax').value, +document.getElementById('xStep').value];

    let xRange = [];
    for(let x=xP[0]; x<=xP[1]; x=parseFloat((x+xP[2]).toFixed(2))) xRange.push(x);

    // حساب الجداول 2D (كما كانت)
    let tData = [];
    for(let t=tP[0]; t<=tP[1]; t+=tP[2]) {
        let row = { label: t };
        for(let x of xRange) row[x] = await getVal(v, x, pP[0], t);
        tData.push(row);
    }
    renderTable('tableTemp', tData, xRange, 'T(K)');
    draw2D('plotTemp', tData, xRange, 'T(K)', `Analyse f(T)`, [+document.getElementById('yTMin').value, +document.getElementById('yTMax').value]);

    // حساب الـ 3D (النسخة الخفيفة المضمونة)
    await draw3DNew(v, xRange, tP, pP);

    window.scrollTo({ top: document.getElementById('resultsContainer').offsetTop, behavior: 'smooth' });
};

async function draw3DNew(v, xRange, tP, pP) {
    let traces = [];
    for(let x of xRange) {
        let valMat = [], tAx = [], pAx = [];
        // تكبير الخطوة (Step) لضمان السرعة في Render
        for(let p = pP[0]; p <= pP[1]; p += 2) { 
            pAx.push(p); let row = [];
            for(let t = tP[0]; t <= tP[1]; t += 100) { 
                if(p === pP[0]) tAx.push(t);
                row.push(await getVal(v, x, p, t));
            }
            valMat.push(row);
        }
        traces.push({
            x: tAx, y: pAx, z: pAx.map(() => tAx.map(() => x)),
            surfacecolor: valMat, type: 'surface', name: `x=${x}`,
            showscale: x === xRange[xRange.length-1]
        });
    }
    const layout = {
        title: "Modélisation 3D (Z=x)",
        scene: { xaxis:{title:'T'}, yaxis:{title:'P'}, zaxis:{title:'x', range:[0,1]} }
    };
    // أهم سطر: استخدام Plotly.react لضمان التحديث
    await Plotly.react('plot3D', traces, layout);
}

// 4. تقرير PDF
document.getElementById('pdfBtn').onclick = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Rapport Scientifique SiGe", 15, 20);
    const img3D = await Plotly.toImage('plot3D', {format: 'png', width: 800, height: 600});
    doc.addImage(img3D, 'PNG', 10, 40, 190, 120);
    doc.save("Rapport.pdf");
};

function renderTable(id, data, xRange, col1) {
    let h = `<table><tr><th>${col1} \\ x</th>` + xRange.map(x=>`<th>x=${x}</th>`).join('') + `</tr>`;
    data.forEach(d => {
        h += `<tr><td><strong>${d.label}</strong></td>` + xRange.map(x=>`<td>${d[x]}</td>`).join('') + `</tr>`;
    });
    document.getElementById(id).innerHTML = h + `</table>`;
}

function draw2D(id, data, xRange, xTitle, title, yScale) {
    let traces = xRange.map(x => ({
        x: data.map(d => d.label), y: data.map(d => d[x]),
        name: `x=${x}`, type: 'scatter', mode: 'lines+markers'
    }));
    Plotly.newPlot(id, traces, { title: title, xaxis: {title: xTitle}, yaxis: {range: yScale} });
}


