/* ---------- custom popup ---------- */
window.customAlert = function(message) {
  const modal = document.getElementById('customAlertModal');
  const msgEl = document.getElementById('customAlertMessage');
  if (modal && msgEl) {
    msgEl.textContent = message;
    modal.style.display = 'flex';
  } else {
    console.log("Alert:", message);
  }
}

window.closeCustomAlert = function() {
  const modal = document.getElementById('customAlertModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/* ---------- static definitions ---------- */
const QUALITY_DIMS = [
  { key: 'Honesty', label: 'Honesty', weight: 14, question: 'Do they tell the truth even when truth is inconvenient or costly?' },
  { key: 'Goodwill', label: 'Goodwill', weight: 11, question: 'Do they genuinely want good outcomes for you, even when they gain nothing?' },
  { key: 'Reliability', label: 'Reliability', weight: 9, question: 'Do they practically show up and keep commitments?' },
  { key: 'Respect', label: 'Respect', weight: 9, question: 'Can you disagree, say no, or choose differently without punishment?' },
  { key: 'Confidentiality', label: 'Confidentiality', weight: 7, question: 'Do they protect your private information and reputation?' },
  { key: 'NonExploitation', label: 'Non-Exploitation', weight: 11, question: 'Do they avoid using your money, status, access, vulnerability, or resources unfairly?' },
  { key: 'Success', label: 'Reaction to Success', weight: 8, question: 'Can they support your success without sabotage, undermining, or hostile envy?' },
  { key: 'Conflict', label: 'Conflict Behavior', weight: 9, question: 'During conflict, do they communicate fairly instead of manipulating, threatening, or retaliating?' },
  { key: 'Reciprocity', label: 'Reciprocity', weight: 7, question: 'Is the relationship reasonably two-way over time?' },
  { key: 'Consistency', label: 'Consistency', weight: 6, question: 'Are they broadly the same person across time, settings, and different audiences?' },
  { key: 'PracticalSupport', label: 'Practical / Financial Support', weight: 9, question: 'When reasonably able, do they help in practical or financial difficulty — not just talk?' }
];

const RISK_DIMS = [
  { key: 'Lying', label: 'Repeated Lying', question: 'Repeated or unnecessary dishonesty, especially when truth is inconvenient.' },
  { key: 'Manipulation', label: 'Manipulation', question: 'Distorting information, guilt, pressure, or hidden tactics to steer your decisions.' },
  { key: 'Retaliation', label: 'Retaliation', question: 'Punishing you for saying no, disagreeing, setting boundaries, or choosing differently.' },
  { key: 'Exploitation', label: 'Exploitation', question: 'Using your money, position, contacts, access, vulnerability, or generosity unfairly.' },
  { key: 'Sabotage', label: 'Sabotage', question: 'Credible evidence of trying to damage your relationships, reputation, work, or opportunities.' },
  { key: 'Privacy', label: 'Privacy / Betrayal', question: 'Sharing secrets, private information, or speaking destructively behind your back.' },
  { key: 'Financial', label: 'Financial Dishonesty', question: 'Misleading, hiding, or behaving unfairly around money, business, expenses, or ownership.' }
];

const GUIDE_ROWS = [
  ['Start', 'Add a person in People', 'Only enter name, relationship and context there.', 'Their name automatically appears on every scoring tab.'],
  ['Positive scores', 'Score 1–10', '1 = consistently poor; 5 = mixed/uncertain; 10 = repeatedly excellent.', 'Score behavior, not your mood.'],
  ['Evidence', 'Write one concrete example', 'A score without examples becomes vulnerable to bias.', 'Update scores when new evidence appears.'],
  ['Risk severity', '0–3', '0 none; 1 isolated/minor; 2 repeated/meaningful; 3 serious/repeated.', 'Do not use severity 3 for a suspicion alone.'],
  ['Evidence confidence', '1–5', '1 = rumor/fear; 3 = plausible but incomplete; 5 = directly verified/strong evidence.', 'Low confidence reduces the risk calculation.'],
  ['Observations', 'Separate Fact / Interpretation / Fear', 'Facts are what happened; interpretations are meanings; fears are predictions.', 'Do not turn a fear into a fact.'],
  ['Overall Trust', 'Weighted 0–100', 'Honesty and non-exploitation receive high weight; practical/financial support is also counted.', 'Use as a guide, not a verdict.'],
  ['Risk %', 'Behavior-risk indicator', 'Based on logged severity × evidence confidence across seven red-flag areas.', 'High risk means protect access and verify — not diagnose a person.'],
  ['Inner Circle', 'Trust ≥80 and Risk <40', 'Strong current evidence across multiple dimensions.', 'Still keep normal boundaries.'],
  ['Trusted', 'Trust 65–79 and Risk <40', 'Generally dependable but not perfect.', 'Normal friendship trust.'],
  ['Limited Trust', 'Trust 50–64 and Risk <40', 'Mixed record.', 'Keep important decisions verifiable.'],
  ['Caution', 'Risk 40–64', 'Meaningful red flags exist.', 'Reduce exposure; verify important information.'],
  ['High Risk / Distance', 'Risk ≥65', 'Multiple/severe high-confidence red flags.', 'Protect finances, secrets, business access and major decisions.'],
  ['Review rhythm', 'Monthly light review; quarterly deeper review', 'Avoid reacting to one good or bad day.', 'Look for patterns across time.']
];

/* ---------- state ---------- */
let people = [];
let qualityData = {};
let riskData = {};
let observations = [];
let monthlyHistory = [];
let selectedPersonId = null;
let charts = {};

document.getElementById('todayPill').textContent = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
document.getElementById('o-date').value = new Date().toISOString().slice(0, 10);

/* ---------- tabs ---------- */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'dashboard') renderDashboard();
    if (btn.dataset.tab === 'monthly') renderMonthlyDashboard();
  });
});

