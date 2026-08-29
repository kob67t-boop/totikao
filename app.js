const QK="totikao_import_questions",PK="totikao_import_progress";let qs=[],pg={},mode="home",arr=[],idx=0,done=false,timer=null,left=300,editing=null,attackResults=[],attackFinished=false;
const $=x=>document.getElementById(x), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function makeBookmarklet(){
  const code = `javascript:(async()=>{try{
    const m=location.pathname.match(/\\/(r|h)(\\d{2})(?:\\/|$)/i);
    if(!m){alert('令和・平成の年度問題一覧ページで実行してください。');return}
    const prefix=m[1].toUpperCase()+m[2];
    const year=(m[1].toLowerCase()==='r'?'令和':'平成')+parseInt(m[2],10)+'年度';
    const labels=['ア','イ','ウ','エ','オ','カ','キ','ク','ケ','コ','サ','シ','ス','セ','ソ','タ','チ','ツ','テ','ト'];
    const indexBase=new URL('.',location.href).href;
    const candidates=new Map();
    [...document.querySelectorAll('a[href]')].forEach(a=>{try{const u=new URL(a.href,location.href),m2=u.pathname.match(/\\/q(\\d+)(?:\\/|\\.html?|$)/i);if(m2)candidates.set(Number(m2[1]),u.href)}catch(e){}});
    for(let n=1;n<=30;n++)if(!candidates.has(n))candidates.set(n,[new URL('q'+n+'/',indexBase).href,new URL('q'+n+'.html',indexBase).href,new URL('q'+n+'/index.html',indexBase).href]);
    async function getDoc(n){const v=candidates.get(n),list=Array.isArray(v)?v:[v];for(const u of list){try{const r=await fetch(u,{credentials:'same-origin',cache:'no-store'});if(r.ok){const t=await r.text();if(t.length>500)return new DOMParser().parseFromString(t,'text/html')}}catch(e){}}return null}
    const tx=e=>(e?.textContent||'').replace(/\\s+/g,' ').trim();
    function parseItems(doc,n){let cards=[...doc.querySelectorAll('.seo-choice-card')];if(!cards.length)cards=[...doc.querySelectorAll('.seo-label')].map(x=>x.closest('.seo-choice-card')||x.parentElement).filter(Boolean);if(!cards.length){const es=[...doc.querySelectorAll('body *')].filter(x=>/^(?:R|H)\\d+-\\d+-[ア-ン]$/.test(tx(x))&&x.children.length===0);cards=es.map(x=>x.closest('article,section,li,div')||x.parentElement).filter(Boolean)}const seen=new Set(),items=[];cards.forEach(card=>{if(seen.has(card))return;seen.add(card);let choice=card.querySelector('.seo-choice-text,[class*="choice-text"]');if(!choice){const ts=[...card.querySelectorAll('p,div,span,li')];choice=ts.find(x=>tx(x)&&!/(?:R|H)\\d+-\\d+-[ア-ン]/.test(tx(x))&&!/^(?:解答|出典)/.test(tx(x)))}const raw=tx(card.querySelector('.seo-label'))||tx(card).match(/(?:R|H)\\d+-\\d+-[ア-ン]/)?.[0]||'';if(!choice||!/(?:R|H)\\d+-\\d+-[ア-ン]/.test(raw))return;const ans=tx(card.querySelector('.seo-answer,[class*="answer"]'))||tx(card);const pos=items.length,label=labels[pos]||String(pos+1);items.push({id:prefix+'-'+n+'-'+label,label,text:tx(choice),answer=/解答[^○×]{0,10}○/.test(ans)||/正解[^○×]{0,10}○/.test(ans)||/^○/.test(ans)})});return items}
    const questions=[],missing=[];for(let n=1;n<=30;n++){const doc=await getDoc(n);if(!doc){missing.push(n);continue}const items=parseItems(doc,n);if(items.length)questions.push({no:n,items});else missing.push(n)}questions.sort((a,b)=>a.no-b.no);if(!questions.length){alert('問題を1問も取得できませんでした。');return}const total=questions.reduce((a,q)=>a+q.items.length,0);await navigator.clipboard.writeText(JSON.stringify({year,source:location.href,questions}));alert(year+'：'+questions.length+'問・'+total+'肢をコピーしました。'+(missing.length?'\\n取得できなかった問：'+missing.join(', '):'' )+'\\n肢IDは取得順から自動生成しています。');
  }catch(e){alert('取り込み中にエラー：'+e.message)}})()`;
  const link=$("bm");if(link)link.href=code;
}
function boot(){makeBookmarklet();try{qs=JSON.parse(localStorage.getItem(QK)||"null")||JSON.parse(JSON.stringify(INITIAL_QUESTIONS));}catch(e){qs=JSON.parse(JSON.stringify(INITIAL_QUESTIONS));}pg=JSON.parse(localStorage.getItem(PK)||"{}");document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>show(b.dataset.v));$("yes").onclick=()=>ans(true);$("no").onclick=()=>ans(false);$("nx").onclick=()=>{idx++;drawQuiz()};$("parse").onclick=parseSource;$('paste').onclick=async()=>{try{$("src").value=await navigator.clipboard.readText()}catch(e){alert("クリップボードを読み取れませんでした")}};if($("jsonImport"))$("jsonImport").onclick=importJSON;$('copyCode').onclick=()=>navigator.clipboard.writeText($('bookmarklet').value).then(()=>alert("コピーしました"));$('clearSrc').onclick=()=>$("src").value="";$('add').onclick=()=>editQ();$('save').onclick=saveQ;$('cancel').onclick=()=>$("editor").classList.add("hidden");$('del').onclick=delQ;$('reset').onclick=reset;buildBookmarklet();show("home")}
function save(){localStorage.setItem(QK,JSON.stringify(qs));localStorage.setItem(PK,JSON.stringify(pg));status()}
function status(){let a=qs.flatMap(q=>q.items),d=a.filter(x=>(pg[x.id]?.streak||0)>=3).length;$("status").textContent=`${qs.length}問 / ${a.length}肢　・　復習完了 ${d}肢`}
function show(v){mode=v;if(timer){clearInterval(timer);timer=null}document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("active",b.dataset.v===v));["home","review","attack","quiz","import","edit"].forEach(x=>$(x).classList.toggle("hidden",x!==v));if(v==="home")home();if(v==="review")review();if(v==="attack")attack();if(v==="edit")editList()}
function home(){let ys=[...new Set(qs.map(q=>q.year))];$("home").innerHTML=`<div class=card><h2>年度順モード</h2>${ys.map(y=>`<button class=year data-y="${esc(y)}">${esc(y)}<br><small>${qs.filter(q=>q.year===y).length}問</small></button>`).join("")}</div>`;document.querySelectorAll(".year").forEach(b=>b.onclick=()=>start(qs.filter(q=>q.year===b.dataset.y),"year"))}
function review(){let a=qs.flatMap(q=>q.items.map(i=>({...i,year:q.year,no:q.no}))).filter(x=>(pg[x.id]?.streak||0)<3);$("review").innerHTML=`<div class=card><h2>復習モード</h2><p>3回連続正解していない肢を出題します。</p><p>対象：<b>${a.length}肢</b></p><button class=primary id=rs>開始</button></div>`;$("rs").onclick=()=>start(a,"review")}
function attack(){
  const a=qs.flatMap(q=>q.items.map(i=>({...i,year:q.year,no:q.no}))).sort(()=>Math.random()-.5);
  $("attack").innerHTML=`<div class=card>
    <h2>タイムアタック</h2>
    <div class=attackTimerPreview>05:00</div>
    <p>制限時間5分。不正解で20秒減ります。</p>
    <p class=hint>回答するとすぐ次の問題へ進みます。終了後に正答・誤答と間違えた問題を確認できます。</p>
    <button class="primary attackStart" id="as">開始</button>
  </div>`;
  $("as").onclick=()=>start(a,"attack");
}
function start(a,m){
  arr=m==="year"?a.flatMap(q=>q.items.map(i=>({...i,year:q.year,no:q.no}))):a;
  idx=0;mode=m;attackResults=[];attackFinished=false;
  if(timer){clearInterval(timer);timer=null}
  if(m==="attack") left=300;
  show("quiz");
  drawQuiz();
  if(m==="attack"){
    clock();
    timer=setInterval(()=>{left--;clock();if(left<=0)finish()},1000);
  }
}
function clock(){
  const m=String(Math.floor(Math.max(0,left)/60)).padStart(2,"0");
  const sec=String(Math.max(0,left)%60).padStart(2,"0");
  const tm=$("tm");
  if(tm){
    tm.textContent=mode==="attack"?`${m}:${sec}`:"";
    tm.classList.toggle("timerCritical",mode==="attack"&&left<=60);
  }
}
function drawQuiz(){
  if(idx>=arr.length){finish();return}
  let x=arr[idx];done=false;
  $("qt").textContent=`${x.year}・問${x.no}・肢${x.label}`;
  $("qc").textContent=`${idx+1}/${arr.length}`;
  $("bar").style.width=((idx+1)/arr.length*100)+"%";
  $("st").innerHTML=`<div class=statement><b>肢${esc(x.label)}</b>　${esc(x.text)}</div>`;
  $("fb").innerHTML="";
  $("nx").classList.toggle("hidden",mode==="attack");
  $("yes").disabled=$("no").disabled=false;
  clock();
}
function ans(v){
  if(done||attackFinished)return;
  done=true;
  let x=arr[idx],p=pg[x.id]||{streak:0,total:0,correct:0},ok=v===x.answer;
  p.total++;
  if(ok){p.correct++;p.streak++}else{p.streak=0}
  pg[x.id]=p;save();

  if(mode==="attack"){
    attackResults.push({x,ok,answered:true});
    if(!ok) left=Math.max(0,left-20);
    clock();
    $("yes").disabled=$("no").disabled=true;
    // Briefly flash the result, then immediately advance.
    $("fb").innerHTML=ok?`<p class=ok>○ 正解</p>`:`<p class=ng>× 不正解</p>`;
    setTimeout(()=>{
      if(attackFinished)return;
      idx++;
      if(left<=0){finish();return}
      drawQuiz();
    },180);
    return;
  }

  if(ok)$("fb").innerHTML=`<p class=ok>正解！ 連続正解 ${p.streak}回</p>`;
  else $("fb").innerHTML=`<p class=ng>不正解。正解は「${x.answer?"○":"×"}」</p>`;
  $("yes").disabled=$("no").disabled=true;
  $("nx").classList.remove("hidden");
  clock();
}
function finish(){
  if(attackFinished)return;
  attackFinished=true;
  if(timer){clearInterval(timer);timer=null}
  if(mode==="attack"){
    const correct=attackResults.filter(r=>r.ok).length;
    const wrong=attackResults.filter(r=>!r.ok).length;
    const unanswered=Math.max(0,arr.length-attackResults.length);
    const rate=attackResults.length?Math.round(correct/attackResults.length*100):0;
    $("qt").textContent="タイムアタック結果";
    $("qc").textContent=`${attackResults.length}/${arr.length}回答`;
    $("tm").textContent="終了";
    $("tm").classList.remove("timerCritical");
    $("bar").style.width="100%";
    $("st").innerHTML=`<div class="attackResult">
      <h2>終了！</h2>
      <div class="scoreGrid">
        <div><b>${correct}</b><small>正答</small></div>
        <div><b>${wrong}</b><small>誤答</small></div>
        <div><b>${unanswered}</b><small>未回答</small></div>
        <div><b>${rate}%</b><small>正答率</small></div>
      </div>
      <h3>間違えた問題</h3>
      ${wrong?`<ol class="wrongList">${attackResults.filter(r=>!r.ok).map(r=>`<li><b>${esc(r.x.year)}・問${r.x.no}・肢${esc(r.x.label)}</b><div>${esc(r.x.text)}</div><small>正解：${r.x.answer?"○":"×"}</small></li>`).join("")}</ol>`:`<p class="ok">誤答はありません。全問正解です！</p>`}
      ${unanswered?`<p class=hint>時間切れ等による未回答：${unanswered}問</p>`:""}
    </div>`;
    $("fb").innerHTML="";
    $("nx").classList.add("hidden");
    $("yes").disabled=$("no").disabled=true;
  }else{
    $("st").innerHTML="<div class=statement><b>終了</b></div>";
    $("fb").innerHTML="<p>お疲れさまでした。</p>";
    $("nx").classList.add("hidden");
  }
}
function importJSON(){
  try{
    const d=JSON.parse($("src").value);
    if(!d || !Array.isArray(d.questions)) throw new Error("questions がありません");
    window._found=d.questions.map(q=>({
      year:d.year||$("iy").value,no:Number(q.no),
      items:(q.items||[]).map(x=>({id:x.id,label:x.label,text:x.text,answer:x.answer===true||x.answer==="○"}))
    })).filter(q=>q.items.length);
    const total=window._found.reduce((a,q)=>a+q.items.length,0);
    $("importResult").innerHTML=`<div class=result><p class=ok>${window._found.length}問・${total}肢を読み込みました。元サイトIDも保持しています。</p><button class=primary onclick="window.impAll()">この${window._found.length}問を全部登録</button></div>`;
  }catch(e){$("importResult").innerHTML=`<p class=ng>JSONを読み込めませんでした：${esc(e.message)}</p>`}
}
function parseSource(){
  const html=$("src").value;if(!html.trim()){alert("元サイトのHTMLまたはコピーした本文を貼り付けてください");return}
  const year=$("iy").value,doc=new DOMParser().parseFromString(html,"text/html"),records=[];
  for(const el of [...doc.querySelectorAll("[id]")]){
    const m=(el.id||"").match(/^(R|H)\d+-(\d+)-([ア-ン])$/);if(!m)continue;
    const no=+m[2],label=m[3];let parts=[],answer=null,cur=el.nextElementSibling;
    for(let k=0;k<40&&cur;k++,cur=cur.nextElementSibling){const t=(cur.innerText||cur.textContent||"").trim();if(!t)continue;if(/^(R|H)\d+-\d+-[ア-ン]$/.test(t))break;const am=t.match(/解答\s*[:：]?\s*([○×])/);if(am){answer=am[1]==="○";break}if(/^出典\s*[:：]/.test(t)||/^[ア-ン]$/.test(t))continue;parts.push(t)}
    const text=parts.join(" ").replace(/\s+/g," ").trim();if(text)records.push({id:el.id,label,no,text,answer})
  }
  if(!records.length){const lines=(doc.body?.innerText||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);for(let i=0;i<lines.length;i++){const m=lines[i].match(/^((?:R|H)\d+)-(\d+)-([ア-ン])$/);if(!m)continue;const id=lines[i],no=+m[2],label=m[3];let parts=[],answer=null;for(let j=i+1;j<Math.min(lines.length,i+50);j++){if(/^(?:R|H)\d+-\d+-[ア-ン]$/.test(lines[j]))break;const am=lines[j].match(/^解答\s*[:：]?\s*([○×])/);if(am){answer=am[1]==="○";break}if(!/^出典\s*[:：]/.test(lines[j]))parts.push(lines[j])}const text=parts.join(" ").replace(/\s+/g," ").trim();if(text)records.push({id,label,no,text,answer})}}
  const map=new Map();for(const r of records){if(!map.has(r.no))map.set(r.no,{year,no:r.no,items:[]});const q=map.get(r.no);if(!q.items.some(x=>x.id===r.id))q.items.push(r)}
  const found=[...map.values()].filter(q=>q.items.length),total=found.reduce((a,q)=>a+q.items.length,0);if(!found.length){$("importResult").innerHTML="<p class=ng>R7-1-ア のようなIDを検出できませんでした。</p>";return}
  window._found=found;$("importResult").innerHTML=`<div class=result><p class=ok>${found.length}問・${total}肢を検出しました。肢数は自動判定します。</p>${found.map((q,n)=>`<button onclick="window.imp(${n})">${esc(q.year)} 問${q.no}（${q.items.length}肢）</button>`).join("")}<br><button class=primary onclick="window.impAll()">検出した${found.length}問を全部登録</button></div>`
}
window.imp=n=>{const q=window._found[n],i=qs.findIndex(x=>x.year===q.year&&x.no===q.no);if(i>=0)qs[i]=q;else qs.push(q);save();status();$("importResult").innerHTML=`<p class=ok>${q.year}・問${q.no}を登録しました。${i>=0?"既存の問題を更新しました。":"新しい問題として追加しました。"}</p>`}
window.impAll=()=>{let added=0,updated=0;for(const q of(window._found||[])){const i=qs.findIndex(x=>x.year===q.year&&x.no===q.no);if(i>=0){qs[i]=q;updated++}else{qs.push(q);added++}}save();status();$("importResult").innerHTML=`<p class=ok>${window._found.length}問を取り込みました。新規追加 ${added}問・更新 ${updated}問。</p>`}
window.eQ=(y,n)=>editQ(qs.find(q=>q.year===y&&q.no===n));
function renderForms(its){$("forms").innerHTML=its.map((x,i)=>`<div class=if data-label="${esc(x.label)}" data-id="${esc(x.id||"")}"><h4>肢${esc(x.label)} <small>${esc(x.id||"")}</small></h4><label>問題文<textarea id=t${i} rows=3>${esc(x.text)}</textarea></label><label>正解<select id=a${i}><option value=true ${x.answer?"selected":""}>○</option><option value=false ${!x.answer?"selected":""}>×</option></select></label></div>`).join("")}
function editList(){
  const el=$("elist");
  if(!el)return;
  if(!qs.length){
    el.innerHTML=`<div class="card"><p>問題データがありません。</p><p class="hint">「問題取り込み」から問題を登録してください。</p></div>`;
    return;
  }
  const years=[...new Set(qs.map(q=>q.year))];
  el.innerHTML=years.map(y=>`
    <div class="editYear">
      <h3>${esc(y)} <small>${qs.filter(q=>q.year===y).length}問</small></h3>
      ${qs.filter(q=>q.year===y).sort((a,b)=>a.no-b.no).map(q=>`
        <div class="editItem">
          <div><b>問${q.no}</b><span>${q.items.length}肢</span></div>
          <button class="small" onclick="window.eQ(${JSON.stringify(y)},${q.no})">編集</button>
        </div>`).join("")}
    </div>`).join("");
}
function editQ(q=null){editing=q?`${q.year}|${q.no}`:null;$("editor").classList.remove("hidden");$("ey").value=q?.year||$("iy").value;$("en").value=q?.no||((qs.at(-1)?.no||0)+1);renderForms(q?.items||["ア","イ","ウ","エ","オ"].map(label=>({label,text:"",answer:false,id:""})));$("addChoice").onclick=()=>{const labels=[..."アイウエオカキクケコサシスセソタチツテトナニヌネノ"];const used=[...document.querySelectorAll("#forms .if")].map(x=>x.dataset.label),label=labels.find(x=>!used.includes(x))||`肢${used.length+1}`;const its=[...document.querySelectorAll("#forms .if")].map((f,i)=>({label:f.dataset.label,text:$("t"+i).value,answer:$("a"+i).value==="true",id:f.dataset.id}));its.push({label,text:"",answer:false,id:""});renderForms(its)}}

