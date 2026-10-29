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
function modelLabel(models) {
  return el('p','model-label',`Planning: ${models.planner} · Text review: ${models.text_eval} · Listening: ${models.listener}`);
}
function planningPanel(c, comparison) {
  const section = el('section','planning-version');
  section.append(el('h4','','Qwen3.5-9B · Five-review planning run'), modelLabel(comparison.models));
  section.append(el('p','status-note',`${c.text_eval_responses}/5 text-review replies · Not accepted · Planning only — no new audio`));
  section.append(el('p','review-note',comparison.models.listener_status));
  if(c.supplemental_fifth_review) section.append(el('p','review-note','Includes a supplemental fifth text review with an updated reviewer prompt; the retained plan was not regenerated.'));
  if(c.retained_previous_executable) section.append(el('p','review-note','Last candidate was not executable; this is the previous executable plan, not an accepted final result.'));
  const details=el('details'), summary=el('summary','',`${c.events.length} planned events · start / end targets`);
  const content=el('div','planned-events');
  for(const e of c.events){
    const row=el('div','planned-event');
    row.append(el('strong','',`${e.id} · ${e.kind} · ${e.sound}`),el('span','',`${seconds(e.start)}–${seconds(e.end)} s`),el('small','',`Evidence: ${e.anchor}`),el('small','',`Start: ${e.start_anchor || '—'} → End: ${e.end_anchor || '—'}`));
    content.append(row);
  }
  details.append(summary,content);section.append(details);
  const link=el('a','plan-download','Download all 10 new plans (JSON)');link.href='data/planning-comparison.json';link.download='planning-comparison.json';section.append(link);
  return section;
}
function card(c, comparison) {
  const article = el('article','demo'); article.dataset.language = c.language; article.id = c.id;
  const head = el('div','demo-head'), title = el('div','demo-title'), titleCopy = el('div');
  const heading = el('h3','',c.title); heading.id = `title-${c.id}`; article.setAttribute('aria-labelledby',heading.id);
  titleCopy.append(heading,el('p','subtitle',c.subtitle)); title.append(el('span','case-id',c.id),titleCopy);
  head.append(title,el('div','meta',`${c.language === 'zh' ? '中文' : 'English'} · ${seconds(c.duration)} s · ${c.events.length} events`));
  const body = el('div','demo-body'), text = el('div'); const story = el('p','story',c.text); story.lang = c.language;
  text.append(el('p','text-label','ORIGINAL PASSAGE'),story);
  const column = el('div','players'); const mix = audioPlayer(c.mix,`${c.id} · PREVIOUS CLOUD DEMO · 2026-10-28`); const narration = audioPlayer(c.narration,`${c.id} · NARRATION ONLY`,true);
  const downloads = el('div','downloads'); for (const [label,path] of [['Download WAV',c.wav],['Event plan',c.plan]]) { const a = el('a','',label); a.href = path; a.download = ''; downloads.append(a); }
  const previous=el('section','audio-version');previous.append(el('h4','','Cloud models · Published audio'),modelLabel(comparison.previous_models),mix.wrap,narration.wrap,downloads,el('p','review-note',comparison.previous_models.assistance),el('p','review-note',`Review status: ${c.review_status}. ${c.note}`));
  column.append(previous,planningPanel(comparison.cases.find(p=>p.id===c.id),comparison)); body.append(text,column);
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
  details.append(summary,panel); article.append(head,body,details); return article;
}
async function init(){
  const list=document.getElementById('demo-list'), count=document.getElementById('result-count');
  try {
    const response=await fetch('data/cases.json', {cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    const comparisonResponse=await fetch('data/planning-comparison.json',{cache:'no-store'});if(!comparisonResponse.ok)throw new Error(`HTTP ${comparisonResponse.status}`);
    const comparison=await comparisonResponse.json();data.cases.forEach(c=>list.append(card(c,comparison)));count.textContent=`${data.cases.length} paired excerpts`;
    document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
      const language=button.dataset.filter;let visible=0;
      document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      list.querySelectorAll('.demo').forEach(c=>{c.hidden=language!=='all'&&c.dataset.language!==language;if(!c.hidden)visible++;else c.querySelectorAll('audio').forEach(a=>a.pause());});
      count.textContent=`${visible} excerpts`;
    }));
  } catch {count.textContent='Unable to load excerpts';const p=el('p','','Please refresh the page. For a local preview, serve this folder over HTTP rather than opening index.html directly.');list.append(p);}
}
init();
