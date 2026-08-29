const QK="totikao_import_questions",PK="totikao_import_progress";let qs=[],pg={},mode="home",arr=[],idx=0,done=false,timer=null,left=300,editing=null;
const $=x=>document.getElementById(x), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function makeBookmarklet(){
  const code = `javascript:(async()=>{try{
    const links=[...document.querySelectorAll('a[href]')]
      .map(a=>({u:a.href,t:(a.innerText||a.textContent||'').trim()}))
      .filter(x=>/^(問\\s*)?\\d+$/.test(x.t.split(/\\s+/)[0])||/^問\\s*\\d+/.test(x.t));
    const urls=[...new Map(links.map(x=>[x.u,x])).values()]
      .filter(x=>/\\/q\\d+\\/?(?:$|[?#])/.test(new URL(x.u,location.href).pathname));
    if(!urls.length){alert('問1〜問20のリンクを見つけられませんでした。令和7年度の「問題一覧」ページで実行してください。');return}
    urls.sort((a,b)=>{
      const na=Number((a.u.match(/\\/q(\\d+)\\/?/)||[])[1]);
      const nb=Number((b.u.match(/\\/q(\\d+)\\/?/)||[])[1]);
      return na-nb;
    });
    const year=(document.title.match(/令和\\d+年度|平成\\d+年度/)||['年度不明'])[0];
    const questions=[];
    for(const x of urls){
      try{
        const html=await (await fetch(x.u,{credentials:'same-origin',cache:'no-store'})).text();
        const doc=new DOMParser().parseFromString(html,'text/html');
        const cards=[...doc.querySelectorAll('.seo-choice-card')];
        const items=[];
        for(const card of cards){
          const labelEl=card.querySelector('.seo-label');
          const textEl=card.querySelector('.seo-choice-text');
          const ansEl=card.querySelector('.seo-answer');
          const id=(labelEl?.textContent||'').trim();
          const m=id.match(/^(R|H)\\d+-(\\d+)-([ア-ン])$/);
          if(!m||!textEl) continue;
          const answerText=(ansEl?.textContent||'').trim();
          items.push({
            id,
            label:m[3],
            text:(textEl.textContent||'').replace(/\\s+/g,' ').trim(),
            answer:/○/.test(answerText)
          });
        }
        items.sort((a,b)=>a.id.localeCompare(b.id,'ja',{numeric:true}));
        const no=Number((items[0]?.id.match(/^[RH]\\d+-(\\d+)-/)||[])[1]);
        if(no&&items.length) questions.push({no,items});
      }catch(e){}
    }
    questions.sort((a,b)=>a.no-b.no);
    if(!questions.length){
      alert('問題ページを取得できませんでした。元サイトの問題一覧ページで実行してください。');
      return;
    }
    const out={year,source:location.href,questions};
    await navigator.clipboard.writeText(JSON.stringify(out));
    alert(year+'：'+questions.length+'問・'+questions.reduce((n,q)=>n+q.items.length,0)+'肢をコピーしました。\\\\n自作アプリへ貼り付けてください。');
  }catch(e){alert('取り込み中にエラー：'+e.message)}})()`;
  const link=$("bm"); if(link) link.href=code;
}
function boot(){makeBookmarklet();qs=JSON.parse(localStorage.getItem(QK)||"null")||JSON.parse(JSON.stringify(INITIAL_QUESTIONS));pg=JSON.parse(localStorage.getItem(PK)||"{}");document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>show(b.dataset.v));$("yes").onclick=()=>ans(true);$("no").onclick=()=>ans(false);$("nx").onclick=()=>{idx++;drawQuiz()};$("parse").onclick=parseSource;$('paste').onclick=async()=>{try{$("src").value=await navigator.clipboard.readText()}catch(e){alert("クリップボードを読み取れませんでした")}};if($("jsonImport"))$("jsonImport").onclick=importJSON;$('copyCode').onclick=()=>navigator.clipboard.writeText($('bookmarklet').value).then(()=>alert("コピーしました"));$('clearSrc').onclick=()=>$("src").value="";$('add').onclick=()=>editQ();$('save').onclick=saveQ;$('cancel').onclick=()=>$("editor").classList.add("hidden");$('del').onclick=delQ;$('reset').onclick=reset;buildBookmarklet();show("home")}
function save(){localStorage.setItem(QK,JSON.stringify(qs));localStorage.setItem(PK,JSON.stringify(pg));status()}
function status(){let a=qs.flatMap(q=>q.items),d=a.filter(x=>(pg[x.id]?.streak||0)>=3).length;$("status").textContent=`${qs.length}問 / ${a.length}肢　・　復習完了 ${d}肢`}
function show(v){mode=v;if(timer){clearInterval(timer);timer=null}document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("active",b.dataset.v===v));["home","review","attack","quiz","import","edit"].forEach(x=>$(x).classList.toggle("hidden",x!==v));if(v==="home")home();if(v==="review")review();if(v==="attack")attack();if(v==="edit")editList()}
function home(){let ys=[...new Set(qs.map(q=>q.year))];$("home").innerHTML=`<div class=card><h2>年度順モード</h2>${ys.map(y=>`<button class=year data-y="${esc(y)}">${esc(y)}<br><small>${qs.filter(q=>q.year===y).length}問</small></button>`).join("")}</div>`;document.querySelectorAll(".year").forEach(b=>b.onclick=()=>start(qs.filter(q=>q.year===b.dataset.y),"year"))}
function review(){let a=qs.flatMap(q=>q.items.map(i=>({...i,year:q.year,no:q.no}))).filter(x=>(pg[x.id]?.streak||0)<3);$("review").innerHTML=`<div class=card><h2>復習モード</h2><p>3回連続正解していない肢を出題します。</p><p>対象：<b>${a.length}肢</b></p><button class=primary id=rs>開始</button></div>`;$("rs").onclick=()=>start(a,"review")}
function attack(){let a=qs.flatMap(q=>q.items.map(i=>({...i,year:q.year,no:q.no}))).sort(()=>Math.random()-.5);$("attack").innerHTML=`<div class=card><h2>タイムアタック</h2><p>5分。不正解で20秒減ります。</p><button class=primary id=as>開始</button></div>`;$("as").onclick=()=>start(a,"attack")}
function start(a,m){arr=m==="year"?a.flatMap(q=>q.items.map(i=>({...i,year:q.year,no:q.no}))):a;idx=0;mode=m;show("quiz");drawQuiz();if(m==="attack"){left=300;clock();timer=setInterval(()=>{left--;clock();if(left<=0)finish()},1000)}}
function clock(){let m=String(Math.floor(Math.max(0,left)/60)).padStart(2,"0"),s=String(Math.max(0,left)%60).padStart(2,"0");$("tm").textContent=mode==="attack"?`${m}:${s}`:""}
function drawQuiz(){if(idx>=arr.length)return finish();let x=arr[idx];done=false;$("qt").textContent=`${x.year}・問${x.no}・肢${x.label}`;$("qc").textContent=`${idx+1}/${arr.length}`;$("bar").style.width=((idx+1)/arr.length*100)+"%";$("st").innerHTML=`<div class=statement><b>肢${x.label}</b>　${esc(x.text)}</div>`;$("fb").innerHTML="";$("nx").classList.add("hidden");$("yes").disabled=$("no").disabled=false;clock()}
function ans(v){if(done)return;done=true;let x=arr[idx],p=pg[x.id]||{streak:0,total:0,correct:0},ok=v===x.answer;p.total++;if(ok){p.correct++;p.streak++;$("fb").innerHTML=`<p class=ok>正解！ 連続正解 ${p.streak}回</p>`}else{p.streak=0;if(mode==="attack")left=Math.max(0,left-20);$("fb").innerHTML=`<p class=ng>不正解。正解は「${x.answer?"○":"×"}」</p>`}pg[x.id]=p;save();$("yes").disabled=$("no").disabled=true;$("nx").classList.remove("hidden");clock()}
function finish(){if(timer){clearInterval(timer);timer=null}$("st").innerHTML="<div class=statement><b>終了</b></div>";$("fb").innerHTML="<p>お疲れさまでした。</p>";$("nx").classList.add("hidden")}
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
window.imp=n=>{const q=window._found[n],i=qs.findIndex(x=>x.year===q.year&&x.no===q.no);if(i>=0)qs[i]=q;else qs.push(q);save();home();$("importResult").innerHTML=`<p class=ok>${q.year}・問${q.no}を登録しました。${i>=0?"既存の問題を更新しました。":"新しい問題として追加しました。"}</p>`}
window.impAll=()=>{let added=0,updated=0;for(const q of(window._found||[])){const i=qs.findIndex(x=>x.year===q.year&&x.no===q.no);if(i>=0){qs[i]=q;updated++}else{qs.push(q);added++}}save();home();$("importResult").innerHTML=`<p class=ok>${window._found.length}問を取り込みました。新規追加 ${added}問・更新 ${updated}問。</p>`}
window.eQ=(y,n)=>editQ(qs.find(q=>q.year===y&&q.no===n));
function renderForms(its){$("forms").innerHTML=its.map((x,i)=>`<div class=if data-label="${esc(x.label)}" data-id="${esc(x.id||"")}"><h4>肢${esc(x.label)} <small>${esc(x.id||"")}</small></h4><label>問題文<textarea id=t${i} rows=3>${esc(x.text)}</textarea></label><label>正解<select id=a${i}><option value=true ${x.answer?"selected":""}>○</option><option value=false ${!x.answer?"selected":""}>×</option></select></label></div>`).join("")}
function editQ(q=null){editing=q?`${q.year}|${q.no}`:null;$("editor").classList.remove("hidden");$("ey").value=q?.year||$("iy").value;$("en").value=q?.no||((qs.at(-1)?.no||0)+1);renderForms(q?.items||["ア","イ","ウ","エ","オ"].map(label=>({label,text:"",answer:false,id:""})));$("addChoice").onclick=()=>{const labels=[..."アイウエオカキクケコサシスセソタチツテトナニヌネノ"];const used=[...document.querySelectorAll("#forms .if")].map(x=>x.dataset.label),label=labels.find(x=>!used.includes(x))||`肢${used.length+1}`;const its=[...document.querySelectorAll("#forms .if")].map((f,i)=>({label:f.dataset.label,text:$("t"+i).value,answer:$("a"+i).value==="true",id:f.dataset.id}));its.push({label,text:"",answer:false,id:""});renderForms(its)}}

function saveQ(){let y=$("ey").value,n=Number($("en").value),old=qs.find(q=>editing===`${q.year}|${q.no}`),forms=[...document.querySelectorAll("#forms .if")],its=forms.map((f,i)=>({id:f.dataset.id||`${y}-${n}-${f.dataset.label}`,label:f.dataset.label,text:$("t"+i).value,answer:$("a"+i).value==="true"})),q={year:y,no:n,items:its},i=qs.findIndex(x=>editing===`${x.year}|${x.no}`);if(i>=0)qs[i]=q;else qs.push(q);save();$("editor").classList.add("hidden");editList()}
function delQ(){if(!editing)return;let [y,n]=editing.split("|");qs=qs.filter(q=>!(q.year===y&&q.no===Number(n)));save();$("editor").classList.add("hidden");editList()}
function reset(){if(confirm("問題と進捗を初期状態に戻しますか？")){localStorage.removeItem(QK);localStorage.removeItem(PK);qs=JSON.parse(JSON.stringify(INITIAL_QUESTIONS));pg={};show("home");status()}}
boot();