document.getElementById('saveCheckInBtn').addEventListener('click', async () => {
  const person = document.getElementById('m-person').value;
  if (!person) { customAlert('Please select a person'); return; }

  const d = new Date();
  const month_year = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

  const trust_score = trustFor(person) || 0;
  const risk_score = riskFor(person) || 0;

  const res = await apiCall('/api/history', 'POST', { person_name: person, month_year, trust_score, risk_score });
  if (res && !res.error) {
    const ind = document.getElementById('saved-monthly-indicator');
    ind.style.display = 'inline';
    setTimeout(() => ind.style.display = 'none', 2000);

    const existing = monthlyHistory.find(h => h.person_name === person && h.month_year === month_year);
    if (existing) {
      existing.trust_score = trust_score; existing.risk_score = risk_score;
    } else {
      monthlyHistory.push({ person_name: person, month_year, trust_score, risk_score });
    }
    renderMonthlyDashboard();
  }
});

document.getElementById('addPersonBtn').addEventListener('click', addPerson);
document.getElementById('addObsBtn').addEventListener('click', addObservation);
document.getElementById('q-person').addEventListener('change', loadQualityForm);
document.getElementById('r-person').addEventListener('change', loadRiskForm);

/* ---------- storage ---------- */
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return null; }
  const headers = { 'Authorization': `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(endpoint, { method, headers, body: body ? JSON.stringify(body) : null });
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function loadAll() {
  const data = await apiCall('/api/data');
  if (!data) return;
  people = data.people || [];
  qualityData = {};
  if (data.quality) {
    data.quality.forEach(q => {
      if (!qualityData[q.person_name]) qualityData[q.person_name] = {};
      qualityData[q.person_name][q.dimension_key] = { score: q.score, evidence: q.evidence, lastReviewed: q.last_reviewed };
    });
  }
  riskData = {};
  if (data.risk) {
    data.risk.forEach(r => {
      if (!riskData[r.person_name]) riskData[r.person_name] = {};
      riskData[r.person_name][r.dimension_key] = { severity: r.severity, confidence: r.confidence, evidence: r.evidence, lastReviewed: r.last_reviewed };
    });
  }
  observations = (data.observations || []).map(o => ({ ...o, person: o.person_name }));
  monthlyHistory = data.history || [];
  renderPeopleTable();
  populatePersonSelects();
  renderObsTable();
  renderDashboard();
}

/* ---------- people ---------- */
async function addPerson() {
  const name = document.getElementById('p-name').value.trim();
  const unique_id = document.getElementById('p-uid').value.trim();
  if (!name) { customAlert('Please enter a name.'); return; }
  if (!unique_id || !/^\d{1,4}$/.test(unique_id)) { customAlert('Please enter a unique ID (up to 4 digits).'); return; }
  const payload = {
    name,
    unique_id,
    relationship: document.getElementById('p-rel').value,
    context: document.getElementById('p-context').value.trim(),
    priority: document.getElementById('p-priority').value
  };
  const person = await apiCall('/api/people', 'POST', payload);
  if (person && !person.error) {
    people.push(person);
    document.getElementById('p-name').value = '';
    document.getElementById('p-uid').value = '';
    document.getElementById('p-context').value = '';
    renderPeopleTable();
    populatePersonSelects();
    renderDashboard();
  } else if (person && person.error) {
    customAlert(person.error);
  }
}
async function deletePerson(id) {
  const res = await apiCall(`/api/people/${id}`, 'DELETE');
  if (res && res.success) {
    const person = people.find(p => p.id === id);
    people = people.filter(p => p.id !== id);
    if (person) {
      delete qualityData[person.name];
      delete riskData[person.name];
      observations = observations.filter(o => o.person !== person.name);
    }
    renderPeopleTable();
    populatePersonSelects();
    renderObsTable();
    renderDashboard();
  }
}
function renderPeopleTable() {
  const holder = document.getElementById('peopleTableHolder');
  if (!people.length) {
    holder.innerHTML = `<div class="empty"><span class="big">No one registered yet</span>Add a person above to get started.</div>`;
    return;
  }
  const rows = people.map(p => `
    <tr>
      <td>${p.unique_id || '—'}</td><td>${p.name}</td><td>${p.relationship}</td><td>${p.context || '—'}</td><td>${p.priority}</td>
      <td><button class="del-btn" onclick="deletePerson(${p.id})">Remove</button></td>
    </tr>`).join('');
  holder.innerHTML = `<table><thead><tr><th>ID</th><th>Person</th><th>Relationship</th><th>Context</th><th>Priority</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
function populatePersonSelects() {
  const opts = people.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
  ['q-person', 'r-person', 'o-person', 'm-person'].forEach(id => {
    const el = document.getElementById(id);
    const prev = el.value;
    el.innerHTML = opts || `<option value="">Register a person first</option>`;
    if (people.some(p => p.name === prev)) el.value = prev;
  });
  loadQualityForm();
  loadRiskForm();
}

/* ---------- quality scoring ---------- */
function loadQualityForm() {
  const person = document.getElementById('q-person').value;
  const holder = document.getElementById('qualityDims');
  if (!person) { holder.innerHTML = ''; return; }
  qualityData[person] = qualityData[person] || {};
  holder.innerHTML = QUALITY_DIMS.map(d => {
    const rec = qualityData[person][d.key] || { score: '', evidence: '' };
    return `
    <div class="dim-row">
      <div class="dim-head"><span class="name">${d.label} <span style="color:red">*</span></span><span class="weight">Weight ${d.weight}%</span></div>
      <p class="dim-q">${d.question}</p>
      <div class="dim-inputs">
        <input type="number" min="1" max="10" placeholder="1–10" value="${rec.score}" id="qs-${d.key}" onkeydown="if(['e','E','+','-','.'].includes(event.key)) event.preventDefault();" oninput="if(this.value>10)this.value=10;if(this.value<1&&this.value!=='')this.value=1;" onchange="saveQualityField('${person}','${d.key}')">
        <input type="text" placeholder="Evidence / example" value="${rec.evidence || ''}" id="qe-${d.key}" onchange="saveQualityField('${person}','${d.key}')">
        <span id="saved-qs-${d.key}" style="display:none; color:green; font-size:12px; margin-left:5px;">Saved ✅</span>
      </div>
    </div>`;
  }).join('');
}
async function saveQualityField(person, key) {
  const score = document.getElementById('qs-' + key).value;
  const evidence = document.getElementById('qe-' + key).value;
  qualityData[person] = qualityData[person] || {};
  qualityData[person][key] = { score: score === '' ? '' : Number(score), evidence, lastReviewed: new Date().toISOString().slice(0, 10) };
  const res = await apiCall('/api/quality', 'POST', { person_name: person, dimension_key: key, score: score === '' ? '' : Number(score), evidence });
  if (res && !res.error) {
    const ind = document.getElementById('saved-qs-' + key);
    if (ind) { ind.style.display = 'inline'; setTimeout(() => ind.style.display = 'none', 2000); }
  }
  renderDashboard();
}

/* ---------- risk scoring ---------- */
function loadRiskForm() {
  const person = document.getElementById('r-person').value;
  const holder = document.getElementById('riskDims');
  if (!person) { holder.innerHTML = ''; return; }
  riskData[person] = riskData[person] || {};
  holder.innerHTML = RISK_DIMS.map(d => {
    const rec = riskData[person][d.key] || { severity: '', confidence: '', evidence: '' };
    return `
    <div class="dim-row">
      <div class="dim-head"><span class="name">${d.label}</span></div>
      <p class="dim-q">${d.question}</p>
      <div class="grid3">
        <div>
          <label>Severity (0–3) <span style="color:red">*</span></label>
          <select id="rs-${d.key}" onchange="saveRiskField('${person}','${d.key}')">
            <option value="">—</option>
            ${[0, 1, 2, 3].map(v => `<option value="${v}" ${String(rec.severity) === String(v) ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Confidence (1–5) <span style="color:red">*</span></label>
          <select id="rc-${d.key}" onchange="saveRiskField('${person}','${d.key}')">
            <option value="">—</option>
            ${[1, 2, 3, 4, 5].map(v => `<option value="${v}" ${String(rec.confidence) === String(v) ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Evidence / example</label>
          <input type="text" id="re-${d.key}" value="${rec.evidence || ''}" onchange="saveRiskField('${person}','${d.key}')">
          <div id="saved-rs-${d.key}" style="display:none; color:green; font-size:12px; margin-top:4px;">Saved ✅</div>
        </div>
      </div>
    </div>`;
  }).join('');
}
async function saveRiskField(person, key) {
  const severity = document.getElementById('rs-' + key).value;
  const confidence = document.getElementById('rc-' + key).value;
  const evidence = document.getElementById('re-' + key).value;
  riskData[person] = riskData[person] || {};
  riskData[person][key] = {
    severity: severity === '' ? '' : Number(severity),
    confidence: confidence === '' ? '' : Number(confidence),
    evidence, lastReviewed: new Date().toISOString().slice(0, 10)
  };
  const res = await apiCall('/api/risk', 'POST', { person_name: person, dimension_key: key, severity: severity === '' ? '' : Number(severity), confidence: confidence === '' ? '' : Number(confidence), evidence });
  if (res && !res.error) {
    const ind = document.getElementById('saved-rs-' + key);
    if (ind) { ind.style.display = 'block'; setTimeout(() => ind.style.display = 'none', 2000); }
  }
  renderDashboard();
  renderMonthlyRiskChart(person);
}

/* ---------- observations ---------- */
async function addObservation() {
  const person = document.getElementById('o-person').value;
  if (!person) { customAlert('Register a person first.'); return; }
  const payload = {
    date: document.getElementById('o-date').value,
    person_name: person,
    type: document.getElementById('o-type').value,
    context: document.getElementById('o-context').value,
    what: document.getElementById('o-what').value.trim(),
    impact: Number(document.getElementById('o-impact').value),
    action: document.getElementById('o-action').value.trim()
  };
  const obs = await apiCall('/api/observations', 'POST', payload);
  if (obs && !obs.error) {
    observations.unshift({ ...obs, person: obs.person_name });
    document.getElementById('o-what').value = '';
    document.getElementById('o-action').value = '';
    renderObsTable();
  }
}
async function deleteObservation(id) {
  const res = await apiCall(`/api/observations/${id}`, 'DELETE');
  if (res && res.success) {
    observations = observations.filter(o => o.id !== id);
    renderObsTable();
  }
}
function renderObsTable() {
  const holder = document.getElementById('obsTableHolder');
  if (!observations.length) {
    holder.innerHTML = `<div class="empty"><span class="big">Nothing logged yet</span>Add your first observation above.</div>`;
    return;
  }
  const rows = observations.map(o => `
    <tr>
      <td>${o.date}</td><td>${o.person}</td><td>${o.type}</td><td>${o.context}</td>
      <td style="max-width:220px;">${o.what || '—'}</td><td>${o.impact}</td>
      <td><button class="del-btn" onclick="deleteObservation(${o.id})">Remove</button></td>
    </tr>`).join('');
  holder.innerHTML = `<table><thead><tr><th>Date</th><th>Person</th><th>Type</th><th>Context</th><th>What happened</th><th>Impact</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

/* ---------- scoring formulas ---------- */
function trustFor(personName) {
  const data = qualityData[personName] || {};
  let totalWeight = 0, weightedSum = 0;
  QUALITY_DIMS.forEach(d => {
    const rec = data[d.key];
    if (rec && rec.score !== '' && rec.score != null) {
      totalWeight += d.weight;
      weightedSum += d.weight * Number(rec.score);
    }
  });
  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 10);
}
function riskFor(personName) {
  const data = riskData[personName] || {};
  const pcts = RISK_DIMS.map(d => {
    const rec = data[d.key];
    if (rec && rec.severity !== '' && rec.severity != null && rec.confidence !== '' && rec.confidence != null) {
      return (Number(rec.severity) / 3) * (Number(rec.confidence) / 5) * 100;
    }
    return 0;
  });
  return Math.round(pcts.reduce((a, b) => a + b, 0) / RISK_DIMS.length);
}
function categoryFor(trust, risk) {
  if (trust === null) trust = 0;
  if (risk >= 65) return { label: 'High Risk / Distance', cls: 'cat-highrisk' };
  if (risk >= 40) return { label: 'Caution', cls: 'cat-caution' };
  if (trust >= 80) return { label: 'Inner Circle', cls: 'cat-inner' };
  if (trust >= 65) return { label: 'Trusted', cls: 'cat-trusted' };
  if (trust >= 50) return { label: 'Limited Trust', cls: 'cat-limited' };
  return { label: 'Distant / Low Trust', cls: 'cat-distant' };
}

/* ---------- dashboard ---------- */
function renderDashboard() {
  const results = people.map(p => {
    const trust = trustFor(p.name);
    const risk = riskFor(p.name);
    const cat = categoryFor(trust, risk);
    return { ...p, trust: trust === null ? 0 : trust, hasTrust: trust !== null, risk, cat };
  });

  const total = results.length;
  const avgTrust = total ? Math.round(results.reduce((a, r) => a + r.trust, 0) / total) : 0;
  const avgRisk = total ? Math.round(results.reduce((a, r) => a + r.risk, 0) / total) : 0;
  const highRisk = results.filter(r => r.cat.label === 'High Risk / Distance').length;
  document.getElementById('dashStats').innerHTML = [
    { num: total, label: 'People tracked' },
    { num: avgTrust + '%', label: 'Average trust' },
    { num: avgRisk + '%', label: 'Average risk' },
    { num: highRisk, label: 'High risk / distance' }
  ].map(s => `<div class="stat"><div class="num">${s.num}</div><div class="label">${s.label}</div></div>`).join('');

  const grid = document.getElementById('personGrid');
  if (!results.length) {
    grid.innerHTML = `<div class="empty"><span class="big">No one registered yet</span>Add people on the People tab.</div>`;
  } else {
    grid.innerHTML = results.map(r => `
      <div class="person-card ${selectedPersonId === r.id ? 'selected' : ''}" onclick="selectPerson(${r.id})">
        <div class="pname">${r.name}</div>
        <div class="prel">${r.relationship}</div>
        <div class="bar-line"><span class="bar-label">Trust</span><div class="bar-track"><div class="bar-fill" style="width:${r.trust}%;"></div></div><span class="bar-num">${r.trust}</span></div>
        <div class="bar-line"><span class="bar-label">Risk</span><div class="bar-track"><div class="bar-fill risk" style="width:${r.risk}%;"></div></div><span class="bar-num">${r.risk}</span></div>
        <span class="cat-badge ${r.cat.cls}">${r.cat.label}</span>
      </div>`).join('');
  }

  const detailCard = document.getElementById('detailCard');
  const selected = results.find(r => r.id === selectedPersonId);
  if (selected) {
    detailCard.style.display = 'block';
    document.getElementById('detailName').textContent = selected.name;
    document.getElementById('detailMeta').textContent = `${selected.relationship} — Trust ${selected.trust}% · Risk ${selected.risk}% · ${selected.cat.label}`;
    renderPersonCharts(selected.name);
  } else {
    detailCard.style.display = 'none';
  }

  const mixCounts = {};
  results.forEach(r => { mixCounts[r.cat.label] = (mixCounts[r.cat.label] || 0) + 1; });
  const mixColors = {
    'Inner Circle': '#DED2B8', 'Trusted': '#EDE4D3', 'Limited Trust': '#B7A88C',
    'Caution': '#786E60', 'High Risk / Distance': '#1A1714', 'Distant / Low Trust': '#DED2B8'
  };
  const ctx = document.getElementById('chartCategoryMix');
  if (charts.mix) charts.mix.destroy();
  const labels = Object.keys(mixCounts);
  if (labels.length) {
    charts.mix = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: labels.map(l => mixCounts[l]), backgroundColor: labels.map(l => mixColors[l] || '#B7A88C'), borderRadius: 8, maxBarThickness: 50 }] },
      options: {
        maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0, color: '#786E60' }, grid: { color: '#DED2B8' } }, x: { ticks: { color: '#786E60', font: { family: 'Inter', size: 11 } }, grid: { display: false } } }
      }
    });
  } else if (charts.mix) { charts.mix.destroy(); }
}

function selectPerson(id) {
  selectedPersonId = (selectedPersonId === id) ? null : id;
  renderDashboard();
}

function renderPersonCharts(personName) {
  const qData = qualityData[personName] || {};
  const rData = riskData[personName] || {};

  const qLabels = QUALITY_DIMS.map(d => d.label);
  const qValues = QUALITY_DIMS.map(d => (qData[d.key] && qData[d.key].score !== '') ? Number(qData[d.key].score) : 0);
  if (charts.q) charts.q.destroy();
  charts.q = new Chart(document.getElementById('chartQuality'), {
    type: 'bar',
    data: { labels: qLabels, datasets: [{ data: qValues, backgroundColor: '#1A1714', borderRadius: 6 }] },
    options: {
      indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { min: 0, max: 10, ticks: { color: '#786E60' }, grid: { color: '#DED2B8' } }, y: { ticks: { color: '#786E60', font: { size: 10 } }, grid: { display: false } } }
    }
  });

  const rLabels = RISK_DIMS.map(d => d.label);
  const rValues = RISK_DIMS.map(d => {
    const rec = rData[d.key];
    if (rec && rec.severity !== '' && rec.severity != null && rec.confidence !== '' && rec.confidence != null) {
      return Math.round((Number(rec.severity) / 3) * (Number(rec.confidence) / 5) * 100);
    }
    return 0;
  });
  if (charts.r) charts.r.destroy();
  charts.r = new Chart(document.getElementById('chartRisk'), {
    type: 'bar',
    data: { labels: rLabels, datasets: [{ data: rValues, backgroundColor: '#B7A88C', borderRadius: 6 }] },
    options: {
      indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { min: 0, max: 100, ticks: { color: '#786E60' }, grid: { color: '#DED2B8' } }, y: { ticks: { color: '#786E60', font: { size: 10 } }, grid: { display: false } } }
    }
  });
}

function renderMonthlyRiskChart(personName) {
  const currentRisk = riskFor(personName) || 20;

  // Create 6 months of mock data points ending with the current risk
  const months = [];
  const data = [];
  let d = new Date();
  d.setMonth(d.getMonth() - 5);

  let prevVal = Math.max(0, currentRisk - 15 + Math.random() * 30);
  for (let i = 0; i < 6; i++) {
    months.push(d.toLocaleString('default', { month: 'short' }));
    if (i === 5) {
      data.push(currentRisk);
    } else {
      data.push(Math.round(prevVal));
      prevVal = Math.max(0, Math.min(100, prevVal - 10 + Math.random() * 20));
    }
    d.setMonth(d.getMonth() + 1);
  }

  const ctx = document.getElementById('monthlyRiskChart');
  if (!ctx) return;
  if (charts.monthly) charts.monthly.destroy();
  charts.monthly = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Risk %',
        data: data,
        borderColor: '#786E60',
        backgroundColor: 'rgba(120, 110, 96, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { color: '#786E60' }, grid: { color: '#DED2B8' } },
        x: { ticks: { color: '#786E60' }, grid: { display: false } }
      }
    }
  });
}

document.getElementById('r-person').addEventListener('change', (e) => {
  loadRiskForm();
  if (e.target.value) renderMonthlyRiskChart(e.target.value);
});

/* ---------- monthly dashboard ---------- */
function renderMonthlyDashboard() {
  const grid = document.getElementById('monthlyGrid');
  if (!people.length) {
    grid.innerHTML = `<div class="empty">No people registered yet.</div>`;
    return;
  }

  let html = '';
  people.forEach(p => {
    const ph = monthlyHistory.filter(h => h.person_name === p.name).sort((a, b) => a.month_year.localeCompare(b.month_year));

    let trendHtml = '';
    if (ph.length >= 2) {
      const last = ph[ph.length - 1];
      const prev = ph[ph.length - 2];

      const trustDiff = last.trust_score - prev.trust_score;
      const riskDiff = last.risk_score - prev.risk_score;

      const tColor = trustDiff >= 0 ? 'green' : 'red';
      const tArr = trustDiff >= 0 ? '▲' : '▼';
      const rColor = riskDiff <= 0 ? 'green' : 'red'; // risk going down is good
      const rArr = riskDiff > 0 ? '▲' : '▼';

      trendHtml = `<div style="font-size:14px; margin-top:5px; padding: 10px; background:#fcfcfc; border-radius:4px;">
        Trust Trend: <span style="color:${tColor}; font-weight:bold;">${tArr} ${Math.abs(trustDiff)}%</span> 
        &nbsp;|&nbsp; Risk Trend: <span style="color:${rColor}; font-weight:bold;">${rArr} ${Math.abs(riskDiff)}%</span>
      </div>`;
    } else if (ph.length === 1) {
      trendHtml = `<div style="font-size:14px; margin-top:5px; padding: 10px; color:#666;">Saved 1 month. Save next month to see trends.</div>`;
    } else {
      trendHtml = `<div style="font-size:14px; margin-top:5px; padding: 10px; color:#666;">No monthly history yet. Save a check-in above.</div>`;
    }

    html += `
      <div class="card" style="padding:15px; border:1px solid #ddd; box-shadow:none;">
        <h3 style="margin:0 0 5px 0;">${p.name}</h3>
        ${trendHtml}
        <div style="height:200px; margin-top:15px;">
          <canvas id="mc-${p.id}"></canvas>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;

  people.forEach(p => {
    const ph = monthlyHistory.filter(h => h.person_name === p.name).sort((a, b) => a.month_year.localeCompare(b.month_year));
    if (!ph.length) return; // Optional: still draw empty chart if 0 history

    const labels = ph.map(h => h.month_year);
    const tData = ph.map(h => h.trust_score);
    const rData = ph.map(h => h.risk_score);

    const ctx = document.getElementById(`mc-${p.id}`);
    if (ctx) {
      if (charts[`mc-${p.id}`]) charts[`mc-${p.id}`].destroy();
      charts[`mc-${p.id}`] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Trust %', data: tData, borderColor: '#3b82f6', backgroundColor: 'transparent', borderWidth: 2, tension: 0.1, pointRadius: 4 },
            { label: 'Risk %', data: rData, borderColor: '#ef4444', backgroundColor: 'transparent', borderWidth: 2, tension: 0.1, pointRadius: 4 }
          ]
        },
        options: {
          maintainAspectRatio: false,
          plugins: { legend: { display: true } },
          scales: { y: { min: 0, max: 100 } }
        }
      });
    }
  });
}

