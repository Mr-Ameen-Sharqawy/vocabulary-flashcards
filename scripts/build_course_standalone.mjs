/**
 * Emits a dependency-free HTML study deck from the normalized course data.
 */
import fs from "node:fs";

const course = JSON.parse(fs.readFileSync("/home/ubuntu/vocabulary-flashcards/prim4_course_cards.json", "utf8"));
const outputPath = "/home/ubuntu/vocabulary-flashcards/Sense_Lab_Flashcards_Standalone.html";

const unitMeta = {
  1: { title: "Our Amazing Senses", arabic: "حواسنا وصحتنا", image: "/manus-storage/unit-1-senses-health_31f52044.jpg", color: "#f4c84a" },
  2: { title: "Our Community", arabic: "مجتمعنا وثقافتنا", image: "/manus-storage/unit-2-community-culture_81c52bc7.jpg", color: "#70c6b5" },
  3: { title: "Amazing Animals", arabic: "عالم الحيوانات", image: "/manus-storage/unit-3-animals_f39e0b34.jpg", color: "#ef8a75" },
  4: { title: "Explore Egypt", arabic: "اكتشف مصر", image: "/manus-storage/unit-4-egypt-places_f2e501cd.jpg", color: "#9cb8e6" },
  5: { title: "Jobs and Homes", arabic: "المهن والبيوت", image: "/manus-storage/unit-5-jobs-home_8c5f535a.jpg", color: "#d9a7d0" },
  6: { title: "Story Time", arabic: "وقت القصة", image: "/manus-storage/unit-6-hundred-dresses_054b709c.jpg", color: "#f0a24b" },
};

const cartoonImages = {
  "a 10-year-old girl": "/manus-storage/cartoon-001-a-10-year-old-girl_95c6f15b.jpg",
  absent: "/manus-storage/cartoon-002-absent_daeeb2c1.jpg",
  "acts of kindness": "/manus-storage/cartoon-003-acts-of-kindness_5381a778.jpg",
  adventure: "/manus-storage/cartoon-004-adventure_d89f1ec0.jpg",
  "air pollution": "/manus-storage/cartoon-005-air-pollution_87f66d22.jpg",
  alarm: "/manus-storage/cartoon-006-alarm_bbe16d5e.jpg",
  amazing: "/manus-storage/cartoon-007-amazing_57c0b649.jpg",
  announce: "/manus-storage/cartoon-008-announce_947a2fb4.jpg",
  annoying: "/manus-storage/cartoon-009-annoying_9c6ce672.jpg",
  annual: "/manus-storage/cartoon-010-annual_c53bc7ed.jpg",
};

Object.assign(
  cartoonImages,
  JSON.parse(fs.readFileSync("/home/ubuntu/vocabulary-flashcards/uploaded_cartoon_images.json", "utf8")),
);

