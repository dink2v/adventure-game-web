(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const W = canvas.width, H = canvas.height;
  const world = { w: 1800, h: 1200 };
  const saved = (() => { try { return JSON.parse(localStorage.getItem('wildbound-save') || '{}'); } catch { return {}; } })();
  const player = { x: saved.x || 470, y: saved.y || 330, r: 17, speed: 210, health: saved.health ?? 100, coins: saved.coins || 0, xp: saved.xp || 0, dir: 1, moving: false, hit: 0 };
  const keys = new Set();
  let running = false, paused = false, last = 0, camera = {x:0,y:0}, toastTimer = 0, soundOn = false;
  let questDone = player.coins >= 5;
  const coinSpots = Array.from({length:18},(_,i)=>({x:180+(i*197)%1450,y:130+(i*137)%930,taken:(saved.taken||[]).includes(i),phase:i*1.7}));
  const crystals = [{x:1530,y:880,got:!!saved.crystal}];
  const trees = [];
  let seed=34567;
  const rand=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
  for(let i=0;i<180;i++){const x=35+rand()*(world.w-70),y=35+rand()*(world.h-70);if(Math.hypot(x-player.x,y-player.y)>100)trees.push({x,y,r:15+rand()*18,t:rand()});}
  const paths=[{x:0,y:250,w:world.w,h:90},{x:410,y:0,w:100,h:world.h},{x:450,y:600,w:800,h:75},{x:1200,y:600,w:85,h:360},{x:1000,y:920,w:420,h:70}];
  const enemy={x:1090,y:430,r:19,phase:0,alive:true};
  function save(){try{localStorage.setItem('wildbound-save',JSON.stringify({x:player.x,y:player.y,health:player.health,coins:player.coins,xp:player.xp,taken:coinSpots.map((c,i)=>c.taken?i:-1).filter(i=>i>=0),crystal:crystals[0].got}));$('save-status').textContent='● Tersimpan';}catch{$('save-status').textContent='● Sesi ini';}}
  function notify(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800);}
  function resize(){const rect=canvas.getBoundingClientRect();if(rect.width){/* CSS scales the fixed-resolution canvas for crisp, consistent coordinates. */}}
  function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function drawTree(t){const x=t.x-camera.x,y=t.y-camera.y;if(x<-60||x>W+60||y<-80||y>H+80)return;ctx.fillStyle='#183b30';ctx.beginPath();ctx.ellipse(x,y+12,t.r*.7,t.r*.35,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#604c3d';ctx.fillRect(x-4,y-3,8,20);ctx.fillStyle=t.t>.5?'#2b7550':'#246448';ctx.beginPath();ctx.arc(x,y-t.r*.15,t.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3b8a5d';ctx.beginPath();ctx.arc(x-t.r*.25,y-t.r*.35,t.r*.55,0,Math.PI*2);ctx.fill();ctx.fillStyle='#72b779';ctx.globalAlpha=.22;ctx.beginPath();ctx.arc(x-t.r*.3,y-t.r*.45,t.r*.24,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  function drawWorld(){ctx.fillStyle='#244e3c';ctx.fillRect(0,0,W,H);for(let y=0;y<world.h;y+=54)for(let x=0;x<world.w;x+=54){const sx=x-camera.x,sy=y-camera.y;if(sx<-54||sx>W||sy<-54||sy>H)continue;const n=(Math.sin(x*0.11)+Math.cos(y*.13)+Math.sin((x+y)*.07));ctx.fillStyle=n>1.2?'#2a5841':n<-.8?'#214936':'#26513b';ctx.fillRect(sx,sy,52,52);if((x*7+y*3)%5===0){ctx.fillStyle='#54865a';ctx.globalAlpha=.42;ctx.fillRect(sx+12,sy+16,3,3);ctx.fillRect(sx+36,sy+38,2,2);ctx.globalAlpha=1;}}
    for(const p of paths){ctx.fillStyle='#6c7653';ctx.fillRect(p.x-camera.x,p.y-camera.y,p.w,p.h);ctx.fillStyle='#7d855e';ctx.globalAlpha=.5;ctx.fillRect(p.x-camera.x,p.y-camera.y+8,p.w,p.h>100?3:4);ctx.globalAlpha=1;}
    for(const t of trees)drawTree(t);
    for(const c of coinSpots){if(c.taken)continue;const x=c.x-camera.x,y=c.y-camera.y+Math.sin(performance.now()/380+c.phase)*4;if(x<-20||x>W+20||y<-20||y>H+20)continue;ctx.fillStyle='#ffcc69';ctx.globalAlpha=.2;ctx.beginPath();ctx.arc(x,y,15,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#f7c65f';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff0ad';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.stroke();}
    const crystal=crystals[0];if(!crystal.got){const x=crystal.x-camera.x,y=crystal.y-camera.y;if(x>-40&&x<W+40&&y>-40&&y<H+40){ctx.fillStyle='#8edff5';ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(x,y,27,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#9ee9f6';ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x+12,y);ctx.lineTo(x,y+18);ctx.lineTo(x-12,y);ctx.closePath();ctx.fill();ctx.strokeStyle='#e0fcff';ctx.stroke();}}
    if(enemy.alive){const x=enemy.x-camera.x,y=enemy.y-camera.y;ctx.fillStyle='#152d2c';ctx.beginPath();ctx.ellipse(x,y+13,20,9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8b7ac7';ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b8a8f2';ctx.beginPath();ctx.arc(x-5,y-6,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f9e8a4';ctx.fillRect(x-9,y-2,4,4);ctx.fillRect(x+5,y-2,4,4);}
    drawPlayer();
    // Soft vignette
    const g=ctx.createRadialGradient(W/2,H/2,130,W/2,H/2,530);g.addColorStop(0,'#07120d00');g.addColorStop(1,'#07120d55');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  function drawPlayer(){const x=player.x-camera.x,y=player.y-camera.y;ctx.fillStyle='#142e2b88';ctx.beginPath();ctx.ellipse(x,y+14,18,9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#4f91a4';ctx.beginPath();ctx.ellipse(x,y+5,13,16,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8fd6d0';ctx.beginPath();ctx.arc(x,y-11,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#263c51';ctx.beginPath();ctx.arc(x+player.dir*3,y-12,7,-.5,Math.PI+.5);ctx.fill();ctx.fillStyle='#f6d4a0';ctx.beginPath();ctx.arc(x+player.dir*5,y-8,2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d7f6d6';ctx.beginPath();ctx.arc(x-4,y-17,3,0,Math.PI*2);ctx.fill();if(player.hit>0){ctx.strokeStyle='#ff8c86';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,25,0,Math.PI*2);ctx.stroke();}}
  function update(dt){let dx=0,dy=0;if(keys.has('ArrowLeft')||keys.has('a')||keys.has('A'))dx--;if(keys.has('ArrowRight')||keys.has('d')||keys.has('D'))dx++;if(keys.has('ArrowUp')||keys.has('w')||keys.has('W'))dy--;if(keys.has('ArrowDown')||keys.has('s')||keys.has('S'))dy++;if(dx&&dy){dx*=.7071;dy*=.7071;}player.moving=!!(dx||dy);player.x=Math.max(20,Math.min(world.w-20,player.x+dx*player.speed*dt));player.y=Math.max(20,Math.min(world.h-20,player.y+dy*player.speed*dt));if(dx)player.dir=Math.sign(dx);if(player.hit>0)player.hit-=dt;
    camera.x=Math.max(0,Math.min(world.w-W,player.x-W/2));camera.y=Math.max(0,Math.min(world.h-H,player.y-H/2));
    for(const c of coinSpots){if(!c.taken&&Math.hypot(player.x-c.x,player.y-c.y)<27){c.taken=true;player.coins++;player.xp+=10;notify('Koin ditemukan! +1 🪙');save();updateHud();if(player.coins>=5&&!questDone){questDone=true;player.xp+=40;notify('Misi selesai! +40 XP ✨');updateHud();}}}
    if(enemy.alive&&Math.hypot(player.x-enemy.x,player.y-enemy.y)<player.r+enemy.r){player.health=Math.max(0,player.health-18*dt);player.hit=.15;if(player.health<=0){player.health=100;player.x=470;player.y=330;notify('Kamu pulih di titik awal.');}}
    if(!crystals[0].got&&Math.hypot(player.x-crystals[0].x,player.y-crystals[0].y)<32){crystals[0].got=true;player.xp+=100;notify('Kristal kuno ditemukan! +100 XP');save();updateHud();}
    updateHud();
  }
  function updateHud(){$('health').textContent=Math.ceil(player.health);$('coins').textContent=player.coins;$('xp-bar').style.width=(player.xp%100)+'%';$('quest-bar').style.width=(Math.min(5,player.coins)/5*100)+'%';$('quest-count').textContent=Math.min(5,player.coins)+'/5';$('quest-title').textContent=questDone?'Misi selesai!':'Koin pertama';$('quest-desc').textContent=questDone?'Bagus! Jelajahi hutan dan cari kristal kuno.':'Kumpulkan 5 koin yang tersebar di hutan.';}
  function frame(t){if(!running)return;const dt=Math.min((t-last)/1000||0,.04);last=t;if(!paused)update(dt);drawWorld();requestAnimationFrame(frame);}
  function start(){if(running&&!paused)return;running=true;paused=false;$('start-overlay').classList.add('hidden');$('pause-overlay').classList.add('hidden');last=performance.now();requestAnimationFrame(frame);notify('Jelajahi hutan dan kumpulkan koin!');}
  function pause(){if(!running)return;paused=!paused;$('pause-overlay').classList.toggle('hidden',!paused);if(!paused){last=performance.now();requestAnimationFrame(frame);}else save();}
  function reset(){if(!confirm('Mulai ulang? Koin dan progres tersimpan akan dihapus.'))return;localStorage.removeItem('wildbound-save');location.reload();}
  function interact(){if(!running){start();return;}if(paused)return;const c=crystals[0];if(!c.got&&Math.hypot(player.x-c.x,player.y-c.y)<95){c.got=true;player.xp+=100;notify('Kristal kuno ditemukan! +100 XP');save();}else if(enemy.alive&&Math.hypot(player.x-enemy.x,player.y-enemy.y)<100){enemy.alive=false;player.xp+=50;notify('Musuh dikalahkan! +50 XP');}else notify('Jelajahi area untuk menemukan koin dan kristal.');updateHud();}
  $('start-btn').addEventListener('click',start);$('resume-btn').addEventListener('click',pause);$('pause-btn').addEventListener('click',()=>{if(!running){start();return;}pause();});$('reset-btn').addEventListener('click',reset);$('interact-btn').addEventListener('click',interact);$('sound-btn').addEventListener('click',()=>{soundOn=!soundOn;$('sound-btn').textContent=soundOn?'♫':'♪';notify(soundOn?'Efek suara akan ditambahkan pada versi berikutnya.':'Suara nonaktif.');});
  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key);if(e.key==='Escape'&&running)pause();if(e.key===' '&&running&&!paused)interact();});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused)pause();});
  // Touch controls: swipe or hold a direction on the play field.
  let touchStart=null;canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;touchStart={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!touchStart||e.pointerType==='mouse')return;keys.delete('ArrowLeft');keys.delete('ArrowRight');keys.delete('ArrowUp');keys.delete('ArrowDown');const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;if(Math.abs(dx)>8)keys.add(dx>0?'ArrowRight':'ArrowLeft');if(Math.abs(dy)>8)keys.add(dy>0?'ArrowDown':'ArrowUp');});function endTouch(){touchStart=null;['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].forEach(k=>keys.delete(k));}canvas.addEventListener('pointerup',endTouch);canvas.addEventListener('pointercancel',endTouch);
  updateHud();drawWorld();resize();window.addEventListener('resize',resize);
})();