/* ---------- guide ---------- */
document.getElementById('guideTable').innerHTML = GUIDE_ROWS.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('');

/* ---------- validation & navigation ---------- */
function validateAndGo(currentTab, nextTab) {
  let isValid = true;
  let firstInvalid = null;

  if (currentTab === 'people') {
    if (people.length === 0) {
      customAlert("Please add at least one person before proceeding.");
      isValid = false;
    }
  } else if (currentTab === 'quality') {
    const person = document.getElementById('q-person').value;
    if (!person) {
      customAlert("Please select a person.");
      isValid = false;
    } else {
      const inputs = document.querySelectorAll('#qualityDims input[type="number"]');
      for (let input of inputs) {
        if (input.value === '') {
          isValid = false;
          input.style.border = "1px solid red";
          if (!firstInvalid) firstInvalid = input;
        } else {
          input.style.border = "";
        }
      }
      if (!isValid) {
        customAlert("Please fill all quality scores (1-10) before proceeding.");
        if (firstInvalid) firstInvalid.focus();
      }
    }
  } else if (currentTab === 'risk') {
    const person = document.getElementById('r-person').value;
    if (!person) {
      customAlert("Please select a person.");
      isValid = false;
    } else {
      const selects = document.querySelectorAll('#riskDims select');
      for (let sel of selects) {
        if (sel.value === '') {
          isValid = false;
          sel.style.border = "1px solid red";
          if (!firstInvalid) firstInvalid = sel;
        } else {
          sel.style.border = "";
        }
      }
      if (!isValid) {
        customAlert("Please fill all risk severity and confidence fields before proceeding.");
        if (firstInvalid) firstInvalid.focus();
      }
    }
  }

  if (isValid) {
    document.querySelector(`.tab-btn[data-tab="${nextTab}"]`).click();
  }
}

loadAll();