const originalUnitOneImages = {
  taste: "/manus-storage/Tasting_slice_of_cake_202608192114_501e40d8.jpeg",
  touch: "/manus-storage/Handprint_on_misty_glass_202608192114_c47d90bc.jpeg",
  hearing: "/manus-storage/Sound_waves_entering_human_ear_202608192114_11c39631.jpeg",
  sight: "/manus-storage/Human_eye_reflecting_landscape_202608192114_bc6013a8.jpeg",
  smell: "/manus-storage/Person_smelling_rose_202608192114_7a6d8a2a.jpeg",
  fire: "/manus-storage/Campfire_glowing_at_night_202608192114_d1e1ce48.jpeg",
  smoke: "/manus-storage/White_smoke_swirling_on_dark_202608192114_5fef98e7.jpeg",
  voices: "/manus-storage/Abstract_visualization_of_voices_202608192114_d957662e.jpeg",
  tongue: "/manus-storage/Pink_tongue_showing_202608192114_df781eb6.jpeg",
  soft: "/manus-storage/Hands_feeling_soft_velvet_fabric_202608192114_878332f8.jpeg",
  butterflies: "/manus-storage/Butterflies_fluttering_in_meadow_202608192114_f2470ef1.jpeg",
  excellent: "/manus-storage/Gold_medal_rating_symbol_202608192114_730125a0.jpeg",
  colorful: "/manus-storage/Multicolored_paints_splashing_202608192114_8d02a10f.jpeg",
  hard: "/manus-storage/Close-up_of_granite_rock_202608192114_0a756bdf.jpeg",
  "loud noise": "/manus-storage/Person_covering_ears_near_speaker_202608192114_5fd77868.jpeg",
  "learn about": "/manus-storage/learn-about_166096c8.jpeg",
  "stay safe": "/manus-storage/Protective_shield_or_home_shelter_202608192114_0e6599e8.jpeg",
  "what a beautiful day": "/manus-storage/Sunlit_landscape_with_green_hills_202608192114_119f5e97.jpeg",
  "talk about": "/manus-storage/Two_silhouettes_in_conversation_202608192114_7b8c01c6.jpeg",
  use: "/manus-storage/Hand_holding_and_using_pencil_202608192114_050a0ab2.jpeg",
  used: "/manus-storage/Vintage_record_player_playing_music_202608192114_be6002f0.jpeg",
  tasted: "/manus-storage/Tasting_slice_of_cake_202608192114_501e40d8.jpeg",
  touched: "/manus-storage/Handprint_on_misty_glass_202608192114_c47d90bc.jpeg",
  hear: "/manus-storage/Child_listening_to_seashell_202608192114_4fe86a6b.jpeg",
  heard: "/manus-storage/Old_radio_transmitting_sound_waves_202608192114_a4178750.jpeg",
  sing: "/manus-storage/sing_058de30d.jpeg",
  sang: "/manus-storage/sing_058de30d.jpeg",
  understand: "/manus-storage/Lightbulb_appearing_above_head_202608192114_37cadbb5.jpeg",
  understood: "/manus-storage/checkmark_fe1b2568.jpeg",
};