function saveQ(){let y=$("ey").value,n=Number($("en").value),old=qs.find(q=>editing===`${q.year}|${q.no}`),forms=[...document.querySelectorAll("#forms .if")],its=forms.map((f,i)=>({id:f.dataset.id||`${y}-${n}-${f.dataset.label}`,label:f.dataset.label,text:$("t"+i).value,answer:$("a"+i).value==="true"})),q={year:y,no:n,items:its},i=qs.findIndex(x=>editing===`${x.year}|${x.no}`);if(i>=0)qs[i]=q;else qs.push(q);save();$("editor").classList.add("hidden");editList()}
function delQ(){if(!editing)return;let [y,n]=editing.split("|");qs=qs.filter(q=>!(q.year===y&&q.no===Number(n)));save();$("editor").classList.add("hidden");editList()}
function exportData(){
  const text="window.INITIAL_QUESTIONS="+JSON.stringify(qs,null,2)+";";
  const blob=new Blob([text],{type:"text/javascript;charset=utf-8"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="questions.js";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  alert("現在の問題データを書き出しました。GitHub Pagesでも同じ問題を表示したい場合は、このquestions.jsをリポジトリのquestions.jsと差し替えてください。");
}
function reset(){if(confirm("問題と進捗を初期状態に戻しますか？")){localStorage.removeItem(QK);localStorage.removeItem(PK);qs=JSON.parse(JSON.stringify(INITIAL_QUESTIONS));pg={};show("home");status()}}
boot();
