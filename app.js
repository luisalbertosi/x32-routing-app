const STORAGE_KEY = 'x32-routing-pro-shows-v1';
const DEFAULT_COLORS = ['#fff7d6','#e8f4ff','#eaf9ee','#fff0f0','#f3edff','#f7f7f7'];
let state = { activeId: crypto.randomUUID(), shows: {} };
let saveTimer;

function defaultShow(name = 'Untitled Show') {
  return {
    id: crypto.randomUUID(), name, date: new Date().toISOString().slice(0,10), venue: '', engineer: '',
    channels: Array.from({ length:32 }, (_,i) => ({ ch:i+1, item:'', inputType:'XLR', phantom:false, pan:'C', color:DEFAULT_COLORS[i % DEFAULT_COLORS.length], notes:'' }))
  };
}
function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { try { state = JSON.parse(raw); } catch {} }
  if (!state.shows || Object.keys(state.shows).length === 0) { const show = defaultShow('Main Worksheet'); state = { activeId: show.id, shows: { [show.id]: show } }; }
}
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); flashSaved(); }
function activeShow() { return state.shows[state.activeId]; }
function flashSaved() { const s = document.getElementById('saveStatus'); s.textContent='Saved'; setTimeout(()=>s.textContent='Auto-saves locally',1200); }
function queueSave() { document.getElementById('saveStatus').textContent='Saving...'; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 250); }

function renderShowSelect() {
  const sel = document.getElementById('showSelect'); sel.innerHTML='';
  Object.values(state.shows).forEach(show => { const opt=document.createElement('option'); opt.value=show.id; opt.textContent=show.name || 'Untitled Show'; sel.appendChild(opt); });
  sel.value = state.activeId;
}
function renderHeader() {
  const show = activeShow();
  showName.value = show.name; showDate.value = show.date; venue.value = show.venue; engineer.value = show.engineer;
}
function renderRows() {
  const tbody = document.getElementById('rows'); tbody.innerHTML='';
  const tpl = document.getElementById('rowTemplate');
  activeShow().channels.forEach((c, idx) => {
    const tr = tpl.content.firstElementChild.cloneNode(true); tr.dataset.index = idx; tr.style.setProperty('--row-color', c.color || '#ffffff');
    tr.querySelector('.channel').textContent = c.ch;
    tr.querySelector('.item').value = c.item;
    tr.querySelector('.inputType').value = c.inputType;
    tr.querySelector('.phantom').checked = c.phantom;
    tr.querySelector('.pan').value = c.pan;
    tr.querySelector('.color').value = c.color || '#ffffff';
    tr.querySelector('.notes').value = c.notes;
    tbody.appendChild(tr);
  });
}
function updateChannel(tr) {
  const c = activeShow().channels[Number(tr.dataset.index)];
  c.item = tr.querySelector('.item').value;
  c.inputType = tr.querySelector('.inputType').value;
  c.phantom = tr.querySelector('.phantom').checked;
  c.pan = tr.querySelector('.pan').value;
  c.color = tr.querySelector('.color').value;
  c.notes = tr.querySelector('.notes').value;
  tr.style.setProperty('--row-color', c.color);
  queueSave();
}
function bind() {
  document.getElementById('rows').addEventListener('input', e => updateChannel(e.target.closest('tr')));
  document.getElementById('rows').addEventListener('change', e => updateChannel(e.target.closest('tr')));
  [showName, showDate, venue, engineer].forEach(el => el.addEventListener('input', () => { const show=activeShow(); show.name=showName.value; show.date=showDate.value; show.venue=venue.value; show.engineer=engineer.value; renderShowSelect(); queueSave(); }));
  showSelect.addEventListener('change', () => { state.activeId=showSelect.value; renderHeader(); renderRows(); persist(); });
  newShowBtn.addEventListener('click', () => { const show=defaultShow('New Show'); state.shows[show.id]=show; state.activeId=show.id; renderAll(); persist(); });
  duplicateBtn.addEventListener('click', () => { const copy=JSON.parse(JSON.stringify(activeShow())); copy.id=crypto.randomUUID(); copy.name=(copy.name || 'Untitled') + ' Copy'; state.shows[copy.id]=copy; state.activeId=copy.id; renderAll(); persist(); });
  clearBtn.addEventListener('click', () => { if(confirm('Clear all 32 channel entries for this worksheet?')) { activeShow().channels = defaultShow().channels; renderRows(); persist(); } });
  printBtn.addEventListener('click', () => window.print());
  exportJsonBtn.addEventListener('click', exportJson);
  importJson.addEventListener('change', importJsonFile);
  searchBox.addEventListener('input', filterRows);
}
function filterRows() {
  const q = searchBox.value.toLowerCase();
  document.querySelectorAll('#rows tr').forEach(tr => { tr.classList.toggle('hidden', q && !tr.textContent.toLowerCase().includes(q) && ![...tr.querySelectorAll('input,select')].some(el => String(el.value).toLowerCase().includes(q))); });
}
function exportJson() {
  const blob = new Blob([JSON.stringify(activeShow(), null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (activeShow().name || 'x32-routing').replace(/[^a-z0-9]+/gi,'-') + '.json'; a.click(); URL.revokeObjectURL(a.href);
}
function importJsonFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { try { const imported = JSON.parse(reader.result); imported.id = crypto.randomUUID(); imported.channels = imported.channels?.slice(0,32) || defaultShow().channels; state.shows[imported.id]=imported; state.activeId=imported.id; renderAll(); persist(); } catch { alert('That file could not be imported.'); } };
  reader.readAsText(file); e.target.value='';
}
function renderAll(){ renderShowSelect(); renderHeader(); renderRows(); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
load(); renderAll(); bind(); flashSaved();
