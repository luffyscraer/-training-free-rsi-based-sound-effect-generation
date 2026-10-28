'use strict';
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const colors = {short:'#bc7037', process:'#54725c', bed:'#6976a7', voice:'#9b6179'};
const seconds = n => Number(n).toFixed(1);
const players = [];
function audioPlayer(src, label, reference = false) {
  const wrap = el('div');
  const caption = el('p', 'player-label' + (reference ? ' reference' : ''), label);
  if (!reference) caption.prepend(el('span','dot'));
  const audio = el('audio'); audio.controls = true; audio.preload = 'none'; audio.src = src; audio.setAttribute('aria-label',label);
  const message = el('p','play-error'); message.hidden = true;
  audio.addEventListener('play', () => players.forEach(p => { if(p !== audio) p.pause(); }));
  audio.addEventListener('error', () => { message.textContent = 'Unable to load audio. Please try the WAV download.'; message.hidden = false; });
  players.push(audio); wrap.append(caption,audio,message); return {wrap,audio,message};
}
function card(c) {
  const article = el('article','demo'); article.dataset.language = c.language; article.id = c.id;
  const head = el('div','demo-head'), title = el('div','demo-title'), titleCopy = el('div');
  const heading = el('h3','',c.title); heading.id = `title-${c.id}`; article.setAttribute('aria-labelledby',heading.id);
  titleCopy.append(heading,el('p','subtitle',c.subtitle)); title.append(el('span','case-id',c.id),titleCopy);
  head.append(title,el('div','meta',`${c.language === 'zh' ? '中文' : 'English'} · ${seconds(c.duration)} s · ${c.events.length} events`));
  const body = el('div','demo-body'), text = el('div'); const story = el('p','story',c.text); story.lang = c.language;
  text.append(el('p','text-label','ORIGINAL PASSAGE'),story);
  const column = el('div','players'); const mix = audioPlayer(c.mix,`${c.id} · LATEST SOUND DESIGN`); const narration = audioPlayer(c.narration,`${c.id} · NARRATION ONLY`,true);
  if(c.review_status === 'NEEDS_HUMAN_LISTENING') column.append(el('p','play-error','待确认 / Listening review pending: the paperweight timing is corrected, but its perceptual identity remains unresolved.'));
  const downloads = el('div','downloads'); for (const [label,path] of [['Download WAV',c.wav],['Event plan',c.plan]]) { const a = el('a','',label); a.href = path; a.download = ''; downloads.append(a); }
  column.append(mix.wrap,narration.wrap,downloads); body.append(text,column);
  const details = el('details','event-details'), summary = el('summary','',`Explore ${c.events.length} sound events`); summary.append(el('span','','Text anchors & rendered timeline →'));
  const panel = el('div','event-panel'), legend = el('div','legend'); for (const [kind,color] of Object.entries(colors)) {const label = el('span','',kind); const dot = el('i'); dot.style.backgroundColor=color;label.prepend(dot);legend.append(label);}
  panel.append(legend);
  for (const e of c.events) {
    const row = el('button','event-row'); row.type='button'; row.setAttribute('aria-label',`Play ${e.sound} at ${seconds(e.start)} seconds`);
    const name = el('span','event-name',e.sound); const anchor = el('small','',e.anchor); anchor.lang=c.language; name.append(anchor);
    const track = el('span','track'), segment = el('span','segment'); segment.style.left=`${100*e.start/c.duration}%`;segment.style.width=`${100*(e.end-e.start)/c.duration}%`;segment.style.backgroundColor=colors[e.kind] || colors.short;track.append(segment);
    row.append(name,track,el('span','time',`${seconds(e.start)}–${seconds(e.end)}s`));
    row.addEventListener('click',async()=>{try { mix.audio.currentTime=e.start; await mix.audio.play(); } catch {mix.message.textContent='Press the audio player’s play button to start listening.';mix.message.hidden=false;} });
    mix.audio.addEventListener('timeupdate',()=>row.classList.toggle('active',!mix.audio.paused && mix.audio.currentTime>=e.start && mix.audio.currentTime<e.end));
    mix.audio.addEventListener('pause',()=>row.classList.remove('active'));
    panel.append(row);
  }
  const note = el('p','review-note'); note.append(el('strong','','Listening note. '),document.createTextNode(c.note)); panel.append(note);
  details.append(summary,panel); article.append(head,body,details); return article;
}
async function init(){
  const list=document.getElementById('demo-list'), count=document.getElementById('result-count');
  try {
    const response=await fetch('data/cases.json', {cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();data.cases.forEach(c=>list.append(card(c)));count.textContent=`${data.cases.length} excerpts`;
    document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
      const language=button.dataset.filter;let visible=0;
      document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      list.querySelectorAll('.demo').forEach(c=>{c.hidden=language!=='all'&&c.dataset.language!==language;if(!c.hidden)visible++;else c.querySelectorAll('audio').forEach(a=>a.pause());});
      count.textContent=`${visible} excerpts`;
    }));
  } catch {count.textContent='Unable to load excerpts';const p=el('p','','Please refresh the page. For a local preview, serve this folder over HTTP rather than opening index.html directly.');list.append(p);}
}
init();