function imageKey(term) {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const lessons = course.lessons.map((lesson) => {
  const meta = unitMeta[lesson.unit];
  return {
    id: `unit-${lesson.unit}-lesson-${String(lesson.lesson).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    unit: lesson.unit,
    lesson: String(lesson.lesson),
    unitTitle: meta.title,
    unitArabic: meta.arabic,
    color: meta.color,
    title: lesson.lessonTitle.replace(/^Lesson\s*\d+\s*:\s*/i, "").replace(/^Lessons\s*\d+\s*&\s*\d+\s*:\s*/i, ""),
    image: meta.image,
    cards: lesson.cards.map((card) => {
      const key = imageKey(card.term);
      const originalImage = lesson.unit === 1 && String(lesson.lesson) === "1" ? originalUnitOneImages[key] : undefined;
      return { ...card, image: originalImage ?? cartoonImages[key] ?? meta.image };
    }),
  };
});

const template = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="theme-color" content="#173a63" />
  <title>Vocabulary Flashcards · Primary 4</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Noto+Kufi+Arabic:wght@400;600;700;800&family=Nunito+Sans:opsz,wght@6..12,600;6..12,700;6..12,800;6..12,900&display=swap" rel="stylesheet">
  <style>
    :root{--ink:#173a63;--deep:#0f2d4c;--paper:#fbf8ef;--gold:#f4c84a;--coral:#ef8a75;--line:#d9e1e9;--muted:#66809a;--good:#178465;--bad:#c95f55;--ease:cubic-bezier(.23,1,.32,1)}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 1px 1px,rgba(23,58,99,.07) 1px,transparent 0) 0 0/18px 18px,var(--paper);color:var(--ink);font-family:"Noto Kufi Arabic","Nunito Sans",sans-serif}.top{height:74px;display:flex;align-items:center;justify-content:space-between;padding:10px 32px;background:rgba(251,248,239,.94);border-bottom:1px solid rgba(23,58,99,.12);position:sticky;top:0;z-index:10}.brand{display:flex;gap:10px;align-items:center;direction:ltr}.brand img{width:43px;height:43px;object-fit:contain}.brand small{display:block;color:var(--coral);font:800 10px/1 "Nunito Sans";letter-spacing:.12em}.brand strong{font:800 18px/1.1 "Baloo 2"}.score{display:flex;gap:6px;align-items:center;padding:8px 11px;border:1px solid #d9d2b5;border-radius:9px;background:#fffdf6;direction:ltr;font:800 13px/1 "Nunito Sans"}.layout{min-height:calc(100vh - 74px);display:grid;grid-template-columns:300px 1fr;direction:ltr}.rail{position:sticky;top:74px;height:calc(100vh - 74px);overflow:auto;background:var(--deep);padding:25px 20px;color:#fff;direction:rtl}.badge{width:108px;padding:9px 10px 14px;background:var(--gold);color:var(--deep);text-align:center;clip-path:polygon(0 0,100% 0,100% 83%,50% 100%,0 83%)}.badge span,.badge em{display:block;font:800 10px/1 "Nunito Sans";letter-spacing:.12em}.badge b{display:block;margin:2px 0;font:800 34px/.9 "Baloo 2"}.badge em{font-style:normal;letter-spacing:.02em}.rail h1{margin:25px 0 8px;font-size:27px;line-height:1.35}.rail>p{margin:0 0 18px;color:#c5d6e8;font-size:11px;line-height:1.9}.unit{border-top:1px solid rgba(255,255,255,.14);padding:12px 0}.unit-title{display:flex;justify-content:space-between;align-items:center;color:var(--gold);font:800 11px/1 "Nunito Sans";letter-spacing:.08em;direction:ltr}.lesson-link{width:100%;display:grid;grid-template-columns:31px 1fr auto;gap:7px;align-items:center;margin-top:5px;padding:9px 5px;border:0;border-right:3px solid transparent;background:transparent;color:#c5d6e8;text-align:right;cursor:pointer}.lesson-link:hover,.lesson-link.active{background:rgba(255,255,255,.1);border-right-color:var(--gold);color:#fff}.lesson-link b{color:var(--gold);font:900 9px/1 "Nunito Sans";direction:ltr}.lesson-link span{font:800 11px/1.25 "Nunito Sans";text-align:left;direction:ltr}.lesson-link small{color:#94b1cc;font:800 9px/1 "Nunito Sans"}.main{padding:34px;min-width:0;direction:rtl}.hero{position:relative;min-height:212px;display:flex;align-items:center;justify-content:flex-end;overflow:hidden;border-radius:17px 17px 5px 17px;background-color:#f4eacc;background-size:cover;background-position:center;box-shadow:0 16px 32px rgba(23,58,99,.12)}.hero:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(251,248,239,.18),rgba(251,248,239,.84) 52%,rgba(251,248,239,.97));}.hero-copy{position:relative;max-width:560px;padding:30px 56px 30px 22px}.hero-copy small{color:var(--coral);font:800 11px/1 "Nunito Sans";letter-spacing:.06em}.hero h2{margin:8px 0;color:var(--deep);font-size:clamp(28px,4vw,45px);line-height:1.17;letter-spacing:-.07em}.hero h2 span{color:#1e5fa8}.hero p{margin:0;color:#365471;font-size:12px;line-height:2}.progress{display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:center;margin:25px 0 16px}.progress small{color:var(--coral);font:800 10px/1 "Nunito Sans"}.progress b{display:block;color:var(--ink);font:800 20px/1.2 "Baloo 2";direction:ltr}.track{height:8px;border-radius:8px;background:#dde5ec;overflow:hidden}.track i{display:block;height:100%;border-radius:inherit;transition:width .25s var(--ease)}.card{display:grid;grid-template-columns:minmax(270px,.85fr) minmax(0,1.2fr);overflow:hidden;border:1px solid #e0e6ea;border-radius:8px 24px 24px 24px;background:#fffefa;box-shadow:0 16px 32px rgba(23,58,99,.12);direction:ltr}.visual{min-height:510px;perspective:1500px}.flip{position:relative;width:100%;min-height:510px;height:100%;transform-style:preserve-3d;transition:transform .56s var(--ease)}.flip.on{transform:rotateY(180deg)}.face{position:absolute;inset:0;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden}.front{display:grid;place-items:center;padding:34px;background:linear-gradient(135deg,#f8f0cf,#fffefa 56%,#e6f0fb)}.front:before{content:"";position:absolute;width:140%;height:54%;top:-28%;right:-38%;border:28px solid rgba(30,95,168,.08);border-radius:50%;transform:rotate(-18deg)}.guess{position:relative;z-index:1;text-align:center}.guess small{display:block;color:var(--coral);font:800 11px/1 "Nunito Sans";letter-spacing:.12em}.word{display:inline-block;margin:14px 0 8px;border:0;padding:6px 10px;color:var(--deep);background:transparent;font:800 clamp(54px,7vw,84px)/.9 "Baloo 2";letter-spacing:-.07em;cursor:pointer}.word:hover{color:#1e5fa8;transform:translateY(-2px)}.word.ready{text-decoration:underline;text-decoration-color:var(--gold);text-decoration-thickness:5px;text-underline-offset:8px}.guess p{margin:10px 0 0;color:#4f6e89;font-size:11px;line-height:2}.back{display:grid;grid-template-rows:1fr auto;transform:rotateY(180deg);background:#fff}.back img{width:100%;height:100%;min-height:0;object-fit:cover}.back-word{display:flex;align-items:baseline;justify-content:space-between;width:100%;min-height:94px;padding:16px 20px;border:0;border-top:7px solid var(--gold);background:#fffefa;color:var(--deep);cursor:pointer;direction:ltr}.back-word strong{font:800 38px/.9 "Baloo 2"}.back-word span{color:var(--muted);font:700 11px/1.7 "Noto Kufi Arabic";direction:rtl}.content{padding:42px;direction:rtl}.kind{display:inline-block;padding:7px 10px;border-radius:5px;background:#e8f1fb;color:#477294;font:800 10px/1 "Nunito Sans";direction:ltr}.question{margin:30px 0 5px;color:var(--coral);font:800 11px/1 "Nunito Sans";letter-spacing:.06em;direction:ltr}.sentence{margin:0;color:var(--deep);font:800 clamp(20px,2.5vw,28px)/1.35 "Nunito Sans";letter-spacing:-.03em;direction:ltr}.hint{margin:9px 0 20px;color:var(--muted);font-size:12px}.options{display:grid;gap:10px}.option{min-height:51px;display:grid;grid-template-columns:30px 1fr 20px;gap:10px;align-items:center;width:100%;padding:11px 13px;border:1px solid #d9e1e8;border-radius:9px;background:#fff;color:#254864;text-align:left;font:800 13px/1.3 "Nunito Sans";cursor:pointer}.option:not(:disabled):hover{border-color:#1e5fa8;transform:translateX(-2px)}.letter{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;background:#e8f1fb;color:#1e5fa8}.option.correct{border-color:#65c6ab;background:#edfbf5;color:#0c624b}.option.wrong{border-color:#ecab9d;background:#fff0ed;color:#944137}.option.muted{opacity:.45}.reply{display:grid;grid-template-columns:36px 1fr;gap:11px;margin-top:16px;padding:13px 14px;border-radius:9px}.reply.good{background:#effbf6;color:#0f6a51}.reply.bad{background:#fff3ef;color:#9d463b}.reply b{font:800 18px/1.2 "Baloo 2";direction:ltr}.reply p{margin:0;font-size:11px;font-weight:800}.reply small{display:block;margin-top:4px;font:700 11px/1.5 "Nunito Sans";direction:ltr}.controls{display:flex;justify-content:space-between;gap:14px;padding:20px 0}.controls button{min-height:42px;border-radius:8px;padding:0 14px;font:800 12px/1 "Nunito Sans";cursor:pointer}.primary{border:0;background:var(--ink);color:#fff}.secondary{border:1px solid #c9d7e3;background:#fff;color:var(--ink)}@media(max-width:850px){.layout{grid-template-columns:1fr}.rail{position:relative;top:0;height:auto}.main{padding:18px}.card{grid-template-columns:1fr}.visual,.flip{min-height:230px;height:230px}.hero-copy{padding:25px}.progress{grid-template-columns:150px 1fr}.content{padding:25px 19px}.top{padding:9px 15px}.lesson-link span{font-size:10px}}
  </style>
</head>
<body>
<header class="top"><div class="brand" dir="ltr"><img src="/manus-storage/vocabulary-logo_5f3f4915.png" alt="logo"><div><small>ENGLISH · PRIMARY 4</small><strong>Vocabulary Flashcards</strong></div></div><div class="score" id="score">0 / 0 right</div></header>
<div class="layout"><aside class="rail" id="rail"></aside><main class="main"><section class="hero" id="hero"><div class="hero-copy"><small id="hero-kicker"></small><h2 id="hero-title"></h2><p id="hero-copy"></p></div></section><section class="progress"><div><small id="route"></small><b id="card-number"></b></div><div class="track"><i id="track"></i></div></section><section id="card"></section><section class="controls"><button class="secondary" id="shuffle">Shuffle lesson</button><div><button class="secondary" id="prev">←</button><button class="primary" id="next">Next card →</button><button class="secondary" id="reset">↻</button></div></section></main></div>
<script>
const lessons = __COURSE_DATA__;
let selectedLesson = lessons[0], deck = [...selectedLesson.cards], current = 0, answers = {}, heard = false, flipped = false;
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function speak(term){if(!window.speechSynthesis)return; speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(term.replace(/[!?.]/g,''));u.lang='en-US';u.rate=.78;speechSynthesis.speak(u)}
function blank(card){const p=card.sentence.toLowerCase().indexOf(card.term.toLowerCase());return p<0?card.sentence:card.sentence.slice(0,p)+'_____ '+card.sentence.slice(p+card.term.length)}
function opts(card){const i=deck.findIndex(x=>x.id===card.id),out=[card.term];for(let step=1;out.length<4&&step<deck.length;step++){const x=deck[(i+step*3)%deck.length].term;if(!out.some(y=>y.toLowerCase()===x.toLowerCase()))out.push(x)}while(out.length<4)out.push(card.term);const c=out.shift();out.splice(i%4,0,c);return out}
function score(){return Object.entries(answers).filter(([id,choice])=>{const c=deck.find(x=>x.id===id);return c&&opts(c)[choice]===c.term}).length}
function renderRail(){const units=[...new Set(lessons.map(l=>l.unit))];document.querySelector('#rail').innerHTML='<div class="badge"><span>UNIT</span><b>'+String(selectedLesson.unit).padStart(2,'0')+'</b><em>LESSON '+esc(selectedLesson.lesson)+'</em></div><h1>'+esc(selectedLesson.unitArabic)+'</h1><p dir="ltr">'+esc(selectedLesson.title)+'</p>'+units.map(unit=>{const list=lessons.filter(l=>l.unit===unit);return '<section class="unit"><div class="unit-title"><span>UNIT '+String(unit).padStart(2,'0')+'</span><small>'+list.length+' lessons</small></div>'+list.map(l=>'<button class="lesson-link '+(l.id===selectedLesson.id?'active':'')+'" data-lesson="'+esc(l.id)+'"><b>L '+esc(l.lesson)+'</b><span>'+esc(l.title)+'</span><small>'+l.cards.length+'</small></button>').join('')+'</section>'}).join('');document.querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>{selectedLesson=lessons.find(l=>l.id===b.dataset.lesson);deck=[...selectedLesson.cards];current=0;answers={};heard=false;flipped=false;render()})}
function render(){const card=deck[current],choices=opts(card),picked=answers[card.id],answered=picked!==undefined,correct=answered&&choices[picked]===card.term;document.querySelector('#hero').style.backgroundImage='linear-gradient(90deg,rgba(251,248,239,.18),rgba(251,248,239,.84) 52%,rgba(251,248,239,.97)),url("'+selectedLesson.image+'")';document.querySelector('#hero-kicker').textContent='UNIT '+selectedLesson.unit+' · LESSON '+selectedLesson.lesson;document.querySelector('#hero-title').innerHTML=esc(selectedLesson.unitArabic)+'<br><span dir="ltr" style="color:#1e5fa8">'+esc(selectedLesson.title)+'</span>';document.querySelector('#hero-copy').textContent='راجع كلمات الدرس، اسمع النطق، ثم أكمل الجملة بالكلمة المناسبة.';document.querySelector('#route').textContent='UNIT '+selectedLesson.unit+' · LESSON '+selectedLesson.lesson;document.querySelector('#card-number').textContent='Card '+String(current+1).padStart(2,'0')+' of '+deck.length;document.querySelector('#track').style.width=((current+1)/deck.length*100)+'%';document.querySelector('#track').style.background=selectedLesson.color;document.querySelector('#score').textContent=score()+' / '+Object.keys(answers).length+' right';const choicesHtml=choices.map((word,i)=>{const yes=word===card.term,selected=picked===i,cl=answered?(yes?'correct':selected?'wrong':'muted'):'';return '<button class="option '+cl+'" data-choice="'+i+'" '+(answered?'disabled':'')+'><span class="letter">'+String.fromCharCode(65+i)+'</span><strong dir="ltr">'+esc(word)+'</strong><span>'+(answered&&yes?'✓':answered&&selected?'×':'')+'</span></button>'}).join('');const reply=answered?'<div class="reply '+(correct?'good':'bad')+'"><span>'+ (correct?'✓':'×')+'</span><div><p>'+ (correct?'أحسنت! إجابة صحيحة.':'لا بأس، ثبّت الإجابة الصحيحة.')+'</p><b>'+esc(card.term)+' — '+esc(card.arabic)+'</b><small>“'+esc(card.sentence)+'”</small></div></div>':'';document.querySelector('#card').innerHTML='<article class="card"><section class="visual"><div class="flip '+(flipped?'on':'')+'"><div class="face front"><div class="guess"><small>BEFORE YOU LISTEN</small><button class="word '+(heard?'ready':'')+'" id="word">'+esc(card.term)+'</button><p>'+ (heard?'اضغط على الكلمة مرة ثانية لتكشف الصورة.':'اضغط على الكلمة لتسمع نطقها أولًا.')+'</p></div></div><div class="face back"><img src="'+card.image+'" alt=""><button class="back-word" id="replay"><strong>'+esc(card.term)+'</strong><span>'+esc(card.arabic)+'</span></button></div></div></section><section class="content"><span class="kind" dir="ltr">'+esc(card.kind)+'</span><p class="question">Complete the sentence</p><p class="sentence">'+esc(blank(card))+'</p><p class="hint">اختر الكلمة التي تُكمل الجملة.</p><div class="options">'+choicesHtml+'</div>'+reply+'</section></article>';document.querySelector('#word').onclick=()=>{if(!heard){heard=true;speak(card.term);render()}else{speak(card.term);flipped=true;render()}};document.querySelector('#replay').onclick=()=>speak(card.term);document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(answered)return;answers[card.id]=Number(b.dataset.choice);render()});document.querySelector('#prev').disabled=current===0;document.querySelector('#next').disabled=current===deck.length-1;renderRail()}
document.querySelector('#prev').onclick=()=>{if(current>0){current--;heard=false;flipped=false;render()}};document.querySelector('#next').onclick=()=>{if(current<deck.length-1){current++;heard=false;flipped=false;render()}};document.querySelector('#shuffle').onclick=()=>{deck.sort(()=>Math.random()-.5);current=0;answers={};heard=false;flipped=false;render()};document.querySelector('#reset').onclick=()=>{deck=[...selectedLesson.cards];current=0;answers={};heard=false;flipped=false;render()};render();
</script>
</body></html>`;

fs.writeFileSync(outputPath, template.replace("__COURSE_DATA__", JSON.stringify(lessons)));
console.log(`Wrote standalone course HTML with ${lessons.length} lessons to ${outputPath}`);
