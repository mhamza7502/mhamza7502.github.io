/* Populate dropdown and render; fetch EN/Audio live; keep font toggle; repeat+advance */

const duaSel = document.getElementById('duaSel');
const fontSel = document.getElementById('fontSel');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playBtn = document.getElementById('playBtn');
const rpt = document.getElementById('rpt');
const adv = document.getElementById('adv');
const audio = document.getElementById('audio');
const statusEl = document.getElementById('status');
const duaBox = document.getElementById('duaBox');

/* populate list */
for (const d of DUA_INDEX){
  const o=document.createElement('option');
  o.value=d.id; o.textContent=`${String(d.id).padStart(2,'0')} — ${d.title}`;
  duaSel.appendChild(o);
}
duaSel.value = DUA_INDEX[0].id;

/* helpers */
function httpsify(u){ return (u||"").replace(/^http:/i,"https:"); }

async function getAyahPack(ref){
  const url=`https://api.alquran.cloud/v1/ayah/${encodeURIComponent(ref)}/editions/quran-uthmani,en.sahih,ar.alafasy`;
  const r=await fetch(url); if(!r.ok) throw new Error(r.status);
  const j=await r.json(); if(j.status!=="OK") throw new Error("bad payload");
  const pack={ar:"",en:"",audio:""};
  for(const ed of j.data){
    const id=ed.edition?.identifier;
    if(id==="quran-uthmani") pack.ar=ed.text||"";
    if(id==="en.sahih")      pack.en=ed.text||"";
    if(id==="ar.alafasy")    pack.audio=httpsify(ed.audio||"");
  }
  return pack;
}

/* renderer */
async function renderDua(dua){
  duaBox.innerHTML = "";
  const card=document.createElement('div'); card.className="card";
  const title=document.createElement('div'); title.className="dua-title";
  title.textContent = `${dua.title} · ${dua.refs.join(", ")}`;
  card.appendChild(title);

  let arFull="", enFull="";
  const audioUrls=[];
  statusEl.textContent="Loading…";
  try{
    for(const ref of dua.refs){
      const pack=await getAyahPack(ref);
      arFull += (arFull?" ":"") + pack.ar;
      enFull += (enFull?" ":"") + pack.en;
      audioUrls.push(pack.audio||"");
    }
    statusEl.textContent="Loaded.";
  }catch(e){
    statusEl.textContent="Load error (network).";
  }

  const arDiv=document.createElement('div'); arDiv.className="dua-ar"; arDiv.textContent=arFull || "…";
  card.appendChild(arDiv);

  const enDiv=document.createElement('div'); enDiv.className="meaning";
  enDiv.innerHTML=`<h4>English Meaning</h4><p>${enFull || "…"}</p>`;
  card.appendChild(enDiv);

  const bnDiv=document.createElement('div'); bnDiv.className="meaning";
  bnDiv.innerHTML=`<h4>বাংলা অর্থ</h4><p style="font-size:1.04rem">${dua.bnFull}</p>`;
  card.appendChild(bnDiv);

  /* WBW (duplicate-by-design per your Option B) */
  const byRefWBW = [];
  for(const r of dua.refs){ if(WBW[r]) byRefWBW.push(...WBW[r]); }
  if(byRefWBW.length){
    const wbwWrap=document.createElement('div'); wbwWrap.className="wbw";
    const table=document.createElement('table');
    table.innerHTML=`<thead><tr><th>Bangla</th><th>English</th><th>Arabic</th></tr></thead>`;
    const tbody=document.createElement('tbody');
    for(const t of byRefWBW){
      const tr=document.createElement('tr');
      tr.innerHTML=`<td class="bn">${t.bn}</td><td class="en">${t.en}</td><td class="ar">${t.ar}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody); wbwWrap.appendChild(table); card.appendChild(wbwWrap);
  }

  duaBox.appendChild(card);

  /* audio controls */
  playBtn.onclick = () => {
    if(!audioUrls.length){ statusEl.textContent="No audio."; return; }
    let idx=0, loops=Math.max(1, Math.min(20, Number(rpt.value)||1));
    const playOne=()=>{ audio.src=audioUrls[idx]||""; audio.currentTime=0; audio.play().catch(()=>{}); };
    audio.onended=()=>{
      if(idx < audioUrls.length-1){ idx++; playOne(); return; }
      if(--loops>0){ idx=0; playOne(); return; }
      if(adv.checked){
        let i = DUA_INDEX.findIndex(x=> x.id==duaSel.value*1);
        if(i < DUA_INDEX.length-1){
          duaSel.value=DUA_INDEX[i+1].id; renderDua(DUA_INDEX[i+1]);
          setTimeout(()=>playBtn.click(), 300);
          return;
        }
      }
      statusEl.textContent="Done.";
    };
    playOne();
    statusEl.textContent="Playing…";
  };
}

/* nav */
function current(){ return DUA_INDEX.find(d=> d.id == duaSel.value*1); }
duaSel.addEventListener('change', ()=> renderDua(current()));
prevBtn.addEventListener('click', ()=>{ let i=DUA_INDEX.findIndex(d=> d.id==duaSel.value*1); i=Math.max(0,i-1); duaSel.value=DUA_INDEX[i].id; renderDua(DUA_INDEX[i]); });
nextBtn.addEventListener('click', ()=>{ let i=DUA_INDEX.findIndex(d=> d.id==duaSel.value*1); i=Math.min(DUA_INDEX.length-1,i+1); duaSel.value=DUA_INDEX[i].id; renderDua(DUA_INDEX[i]); });

/* font toggle */
const bodyEl=document.body;
function applyFont(){ 
  const v=fontSel.value;
  bodyEl.classList.toggle('ar-calcutta', v==='cal');
  bodyEl.classList.toggle('ar-uthmani', v!=='cal');
}
fontSel.addEventListener('change', applyFont);

/* init */
applyFont();
duaSel.value = 1;
renderDua(current());
