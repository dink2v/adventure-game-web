(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('scene'), ctx = canvas.getContext('2d');
  const money = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const recipes = {
    nasi:{name:'Nasi goreng spesial',emoji:'🍳',price:18000,cost:7000,ingredients:['🍚 Nasi','🥚 Telur','🥬 Sayur','🌶️ Bumbu'],stock:2,cookTime:12,actions:2,customer:['Mas Andi','👨🏻','Lapar berat · suka pedas']},
    mie:{name:'Mi goreng Jawa',emoji:'🍜',price:15000,cost:6000,ingredients:['🍜 Mi','🥚 Telur','🥬 Sayur','🧂 Kecap'],stock:2,cookTime:11,actions:2,customer:['Mbak Rani','👩🏻','Lagi istirahat kerja']},
    bakso:{name:'Bakso kuah',emoji:'🍲',price:17000,cost:6500,ingredients:['🍖 Bakso','🍜 Mi','🥬 Seledri','🥣 Kaldu'],stock:2,cookTime:8,actions:1,customer:['Pak Darto','👨🏽','Mau yang hangat']},
    es:{name:'Es teh manis',emoji:'🧋',price:5000,cost:1500,ingredients:['🫖 Teh','🧊 Es batu','🍯 Gula'],stock:1,cookTime:5,actions:1,customer:['Dina','👧🏻','Haus setelah jalan']},
    ayam:{name:'Ayam geprek',emoji:'🍗',price:24000,cost:10000,ingredients:['🍗 Ayam','🌶️ Sambal','🍚 Nasi','🥒 Lalapan'],stock:3,cookTime:15,actions:2,unlock:8,customer:['Nisa','👩🏽','Suka sambal pedas']},
    soto:{name:'Soto ayam',emoji:'🍲',price:22000,cost:9000,ingredients:['🍗 Ayam','🥣 Kaldu','🍜 Bihun','🌿 Seledri'],stock:3,cookTime:14,actions:2,unlock:15,customer:['Pak Bima','👨🏻','Mencari makan siang']},
    sate:{name:'Sate ayam',emoji:'🍢',price:28000,cost:12000,ingredients:['🍢 Sate ayam','🥜 Bumbu kacang','🍚 Lontong','🍋 Jeruk limau'],stock:3,cookTime:16,actions:2,unlock:25,customer:['Mbak Sari','👩🏻','Pelanggan pecinta sate']},
  };
  const saved = (() => { try { return JSON.parse(localStorage.getItem('warung-kita-save') || '{}'); } catch { return {}; } })();
  const state = {
    cash:saved.cash ?? 150000, rep:saved.rep ?? 1, served:saved.served ?? 0,
    stock:saved.stock ?? 12, day:saved.day ?? 1, stove:saved.stove ?? 1,
    tables:saved.tables ?? 2, orderNo:saved.orderNo ?? 1,
    menu:saved.menu || 'nasi', orderMenu:saved.orderMenu || saved.menu || 'nasi', step:saved.step ?? 0, patience:saved.patience ?? 100, cookingStarted:saved.cookingStarted ?? false, cookingElapsed:saved.cookingElapsed ?? 0, actionIndex:saved.actionIndex ?? 0, qualityScore:saved.qualityScore ?? 0, qualityLabel:saved.qualityLabel || 'Biasa', tick:0, sound:false,
    guests:[{x:.2,y:.53,color:'#e2a875',shirt:'#477a62',emoji:'👨🏻'},{x:.77,y:.55,color:'#d6a17b',shirt:'#bd7652',emoji:'👩🏻'}],
    cashEarned:0, staff:saved.staff ?? false, promoUsed:saved.promoUsed ?? false, promoBonusPending:saved.promoBonusPending ?? false, todayServed:saved.todayServed ?? 0, todayRevenue:saved.todayRevenue ?? 0, missionClaimed:saved.missionClaimed ?? false, totalRevenue:saved.totalRevenue ?? 0
  };
  let lastTime=0, toastTimer=0, lastUiUpdate=0;
  function persist(){try{localStorage.setItem('warung-kita-save',JSON.stringify({cash:state.cash,rep:state.rep,served:state.served,stock:state.stock,day:state.day,stove:state.stove,tables:state.tables,orderNo:state.orderNo,menu:state.menu,orderMenu:state.orderMenu,step:state.step,patience:state.patience,cookingStarted:state.cookingStarted,cookingElapsed:state.cookingElapsed,actionIndex:state.actionIndex,qualityScore:state.qualityScore,qualityLabel:state.qualityLabel,staff:state.staff,promoUsed:state.promoUsed,promoBonusPending:state.promoBonusPending,todayServed:state.todayServed,todayRevenue:state.todayRevenue,missionClaimed:state.missionClaimed,totalRevenue:state.totalRevenue}));}catch{}}
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200);}
  function current(){return recipes[state.menu];}
  function formatClock(){return state.todayServed>5?'SORE':state.todayServed>2?'SIANG':'PAGI';}
  function unlocked(id){return !recipes[id].unlock || state.served>=recipes[id].unlock;}
  function rankName(){return state.served>=25?'Calon Juragan Restoran':state.served>=15?'Pemilik Rumah Makan':state.served>=8?'Juragan Warung Berkembang':'Pemilik Warung Pemula';}
  function updateProgress(){
    $('rank-label').textContent=rankName();$('rank-rep-text').textContent=state.rep.toFixed(1)+' / 5';$('rank-rep-bar').style.width=(state.rep/5*100)+'%';
    $('rank-served-text').textContent=state.served;$('rank-served-bar').style.width=Math.min(100,state.served/25*100)+'%';
    $('mission-served-text').textContent=Math.min(3,state.todayServed)+'/3';$('mission-served-bar').style.width=Math.min(100,state.todayServed/3*100)+'%';
    $('mission-cash-text').textContent=money(state.todayRevenue);$('mission-cash-bar').style.width=Math.min(100,state.todayRevenue/30000*100)+'%';
    const ready=state.todayServed>=3&&state.todayRevenue>=30000&&!state.missionClaimed;
    $('claim-mission-btn').disabled=!ready;$('claim-mission-btn').textContent=state.missionClaimed?'✓ Hadiah sudah diklaim':ready?'🎁 Klaim hadiah misi':'🎁 Selesaikan target untuk klaim';
    $('mission-summary').textContent=state.missionClaimed?'Misi selesai! Besok ada target baru.':ready?'Target selesai — klaim hadiahmu!':'Selesaikan dua target untuk hadiah';
    $('unlock-note').textContent=state.served<8?'Menu Ayam geprek terbuka setelah '+(8-state.served)+' pelanggan lagi.':state.served<15?'Menu Soto ayam terbuka setelah '+(15-state.served)+' pelanggan lagi.':state.served<25?'Menu Sate ayam terbuka setelah '+(25-state.served)+' pelanggan lagi.':'Semua menu demo sudah terbuka!';
    $('today-revenue').textContent=money(state.todayRevenue);$('today-served').textContent=state.todayServed;$('ledger-day').textContent=state.day;$('ledger-staff').textContent=state.staff?'Direkrut':'Belum ada';
    $('staff-status').textContent=state.staff?'SUDAH DIREKRUT · AKTIF':'BELUM DIREKRUT';$('staff-btn').textContent=state.staff?'Asisten aktif':'Rp 90.000 +';$('staff-btn').disabled=state.staff||state.cash<90000;
    $('promo-status').textContent=state.promoUsed?'PROMOSI SUDAH DIPAKAI':'BELUM AKTIF HARI INI';$('promo-btn').disabled=state.promoUsed||state.cash<12000;
    for(const option of $('menu-select').options){if(recipes[option.value]?.unlock){const open=unlocked(option.value);option.disabled=!open;option.textContent=(open?'':'🔒 ')+recipes[option.value].name+' · '+money(recipes[option.value].price)+(open?'':' · buka '+recipes[option.value].unlock+' pelanggan');}}
  }
  function updateStats(){
    $('cash').textContent=money(state.cash);$('rep').textContent=state.rep.toFixed(1);$('served').textContent=state.served;
    $('stock').textContent=state.stock;$('day-label').textContent='HARI '+state.day;$('time-label').textContent=formatClock();
    $('stove-level').textContent=state.stove;$('table-level').textContent=state.tables;$('upgrade-level').textContent='Warung Level '+Math.max(1,Math.floor((state.stove+state.tables)/3));
    $('stove-btn').innerHTML=money(80000*state.stove)+' <span>↗</span>';$('table-btn').innerHTML=money(60000*state.tables)+' <span>↗</span>';
    $('stove-btn').disabled=state.cash<80000*state.stove;$('table-btn').disabled=state.cash<60000*state.tables;$('stock-btn').disabled=state.cash<25000;updateProgress();
  }
  function actionWindow(){const r=recipes[state.orderMenu]||recipes.nasi;const count=r.actions||1;const center=r.cookTime*(state.actionIndex+1)/(count+1);return {start:center-1.1,end:center+1.1};}
  function updateOrder(){
    const r=recipes[state.orderMenu]||recipes.nasi, selected=current();
    $('order-title').textContent=r.name;$('dish-art').textContent=r.emoji;$('order-price').textContent=money(r.price);
    $('customer-name').textContent=r.customer[0];$('customer-avatar').textContent=r.customer[1];$('customer-mood').textContent=r.customer[2];
    $('order-tag').textContent='PESANAN #'+String(state.orderNo).padStart(3,'0');
    $('recipe-cost').textContent='Modal '+money(selected.cost);$('ingredients').innerHTML=selected.ingredients.map(x=>'<span>'+x+'</span>').join('');
    $('patience-label').textContent=Math.round(state.patience)+'%';$('patience-bar').style.width=Math.min(100,state.patience)+'%';
    $('patience-bar').style.background=state.patience<30?'#c66a54':state.patience<60?'#d7a64e':'#70a879';
    $('menu-select').value=state.menu;
    const win=actionWindow();
    const buttonLabel=state.step===0?'♧ Siapkan bahan':state.step===1?(!state.cookingStarted?'♨ Mulai memasak':(state.actionIndex<(r.actions||1)&&state.cookingElapsed>=win.start&&state.cookingElapsed<=win.end?'🥄 Lakukan aksi sekarang':'⏳ Memasak…')):'✓ Sajikan & terima uang';
    $('cook-btn').innerHTML=buttonLabel;$('cook-btn').disabled=state.step===1&&state.cookingStarted&&state.cookingElapsed>=r.cookTime;
    $('kitchen-status').textContent=state.step===2?'SIAP SAJI':state.cookingStarted?'MEMASAK':state.step===1?'BAHAN SIAP':'SIAP';
    for(let i=1;i<=3;i++){const el=$('step-'+i);el.classList.toggle('active',state.step===i-1);el.classList.toggle('done',state.step>=i);el.querySelector('.step-check').textContent=state.step>=i?'✓':state.step===i-1?'●':'○';}
    if(state.step===0)$('cook-feedback').textContent=state.menu===state.orderMenu?'Siapkan bahan. Stok baru dikurangi saat memasak benar-benar dimulai.':'Pesanan pelanggan: '+r.name+'. Pilih menu yang sama sebelum menyiapkan bahan.';
    else if(state.step===1&&!state.cookingStarted)$('cook-feedback').textContent='Bahan siap. Tekan Mulai memasak untuk memulai timer dan mengurangi stok.';
    else if(state.step===1)$('cook-feedback').textContent=state.actionIndex>=(r.actions||1)?'Masakan sedang diproses… '+Math.max(0,Math.ceil(r.cookTime-state.cookingElapsed))+' detik tersisa.':'Memasak '+r.name+' · '+Math.min(100,Math.round(state.cookingElapsed/r.cookTime*100))+'% · '+Math.max(0,Math.ceil(r.cookTime-state.cookingElapsed))+' detik tersisa. '+(state.cookingElapsed<win.start?'Bersiap untuk aksi berikutnya.':state.cookingElapsed<=win.end?'Sekarang! Tekan tombol aksi.':'Aksi terlewat; tunggu aksi berikutnya.');
    else $('cook-feedback').textContent='Hidangan siap disajikan. Kualitas: '+state.qualityLabel+'. Sajikan untuk menyelesaikan pesanan.';
  }
  function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function drawScene(){
    const w=canvas.width,h=canvas.height;
    // Warm daylight and back wall
    const wall=ctx.createLinearGradient(0,0,0,h);wall.addColorStop(0,'#d6e3ce');wall.addColorStop(.56,'#eee5d0');wall.addColorStop(1,'#c6c4a5');ctx.fillStyle=wall;ctx.fillRect(0,0,w,h);
    // Back window / street view
    rounded(42,36,305,170,10,'#b6d1bb');ctx.fillStyle='#8eb28f';ctx.fillRect(52,46,285,150);
    for(let i=0;i<8;i++){ctx.fillStyle=['#719a76','#83a980','#a7bd8d'][i%3];ctx.beginPath();ctx.arc(70+i*37,88+(i%3)*16,35+(i%2)*10,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#c6d6ad';ctx.fillRect(52,144,285,52);line(193,46,193,196,'#f4eedc',9);line(52,142,337,142,'#f4eedc',8);
    // wall shelf
    rounded(394,47,266,20,5,'#8b6546');rounded(405,67,244,9,3,'#b98c60');
    const jars=[['#d49d59',419],['#9cbd8c',457],['#d7c6a0',495],['#c77e5b',533],['#a3bdc3',571],['#dfc27b',609]];
    jars.forEach(([color,x])=>{rounded(x,40,23,29,5,color);rounded(x+5,34,13,7,2,'#76543d');});
    // wall tiles
    for(let x=370;x<880;x+=56){line(x,220,x,344,'#cfcdbb',1)}for(let y=220;y<345;y+=41)line(370,y,880,y,'#cfcdbb',1);
    // Floor
    ctx.fillStyle='#b8a98b';ctx.fillRect(0,352,w,168);
    for(let y=352;y<h;y+=42){line(0,y,w,y,'#d2c4a6',2);for(let x=(Math.floor(y/42)%2)*45;x<w;x+=90)line(x,y,x,y+42,'#d2c4a6',1);}
    // Serving counter
    ctx.fillStyle='#76513b';ctx.beginPath();ctx.moveTo(22,300);ctx.lineTo(660,300);ctx.lineTo(690,414);ctx.lineTo(0,414);ctx.closePath();ctx.fill();
    ctx.fillStyle='#bd8a5c';ctx.beginPath();ctx.moveTo(20,286);ctx.lineTo(660,286);ctx.lineTo(677,312);ctx.lineTo(8,312);ctx.closePath();ctx.fill();
    ctx.fillStyle='#936443';ctx.fillRect(18,315,644,10);ctx.fillStyle='#684632';ctx.fillRect(18,327,644,82);
    for(let x=55;x<630;x+=120){rounded(x,341,94,53,5,'#80573c');line(x+8,351,x+86,351,'#a97a53',2);}
    // Stove and wok
    rounded(420,230,150,55,10,'#4a5550');rounded(433,222,124,24,8,'#6e7c71');ctx.fillStyle='#303a35';ctx.beginPath();ctx.ellipse(495,224,53,18,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1f2925';ctx.beginPath();ctx.ellipse(495,220,46,13,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d7d5c5';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(535,221);ctx.lineTo(572,210);ctx.stroke();
    // steam wisps
    for(let i=0;i<3;i++){ctx.strokeStyle='#fff9e5aa';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(470+i*20,207);ctx.bezierCurveTo(451+i*20,194,488+i*20,187,470+i*20,171);ctx.stroke();}
    // Rice cooker, bottles
    rounded(588,235,48,48,8,'#e5e5d8');rounded(593,228,38,14,6,'#f8f7e9');ctx.fillStyle='#7f4930';ctx.fillRect(596,251,31,5);
    ['#b66a37','#d6b34f','#60845c'].forEach((c,i)=>{rounded(365+i*20,244,14,36,4,c);rounded(368+i*20,238,8,9,2,'#e4d7bb');});
    // Plates and serving tray
    ctx.fillStyle='#f8f3df';ctx.beginPath();ctx.ellipse(285,291,45,11,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d0b86c';ctx.beginPath();ctx.ellipse(285,288,32,7,0,0,Math.PI*2);ctx.fill();
    // Hanging menu board
    rounded(690,40,173,132,8,'#4d3d2d');rounded(698,48,157,116,4,'#334b3a');
    ctx.fillStyle='#f2e6c7';ctx.font='bold 15px Manrope, sans-serif';ctx.fillText('MENU HARI INI',710,72);
    ctx.font='12px DM Sans, sans-serif';['Nasi goreng  18k','Mi goreng     15k','Bakso kuah   17k','Es teh             5k'].forEach((t,i)=>ctx.fillText(t,710,95+i*17));
    // Customer tables in the dining area
    const positions=state.tables>2?[[760,355],[835,420],[755,455],[835,290]]:[[770,374],[830,450]];
    positions.forEach((p,i)=>{
      const [x,y]=p;ctx.fillStyle='#5c4634';ctx.beginPath();ctx.ellipse(x,y+19,39,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#9d7652';ctx.fillRect(x-36,y-12,72,29);ctx.fillStyle='#c69b6c';ctx.fillRect(x-40,y-17,80,8);
      if(i<state.tables){const guest=state.guests[i%state.guests.length];ctx.fillStyle=guest.shirt;ctx.beginPath();ctx.ellipse(x,y-29,20,24,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=guest.color;ctx.beginPath();ctx.arc(x,y-56,17,0,Math.PI*2);ctx.fill();ctx.fillStyle='#473a30';ctx.beginPath();ctx.arc(x-2,y-62,17,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#f9f3df';ctx.fillRect(x-8,y-54,4,3);ctx.fillRect(x+5,y-54,4,3);ctx.strokeStyle='#a45648';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-47,5,0,.9);ctx.stroke();ctx.fillStyle='#fffefa';ctx.beginPath();ctx.ellipse(x-23,y-5,12,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#db8e50';ctx.beginPath();ctx.ellipse(x-23,y-6,7,3,0,0,Math.PI*2);ctx.fill();}
    });
    // Warm light, subtle depth
    const light=ctx.createRadialGradient(250,100,30,250,100,600);light.addColorStop(0,'#fff8dc22');light.addColorStop(1,'#493a1e12');ctx.fillStyle=light;ctx.fillRect(0,0,w,h);
    // Decorative hanging lamp
    line(700,0,700,30,'#6b654f',3);ctx.fillStyle='#e5bd69';ctx.beginPath();ctx.moveTo(678,30);ctx.quadraticCurveTo(700,57,722,30);ctx.closePath();ctx.fill();
  }
  function nextOrder(skipped=false){
    if(skipped&&(state.cookingStarted||state.step===2)){toast('Pesanan sudah dimulai atau siap saji. Selesaikan dulu, bro!');return;}
    state.orderNo++;const available=Object.keys(recipes).filter(id=>unlocked(id));state.orderMenu=available[Math.floor(Math.random()*available.length)];state.step=0;state.cookingStarted=false;state.cookingElapsed=0;state.actionIndex=0;state.qualityScore=0;state.qualityLabel='Biasa';state.patience=state.promoBonusPending?125:100;state.promoBonusPending=false;
    updateOrder();updateStats();drawScene();persist();if(skipped)toast('Pesanan dibatalkan sebelum memasak. Pelanggan baru datang.');
  }
  function cookAction(){
    const r=recipes[state.orderMenu]||recipes.nasi;
    if(state.step===0){
      if(state.menu!==state.orderMenu){toast('Pilih menu yang sesuai dengan pesanan pelanggan.');return;}
      if(state.stock<r.stock){toast('Stok bahan kurang. Belanja bahan baku dulu!');return;}
      state.step=1;state.cookingStarted=false;state.cookingElapsed=0;state.actionIndex=0;state.qualityScore=0;state.qualityLabel='Biasa';$('scene-status').textContent='Bahan pesanan sudah disiapkan';toast('Bahan siap! Mulai memasak saat kamu siap. Stok belum dikurangi.');
    } else if(state.step===1&&!state.cookingStarted){
      if(state.stock<r.stock){toast('Stok bahan tidak cukup untuk memulai memasak.');state.step=0;return;}
      state.stock-=r.stock;state.cookingStarted=true;state.cookingElapsed=0;state.actionIndex=0;state.qualityScore=0;$('scene-status').textContent='Koki sedang memasak '+r.name;toast('Memasak dimulai! Perhatikan waktunya dan tekan tombol saat diminta aksi.');
    } else if(state.step===1){
      if(state.cookingElapsed>=r.cookTime){toast('Tunggu masakan selesai diproses.');return;}
      if(state.actionIndex>=(r.actions||1)){toast('Aksi sudah selesai. Tunggu masakan matang.');return;}
      const win=actionWindow();
      if(state.cookingElapsed<win.start){toast('Belum waktunya! Tunggu indikator aksi.');return;}
      if(state.cookingElapsed<=win.end){state.qualityScore++;state.actionIndex++;toast('Aksi tepat waktu! Kualitas masakan meningkat.');}
      else {state.actionIndex++;toast('Aksi terlambat. Masakan tetap selesai, tetapi bonus kualitas berkurang.');}
    } else {
      const tip=state.patience>65?1500:state.patience>30?500:0;
      const qualityBonus=state.qualityLabel==='Istimewa'?1500:state.qualityLabel==='Enak'?700:0;
      const reward=r.price+tip+qualityBonus;state.cash+=reward;state.cashEarned+=reward;state.totalRevenue+=reward;state.todayRevenue+=reward;state.served++;state.todayServed++;
      const repChange=state.qualityLabel==='Istimewa'?.16:state.qualityLabel==='Enak'?.08:(state.patience>45?.03:-.12);
      state.rep=Math.min(5,Math.max(.5,state.rep+repChange));
      let rolloverMessage='';
      if(state.todayServed>=8){
        if(!state.missionClaimed&&state.todayServed>=3&&state.todayRevenue>=30000){state.cash+=15000;state.rep=Math.min(5,state.rep+.2);state.missionClaimed=true;rolloverMessage=' Hadiah misi yang belum diklaim otomatis diberikan.';}
        const completedDay=state.day,dayRevenue=state.todayRevenue,dayCustomers=state.todayServed;state.day++;state.todayServed=0;state.todayRevenue=0;state.missionClaimed=false;state.promoUsed=false;state.cash+=10000;
        toast('Ringkasan Hari '+completedDay+': '+dayCustomers+' pelanggan, omzet '+money(dayRevenue)+'. Hari baru dimulai; bonus operasional Rp 10.000.'+rolloverMessage);
      } else toast('Pesanan tersaji! '+state.qualityLabel+' · +'+money(reward)+' pendapatan'+(tip?' termasuk tip.':'.'));
      state.orderNo++;const available=Object.keys(recipes).filter(id=>unlocked(id));state.orderMenu=available[Math.floor(Math.random()*available.length)];state.step=0;state.cookingStarted=false;state.cookingElapsed=0;state.actionIndex=0;state.qualityScore=0;state.qualityLabel='Biasa';state.patience=state.promoBonusPending?125:100;state.promoBonusPending=false;
      $('scene-status').textContent='Pelanggan menikmati hidangan';persist();
    }
    persist();updateStats();updateOrder();drawScene();
  }
  function upgrade(kind){
    if(kind==='stove'){const price=80000*state.stove;if(state.cash<price){toast('Uang kas belum cukup. Layani beberapa pelanggan dulu.');return;}state.cash-=price;state.stove++;state.rep=Math.min(5,state.rep+.15);toast('Kompor ditingkatkan! Masak jadi lebih efisien.');}
    if(kind==='table'){const price=60000*state.tables;if(state.cash<price){toast('Uang kas belum cukup. Layani beberapa pelanggan dulu.');return;}state.cash-=price;state.tables++;state.rep=Math.min(5,state.rep+.2);toast('Meja baru siap! Kapasitas pelanggan bertambah.');}
    if(kind==='stock'){if(state.cash<25000){toast('Uang kas belum cukup untuk belanja stok.');return;}state.cash-=25000;state.stock+=12;toast('Stok bahan bertambah 12 porsi. Dapur siap!');}
    persist();updateStats();drawScene();
  }
  function frame(t){const dt=Math.min((t-lastTime)/1000||0,.1);lastTime=t;state.tick+=dt;
    if(state.step<2&&!state.cookingStarted){state.patience=Math.max(0,state.patience-dt*(state.step===1?(state.staff?0.95:1.4):(state.staff?0.22:.35)));}
    if(state.cookingStarted&&state.step===1){const r=recipes[state.orderMenu]||recipes.nasi;state.cookingElapsed=Math.min(r.cookTime,state.cookingElapsed+dt);const win=state.actionIndex<(r.actions||1)?actionWindow():null;if(win&&state.cookingElapsed>win.end){state.actionIndex++;persist();}if(state.cookingElapsed>=r.cookTime){state.step=2;state.cookingStarted=false;state.qualityLabel=state.qualityScore>=(r.actions||1)?'Istimewa':state.qualityScore>0?'Enak':'Biasa';$('scene-status').textContent='Hidangan '+state.qualityLabel.toLowerCase()+' siap disajikan';toast('Masakan selesai! Kualitas: '+state.qualityLabel+'.');persist();updateOrder();updateStats();}}
    if(state.patience===0&&state.step<2&&!state.cookingStarted){state.rep=Math.max(.5,state.rep-.08);state.patience=100;state.step=0;state.orderNo++;const available=Object.keys(recipes).filter(id=>unlocked(id));state.orderMenu=available[Math.floor(Math.random()*available.length)];state.actionIndex=0;state.qualityScore=0;toast('Pelanggan kehabisan sabar. Pesanan dilepas dan pelanggan baru datang.');updateOrder();updateStats();persist();}
    $('patience-label').textContent=Math.round(state.patience)+'%';$('patience-bar').style.width=Math.min(100,state.patience)+'%';$('patience-bar').style.background=state.patience<30?'#c66a54':state.patience<60?'#d7a64e':'#70a879';
    if(state.cookingStarted&&t-lastUiUpdate>180){updateOrder();lastUiUpdate=t;}
    if(Math.floor(state.tick*2)%2===0)drawScene();
    requestAnimationFrame(frame);
  }
  $('menu-select').addEventListener('change',e=>{if(state.step!==0){toast('Selesaikan atau lewati pesanan dulu sebelum ganti menu.');$('menu-select').value=state.menu;return;}if(!unlocked(e.target.value)){toast('Menu ini belum terbuka. Layani lebih banyak pelanggan dulu.');$('menu-select').value=state.menu;return;}state.menu=e.target.value;updateOrder();persist();});
  $('cook-btn').addEventListener('click',cookAction);
  $('new-order-btn').addEventListener('click',()=>nextOrder(true));
  $('stove-btn').addEventListener('click',()=>upgrade('stove'));
  $('table-btn').addEventListener('click',()=>upgrade('table'));
  $('stock-btn').addEventListener('click',()=>upgrade('stock'));
  $('staff-btn').addEventListener('click',()=>{if(state.staff||state.cash<90000){toast(state.staff?'Asistenmu sudah aktif.':'Uang kas belum cukup untuk merekrut asisten.');return;}state.cash-=90000;state.staff=true;toast('Asisten direkrut! Pelanggan lebih sabar menunggu.');persist();updateStats();});
  $('promo-btn').addEventListener('click',()=>{if(state.promoUsed||state.cash<12000){toast(state.promoUsed?'Promosi sudah digunakan hari ini.':'Uang kas belum cukup untuk promosi.');return;}state.cash-=12000;state.promoUsed=true;state.promoBonusPending=true;state.rep=Math.min(5,state.rep+.15);toast('Promosi berhasil! Reputasi naik dan pelanggan berikutnya mendapat tambahan kesabaran.');persist();updateStats();updateOrder();});
  $('claim-mission-btn').addEventListener('click',()=>{if(state.missionClaimed||state.todayServed<3||state.todayRevenue<30000){toast('Selesaikan target misi hari ini dulu.');return;}state.missionClaimed=true;state.cash+=15000;state.rep=Math.min(5,state.rep+.2);toast('Misi selesai! Hadiah Rp 15.000 dan reputasi +0,2.');persist();updateStats();});
  $('sound-btn').addEventListener('click',()=>{state.sound=!state.sound;$('sound-btn').textContent=state.sound?'♫':'♪';toast('Efek suara akan ditambahkan pada update berikutnya.');});
  window.addEventListener('resize',drawScene);
  updateStats();updateOrder();updateProgress();drawScene();requestAnimationFrame(frame);
})();