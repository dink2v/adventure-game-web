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
    marketCart:saved.marketCart && typeof saved.marketCart==='object' ? saved.marketCart : {}, marketReceipts:Array.isArray(saved.marketReceipts) ? saved.marketReceipts : [], marketSold:saved.marketSold && typeof saved.marketSold==='object' ? saved.marketSold : {},
    menuPrices:saved.menuPrices && typeof saved.menuPrices==='object' ? saved.menuPrices : {},
    stock:saved.stock ?? 12, day:saved.day ?? 1, stove:saved.stove ?? 1,
    tables:saved.tables ?? 2, orderNo:saved.orderNo ?? 1,
    menu:saved.menu || 'nasi', orderMenu:saved.orderMenu || saved.menu || 'nasi', step:saved.step ?? 0, patience:saved.patience ?? 100, cookingStarted:saved.cookingStarted ?? false, cookingElapsed:saved.cookingElapsed ?? 0, actionIndex:saved.actionIndex ?? 0, qualityScore:saved.qualityScore ?? 0, qualityLabel:saved.qualityLabel || 'Biasa', tick:0, sound:false,
    guests:[{x:.2,y:.53,color:'#e2a875',shirt:'#477a62',emoji:'👨🏻'},{x:.77,y:.55,color:'#d6a17b',shirt:'#bd7652',emoji:'👩🏻'}],
    cashEarned:0, marketInventory:saved.marketInventory ?? {rice:5,egg:5,vegetable:5,seasoning:5,noodle:5,chicken:3,tea:5,ice:5}, marketCycle:saved.marketCycle ?? 0, marketTimer:0, staff:saved.staff ?? false, promoUsed:saved.promoUsed ?? false, promoBonusPending:saved.promoBonusPending ?? false, todayServed:saved.todayServed ?? 0, todayRevenue:saved.todayRevenue ?? 0, missionClaimed:saved.missionClaimed ?? false, totalRevenue:saved.totalRevenue ?? 0,
    onlineOrders:Array.isArray(saved.onlineOrders)?saved.onlineOrders:[], orderSource:saved.orderSource||'walkin', orderAcceptedAt:saved.orderAcceptedAt||0, orderDeadlineAt:saved.orderDeadlineAt||0, suspendedOrder:saved.suspendedOrder&&typeof saved.suspendedOrder==='object'?saved.suspendedOrder:null, nextOnlineAt:saved.nextOnlineAt||Date.now()+4500, onlineSequence:saved.onlineSequence||1
  };
  let lastTime=0, toastTimer=0, lastUiUpdate=0, lastSaveAt=0;
  function sellingPrice(id){const base=recipes[id]?.price??1000;const custom=Number(state.menuPrices[id]);return Number.isFinite(custom)&&custom>=1?Math.round(custom):base;}
  function compactPrice(id){const value=sellingPrice(id)/1000;return (Number.isInteger(value)?String(value):value.toFixed(1))+'k';}
  function persist(){try{localStorage.setItem('warung-kita-save',JSON.stringify({menuPrices:state.menuPrices,marketInventory:state.marketInventory,marketCycle:state.marketCycle,marketCart:state.marketCart,marketReceipts:state.marketReceipts,marketSold:state.marketSold,cash:state.cash,rep:state.rep,served:state.served,stock:state.stock,day:state.day,stove:state.stove,tables:state.tables,orderNo:state.orderNo,menu:state.menu,orderMenu:state.orderMenu,step:state.step,patience:state.patience,cookingStarted:state.cookingStarted,cookingElapsed:state.cookingElapsed,actionIndex:state.actionIndex,qualityScore:state.qualityScore,qualityLabel:state.qualityLabel,staff:state.staff,promoUsed:state.promoUsed,promoBonusPending:state.promoBonusPending,todayServed:state.todayServed,todayRevenue:state.todayRevenue,missionClaimed:state.missionClaimed,totalRevenue:state.totalRevenue,onlineOrders:state.onlineOrders,orderSource:state.orderSource,orderAcceptedAt:state.orderAcceptedAt,orderDeadlineAt:state.orderDeadlineAt,suspendedOrder:state.suspendedOrder,nextOnlineAt:state.nextOnlineAt,onlineSequence:state.onlineSequence}));}catch{}}
  function queueOnlineOrder(){
    const available=Object.keys(recipes).filter(id=>unlocked(id));
    const menu=available[Math.floor(Math.random()*available.length)];
    const now=Date.now(),id='ONL-'+String(state.onlineSequence++).padStart(4,'0');
    state.onlineOrders.push({id,menu,createdAt:now,expiresAt:now+45000});
    if(state.onlineOrders.length>5)state.onlineOrders.shift();
    state.nextOnlineAt=now+9000+Math.random()*6500;
    persist();renderOnlineOrders();
    toast('Order online baru masuk: '+recipes[menu].name+'. Ambil saat kamu siap!');
  }
  function renderOnlineOrders(){
    const list=$('online-order-list'),count=$('online-order-count');
    if(!list||!count)return;
    const now=Date.now();count.textContent=String(state.onlineOrders.length);
    list.innerHTML=state.onlineOrders.length?state.onlineOrders.map(order=>{
      const recipe=recipes[order.menu]||recipes.nasi;
      return '<article class="online-order-item"><div class="online-order-main"><span class="online-order-emoji">'+recipe.emoji+'</span><div><strong>'+recipe.name+'</strong><small>'+order.id+' · '+money(sellingPrice(order.menu))+'</small></div></div><div class="online-order-meta"><span>Antrean · ambil saat siap</span><button type="button" data-accept-online="'+order.id+'">Ambil order</button></div></article>';
    }).join(''):'<div class="online-orders-empty">Belum ada order online. Pesanan baru akan muncul otomatis — ambil saat kamu siap.</div>';
  }
  function acceptOnlineOrder(id){
    const order=state.onlineOrders.find(item=>item.id===id);
    if(!order)return;
    if(state.step!==0||state.cookingStarted){toast('Selesaikan pesanan aktif dulu sebelum mengambil order online.');return;}
    if(state.orderSource==='online'){toast('Selesaikan atau lewati order online aktif dulu, bro.');return;}
    if(state.orderSource==='walkin'&&!state.suspendedOrder){state.suspendedOrder={orderMenu:state.orderMenu,menu:state.menu,patience:state.patience};}
    state.onlineOrders=state.onlineOrders.filter(item=>item.id!==id);
    state.orderMenu=order.menu;state.menu=order.menu;state.orderNo++;state.orderSource='online';
    state.orderAcceptedAt=Date.now();state.orderDeadlineAt=state.orderAcceptedAt+35000;
    state.step=0;state.cookingStarted=false;state.cookingElapsed=0;state.actionIndex=0;state.qualityScore=0;state.qualityLabel='Biasa';state.patience=100;
    $('menu-select').value=state.menu;
    $('scene-status').textContent='Order online '+order.id+' sedang dikerjakan';
    persist();updateOrder();updateStats();renderOnlineOrders();drawScene();
    toast('Order '+order.id+' diambil! Selesaikan dalam 35 detik untuk bonus tepat waktu.');
  }
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200);}

  // Acuan PIHPS untuk Kota Blitar, data 16 Oktober 2026.
  // Harga paket dihitung dari harga per kg x bobot paket; bukan harga live.
  const marketGoods = [
    {id:'rice',name:'Beras (0,5 kg)',emoji:'🍚',category:'pokok',desc:'Acuan Blitar Rp14.850/kg · paket 0,5 kg.',marketPrice:7425,add:3},
    {id:'egg',name:'Telur ayam (0,25 kg)',emoji:'🥚',category:'protein',desc:'Acuan Blitar Rp26.000/kg · paket 0,25 kg.',marketPrice:6500,add:3},
    {id:'seasoning',name:'Cabai rawit (0,1 kg)',emoji:'🌶️',category:'sayur',desc:'Acuan Blitar Rp47.500/kg · paket 0,1 kg.',marketPrice:4750,add:3},
    {id:'noodle',name:'Bawang merah (0,1 kg)',emoji:'🧅',category:'sayur',desc:'Acuan Blitar Rp27.250/kg · paket 0,1 kg.',marketPrice:2725,add:3},
    {id:'chicken',name:'Daging ayam (0,25 kg)',emoji:'🍗',category:'protein',desc:'Acuan Blitar Rp37.500/kg · paket 0,25 kg.',marketPrice:9375,add:2},
    {id:'tea',name:'Gula pasir (0,25 kg)',emoji:'🧂',category:'pokok',desc:'Acuan Blitar Rp17.850/kg · paket 0,25 kg.',marketPrice:4463,add:4},
    {id:'vegetable',name:'Sayuran campur (1 paket)',emoji:'🥬',category:'sayur',desc:'Paket simulasi game · sayur untuk nasi goreng dan lalapan.',marketPrice:3500,add:3},
    {id:'garlic',name:'Bawang putih (0,1 kg)',emoji:'🧄',category:'sayur',desc:'Paket simulasi game · bumbu dasar masakan.',marketPrice:3200,add:3},
    {id:'noodle-pack',name:'Mi telur (2 porsi)',emoji:'🍜',category:'pokok',desc:'Paket simulasi game · mi goreng dan bakso.',marketPrice:4000,add:3},
    {id:'bihun',name:'Bihun (1 bungkus)',emoji:'🍝',category:'pokok',desc:'Paket simulasi game · pelengkap soto ayam.',marketPrice:3500,add:3},
    {id:'meatball',name:'Bakso (1 paket)',emoji:'🍖',category:'protein',desc:'Paket simulasi game · bakso siap olah.',marketPrice:8000,add:3},
    {id:'beef',name:'Daging sapi (0,25 kg)',emoji:'🥩',category:'protein',desc:'Paket simulasi game · pilihan menu tambahan.',marketPrice:18000,add:2},
    {id:'tofu',name:'Tahu (1 paket)',emoji:'⬜',category:'protein',desc:'Paket simulasi game · lauk dan pelengkap.',marketPrice:3000,add:3},
    {id:'tempe',name:'Tempe (1 papan)',emoji:'🟫',category:'protein',desc:'Paket simulasi game · lauk dan pelengkap.',marketPrice:3500,add:3},
    {id:'oil',name:'Minyak goreng (0,25 L)',emoji:'🫗',category:'pokok',desc:'Paket simulasi game · kebutuhan menggoreng.',marketPrice:5000,add:4},
    {id:'salt',name:'Garam (1 bungkus)',emoji:'🧂',category:'lainnya',desc:'Paket simulasi game · bumbu dasar.',marketPrice:1500,add:4},
    {id:'soy-sauce',name:'Kecap manis (1 botol kecil)',emoji:'🍶',category:'lainnya',desc:'Paket simulasi game · bumbu mi goreng.',marketPrice:4500,add:3},
    {id:'peanut',name:'Kacang tanah (0,1 kg)',emoji:'🥜',category:'sayur',desc:'Paket simulasi game · bahan bumbu kacang sate.',marketPrice:3500,add:3},
    {id:'celery',name:'Seledri (1 ikat)',emoji:'🌿',category:'sayur',desc:'Paket simulasi game · pelengkap bakso dan soto.',marketPrice:2000,add:3},
    {id:'lime',name:'Jeruk limau (1 paket)',emoji:'🍋',category:'sayur',desc:'Paket simulasi game · pelengkap sate ayam.',marketPrice:2500,add:3},
    {id:'tea-leaf',name:'Teh (1 paket)',emoji:'🫖',category:'minuman',desc:'Paket simulasi game · seduh minuman.',marketPrice:3000,add:4},
    {id:'ice',name:'Es batu (1 paket)',emoji:'🧊',category:'minuman',desc:'Paket simulasi game · minuman dingin.',marketPrice:2000,add:4},
    {id:'ginger',name:'Jahe (0,1 kg)',emoji:'🫚',category:'sayur',desc:'Paket simulasi game · rempah tambahan.',marketPrice:2500,add:3},
    {id:'coconut-milk',name:'Santan (1 bungkus)',emoji:'🥥',category:'lainnya',desc:'Paket simulasi game · bahan tambahan masakan.',marketPrice:3000,add:3}
  ];
  const marketPriceDate = '16 Oktober 2026';
  let marketSearch = '', marketCategory = 'all';
  function marketPrice(g){return g.marketPrice;}
  function filterMarketGoods(){
    const query=marketSearch.trim().toLocaleLowerCase('id-ID');
    return marketGoods.filter(g=>(marketCategory==='all'||g.category===marketCategory)&&(!query||[g.name,g.desc,g.category].join(' ').toLocaleLowerCase('id-ID').includes(query)));
  }

  const MARKET_PACKAGE_LIMIT=100;
  const MARKET_RESTOCK_SECONDS=20;
  function marketAvailable(g){return Math.max(0,MARKET_PACKAGE_LIMIT-(Number(state.marketSold[g.id])||0));}
  function cartQuantity(id){return Math.max(0,Math.floor(Number(state.marketCart[id])||0));}
  function cartItems(){return marketGoods.filter(g=>cartQuantity(g.id)>0).map(g=>({good:g,qty:cartQuantity(g.id),unitPrice:marketPrice(g),subtotal:marketPrice(g)*cartQuantity(g.id)}));}
  function cartTotal(){return cartItems().reduce((sum,item)=>sum+item.subtotal,0);}
  function renderMarket(){
    const grid=$('market-grid');if(!grid)return;
    $('market-cash').textContent=money(state.cash);$('market-stock-total').textContent=state.stock;
    const sellQty=$('stock-sell-qty'),sellBtn=$('sell-stock-btn');
    if(sellQty){sellQty.max=state.stock;if(Number(sellQty.value)>state.stock)sellQty.value=Math.max(1,state.stock);}
    if(sellBtn){sellBtn.disabled=state.stock<1;const qty=Math.max(1,Math.floor(Number(sellQty?.value)||1));sellBtn.textContent='Jual · '+money(qty*1500);}
    $('market-refresh').textContent='Acuan Kota Blitar · data '+marketPriceDate;
    const visibleGoods=filterMarketGoods();
    grid.innerHTML=visibleGoods.length?visibleGoods.map(g=>{
      const price=marketPrice(g),available=marketAvailable(g),qty=cartQuantity(g.id);
      return '<article class="market-item"><div class="market-item-top"><span class="market-item-emoji">'+g.emoji+'</span><div><h3>'+g.name+'</h3><p>'+g.desc+'</p></div></div><div class="market-item-price">'+money(price)+'</div><div class="market-item-meta"><span>+ '+g.add+' porsi stok/paket</span><span>Pasar: '+available+'</span></div><div class="market-item-meta"><span>Di keranjang</span><b>'+qty+' paket</b></div><button type="button" data-add-cart="'+g.id+'" '+(qty>=available||available<=0?'disabled':'')+'>＋ Tambah ke keranjang</button></article>';
    }).join(''):'<div class="market-no-results"><span>🔎</span><strong>Bahan tidak ditemukan</strong><p>Coba kata kunci lain atau pilih kategori Semua bahan.</p></div>';
    const resultCount=$('market-result-count');
    if(resultCount)resultCount.textContent='Menampilkan '+visibleGoods.length+' dari '+marketGoods.length+' bahan';
    const clear=$('market-search-clear');if(clear)clear.hidden=!marketSearch;
    const note=$('market-note');
    if(note)note.innerHTML='Stok pasar maksimal 100 paket per bahan dan diperbarui setiap 20 detik. Harga 6 bahan acuan mengikuti snapshot PIHPS Kota Blitar tanggal '+marketPriceDate+' (bukan harga live). Bahan lainnya menggunakan harga simulasi game. <a href="https://www.panganindonesia.com/harga/kota/blitar/" target="_blank" rel="noopener noreferrer">Lihat sumber acuan</a>.';
    grid.querySelectorAll('[data-add-cart]').forEach(btn=>btn.addEventListener('click',()=>addToCart(btn.dataset.addCart)));
    renderCart();
  }
  function sellStock(){
    const input=$('stock-sell-qty');
    const qty=Math.floor(Number(input?.value)||0);
    if(!Number.isFinite(qty)||qty<1){toast('Masukkan jumlah porsi minimal 1.');return;}
    if(qty>state.stock){toast('Stok dapur tidak cukup untuk jumlah itu.');return;}
    const revenue=qty*1500;
    state.stock-=qty;state.cash+=revenue;
    persist();updateStats();renderMarket();
    toast(qty+' porsi stok terjual · kas bertambah '+money(revenue)+'.');
  }
  function addToCart(id){
    const g=marketGoods.find(x=>x.id===id);if(!g)return;
    const available=marketAvailable(g),qty=cartQuantity(id);
    if(available<=qty){toast('Jumlah di keranjang sudah mencapai stok pasar yang tersedia.');return;}
    state.marketCart[id]=qty+1;persist();renderMarket();toast(g.name+' ditambahkan ke keranjang.');
  }
  function changeCartQuantity(id,delta){
    const g=marketGoods.find(x=>x.id===id);if(!g)return;
    const next=cartQuantity(id)+delta,available=marketAvailable(g);
    if(next<=0)delete state.marketCart[id];
    else if(next>available){toast('Melebihi stok pasar yang tersedia.');return;}
    else state.marketCart[id]=next;
    persist();renderMarket();
  }
  function renderCart(){
    const list=$('market-cart-items'),total=$('market-cart-total'),count=$('market-cart-count'),checkout=$('market-checkout-btn'),history=$('market-receipt-history'),badge=$('market-cart-badge');
    if(!list)return;
    const items=cartItems();
    const itemCount=items.reduce((sum,item)=>sum+item.qty,0);count.textContent=itemCount+' paket';if(badge)badge.textContent=itemCount>99?'99+':String(itemCount);
    total.textContent=money(cartTotal());
    list.innerHTML=items.length?items.map(({good,qty,unitPrice,subtotal})=>'<article class="cart-line"><div class="cart-line-info"><span>'+good.emoji+'</span><div><strong>'+good.name+'</strong><small>'+qty+' × '+money(unitPrice)+' = '+money(subtotal)+'</small></div></div><div class="cart-line-actions"><button type="button" data-cart-minus="'+good.id+'" aria-label="Kurangi '+good.name+'">−</button><b>'+qty+'</b><button type="button" data-cart-plus="'+good.id+'" aria-label="Tambah '+good.name+'">+</button><button type="button" data-cart-remove="'+good.id+'" aria-label="Hapus '+good.name+'" title="Hapus">×</button></div></article>').join(''):'<p class="cart-empty">Keranjang masih kosong. Tambahkan bahan dari daftar pasar di atas.</p>';
    list.querySelectorAll('[data-cart-minus]').forEach(b=>b.addEventListener('click',()=>changeCartQuantity(b.dataset.cartMinus,-1)));
    list.querySelectorAll('[data-cart-plus]').forEach(b=>b.addEventListener('click',()=>changeCartQuantity(b.dataset.cartPlus,1)));
    list.querySelectorAll('[data-cart-remove]').forEach(b=>b.addEventListener('click',()=>{delete state.marketCart[b.dataset.cartRemove];persist();renderMarket();}));
    checkout.disabled=!items.length||cartTotal()>state.cash;
    checkout.textContent=cartTotal()>state.cash?'Uang kas tidak cukup':'Konfirmasi Pembelian · '+money(cartTotal());
    history.innerHTML=state.marketReceipts.length?state.marketReceipts.slice().reverse().slice(0,10).map(r=>'<button type="button" class="receipt-history-item" data-open-receipt="'+r.id+'"><span><strong>'+r.number+'</strong><small>'+new Date(r.timestamp).toLocaleString('id-ID')+' · '+r.items.length+' jenis bahan</small></span><b>'+money(r.total)+'</b></button>').join(''):'<p class="cart-empty">Belum ada transaksi belanja.</p>';
    history.querySelectorAll('[data-open-receipt]').forEach(b=>b.addEventListener('click',()=>showReceipt(b.dataset.openReceipt)));
  }
  function confirmMarketPurchase(){
    const items=cartItems();if(!items.length){toast('Keranjang masih kosong.');return;}
    const total=items.reduce((sum,item)=>sum+item.subtotal,0);
    if(total>state.cash){toast('Uang kas tidak cukup. Kurangi jumlah barang di keranjang.');renderCart();return;}
    for(const item of items){if(item.qty>marketAvailable(item.good)){toast('Stok '+item.good.name+' berubah. Periksa keranjang lagi.');renderMarket();return;}}
    const now=Date.now(),sequence=(state.marketReceipts[state.marketReceipts.length-1]?.sequence||0)+1;
    const receipt={id:'receipt-'+now+'-'+Math.random().toString(36).slice(2,7),sequence,number:'PSR-'+String(sequence).padStart(4,'0'),timestamp:now,day:state.day,items:items.map(({good,qty,unitPrice,subtotal})=>({id:good.id,name:good.name,emoji:good.emoji,qty,unitPrice,subtotal,stockAdded:good.add*qty})),total,cashBefore:state.cash,cashAfter:state.cash-total};
    state.cash-=total;
    for(const item of items){state.stock+=item.good.add*item.qty;state.marketInventory[item.good.id]=(state.marketInventory[item.good.id]||0)+item.qty;state.marketSold[item.good.id]=(state.marketSold[item.good.id]||0)+item.qty;}
    state.marketCart={};state.marketReceipts.push(receipt);if(state.marketReceipts.length>100)state.marketReceipts=state.marketReceipts.slice(-100);
    persist();updateStats();renderMarket();toggleMarketCart(false);showReceipt(receipt.id);
  }
  function showReceipt(id){
    const receipt=state.marketReceipts.find(r=>r.id===id);if(!receipt)return;
    const modal=$('receipt-modal'),content=$('receipt-content');if(!modal||!content)return;
    content.innerHTML='<div class="receipt-brand"><div class="receipt-logo">WK</div><h2>WARUNG KITA</h2><p>STRUK PEMBELIAN BAHAN</p></div><div class="receipt-meta"><span>No. transaksi</span><strong>'+receipt.number+'</strong><span>Tanggal</span><strong>'+new Date(receipt.timestamp).toLocaleString("id-ID")+'</strong><span>Hari usaha</span><strong>Hari '+receipt.day+'</strong><span>Lokasi</span><strong>Pasar bahan baku</strong></div><div class="receipt-items">'+receipt.items.map(item=>'<div class="receipt-item"><div><strong>'+item.emoji+' '+item.name+'</strong><small>'+item.qty+' paket × '+money(item.unitPrice)+'</small></div><b>'+money(item.subtotal)+'</b><small class="receipt-stock">Stok dapur +'+item.stockAdded+' porsi</small></div>').join('')+'</div><div class="receipt-total"><span>Total belanja</span><strong>'+money(receipt.total)+'</strong></div><div class="receipt-payment"><span>Metode pembayaran</span><b>Uang kas</b><span>Sebelum transaksi</span><b>'+money(receipt.cashBefore)+'</b><span>Sisa uang kas</span><b>'+money(receipt.cashAfter)+'</b><span>Status</span><b class="receipt-paid">LUNAS</b></div><p class="receipt-thanks">Terima kasih sudah berbelanja!<br>Bahan siap digunakan untuk memasak.</p>';
    modal.hidden=false;modal.dataset.receiptId=id;$('receipt-close-btn').focus();
  }
  function closeReceipt(){const modal=$('receipt-modal');if(modal)modal.hidden=true;}
  function setView(view){
    const all=['home','kitchen','market','business','report','more'];
    if(!all.includes(view))view='home';
    document.body.classList.toggle('home-view',view==='home');
    const topbar=document.querySelector('.topbar');
    if(topbar)topbar.style.display=view==='home'?'none':'';
    document.querySelectorAll('.app-bottom-nav [data-view]').forEach(button=>{
      const active=button.dataset.view===view;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('.dashboard-nav [data-view-link]').forEach(link=>link.classList.toggle('active',link.dataset.viewLink===view));
    const scene=document.querySelector('.scene-card'),order=document.querySelector('.order-card'),kitchen=$('kitchen-panel'),onlineOrders=$('online-orders-card');
    const dashboard=$('dashboard'),market=$('market-panel'),business=$('business-panel');
    const extras=document.querySelector('.extra-management'),more=$('more-panel'),report=$('report-panel'),footer=document.querySelector('footer');
    const panels=[dashboard,scene,order,kitchen,onlineOrders,market,business,extras,more,report,footer];
    panels.forEach(panel=>panel?.classList.add('app-view-hidden'));
    const reveal=(...elements)=>elements.forEach(element=>element?.classList.remove('app-view-hidden'));
    if(view==='home')reveal(dashboard);
    if(view==='kitchen')reveal(scene,order,kitchen,onlineOrders);
    if(view==='market'){reveal(market);renderMarket();}
    if(view==='business')reveal(business,extras);
    if(view==='report')reveal(report);
    if(view==='more')reveal(more,footer);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  document.querySelectorAll('.app-bottom-nav [data-view]').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
  document.querySelectorAll('.dashboard-nav [data-view-link]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();setView(link.dataset.viewLink);document.querySelectorAll('.dashboard-nav a').forEach(a=>a.classList.toggle('active',a===link));}));


  function current(){return recipes[state.menu];}
  function formatClock(){return state.todayServed>5?'SORE':state.todayServed>2?'SIANG':'PAGI';}
  function unlocked(id){return !recipes[id].unlock || state.served>=recipes[id].unlock;}
  function rankName(){return state.served>=25?'Calon Juragan Restoran':state.served>=15?'Pemilik Rumah Makan':state.served>=8?'Juragan Warung Berkembang':'Pemilik Warung Pemula';}
  function renderMenuPrices(){
    const list=$('menu-price-list');if(!list)return;
    list.innerHTML=Object.keys(recipes).map(id=>{
      const r=recipes[id],value=sellingPrice(id),isLocked=!unlocked(id);
      const profit=value-r.cost;
      return '<article class="price-editor-card" data-price-card="'+id+'"><div class="price-editor-info"><span class="price-editor-emoji">'+r.emoji+'</span><div><strong>'+r.name+'</strong><small>Rekomendasi: '+money(r.price)+' · Modal: '+money(r.cost)+'</small><span class="price-profit '+(profit>=0?'profit-positive':'profit-negative')+'">'+(profit>=0?'Selisih kotor: ':'Selisih terhadap modal: ')+money(profit)+'</span>'+(isLocked?'<span class="price-locked">Menu terbuka setelah '+r.unlock+' pelanggan</span>':'')+'</div></div><label class="price-input-label" for="price-'+id+'">Harga jual (Rp)</label><div class="price-editor-controls"><input id="price-'+id+'" data-menu-price="'+id+'" type="number" inputmode="numeric" min="1" max="1000000000" step="500" value="'+value+'" aria-label="Harga jual '+r.name+'"><button type="button" data-save-price="'+id+'">Simpan</button></div></article>';
    }).join('');
    list.querySelectorAll('[data-save-price]').forEach(button=>button.addEventListener('click',()=>saveMenuPrice(button.dataset.savePrice)));
    list.querySelectorAll('[data-menu-price]').forEach(input=>input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();saveMenuPrice(input.dataset.menuPrice);}}));
  }
  function saveMenuPrice(id){
    if(!recipes[id])return;
    const input=$('price-'+id),value=Number(input?.value);
    if(!Number.isFinite(value)||value<1||value>1000000000){toast('Masukkan harga minimal Rp 1 dan maksimal Rp 1.000.000.000.');if(input)input.focus();return;}
    state.menuPrices[id]=Math.round(value);
    persist();updateStats();updateOrder();drawScene();renderMenuPrices();
    toast('Harga '+recipes[id].name+' disimpan: '+money(sellingPrice(id))+'.');
  }

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
    renderMenuPrices();
    $('promo-status').textContent=state.promoUsed?'PROMOSI SUDAH DIPAKAI':'BELUM AKTIF HARI INI';$('promo-btn').disabled=state.promoUsed||state.cash<12000;
    for(const option of $('menu-select').options){if(recipes[option.value]){const open=unlocked(option.value);option.disabled=!!recipes[option.value].unlock&&!open;option.textContent=(open?'':'🔒 ')+recipes[option.value].name+' · '+money(sellingPrice(option.value))+(open?'':' · buka '+recipes[option.value].unlock+' pelanggan');}}
  }
  function updateStats(){
    $('cash').textContent=money(state.cash);$('rep').textContent=state.rep.toFixed(1);$('dashboard-revenue').textContent=money(state.todayRevenue);$('dashboard-served').textContent=state.todayServed;$('dashboard-day').textContent='Hari '+state.day;
    if($('home-cash'))$('home-cash').textContent=money(state.cash);
    if($('home-revenue'))$('home-revenue').textContent=money(state.todayRevenue);
    if($('home-served'))$('home-served').textContent=state.todayServed;
    if($('home-rep'))$('home-rep').textContent=state.rep.toFixed(1)+' / 5';
    $('stock').textContent=state.stock;$('day-label').textContent='HARI '+state.day;$('time-label').textContent=formatClock();
    $('stove-level').textContent=state.stove;$('table-level').textContent=state.tables;$('upgrade-level').textContent='Warung Level '+Math.max(1,Math.floor((state.stove+state.tables)/3));
    $('stove-btn').innerHTML=money(80000*state.stove)+' <span>↗</span>';$('table-btn').innerHTML=money(60000*state.tables)+' <span>↗</span>';
    $('stove-btn').disabled=state.cash<80000*state.stove;$('table-btn').disabled=state.cash<60000*state.tables;$('stock-btn').disabled=state.cash<25000;updateProgress();
  }
  function actionWindow(){const r=recipes[state.orderMenu]||recipes.nasi;const count=r.actions||1;const center=r.cookTime*(state.actionIndex+1)/(count+1);return {start:center-1.1,end:center+1.1};}
  function updateOrder(){
    const r=recipes[state.orderMenu]||recipes.nasi, selected=current();
    $('order-title').textContent=r.name;$('dish-art').textContent=r.emoji;$('order-price').textContent=money(sellingPrice(state.orderMenu));
    $('customer-name').textContent=r.customer[0];$('customer-avatar').textContent=r.customer[1];$('customer-mood').textContent=r.customer[2];
    const deadlineLeft=state.orderSource==='online'&&state.orderDeadlineAt?Math.ceil((state.orderDeadlineAt-Date.now())/1000):0;
    $('order-tag').textContent=state.orderSource==='online'?'ONLINE · '+String(state.orderNo).padStart(3,'0')+' · '+Math.max(0,deadlineLeft)+' dtk':'PESANAN #'+String(state.orderNo).padStart(3,'0');
    $('recipe-cost').textContent='Modal '+money(selected.cost);$('ingredients').innerHTML=selected.ingredients.map(x=>'<span>'+x+'</span>').join('');
    $('patience-label').textContent=Math.round(state.patience)+'%';$('patience-bar').style.width=Math.min(100,state.patience)+'%';
    $('patience-bar').style.background=state.patience<30?'#c66a54':state.patience<60?'#d7a64e':'#70a879';
    $('menu-select').value=state.menu;
    const win=actionWindow();
    const buttonLabel=state.step===0?'♧ Siapkan bahan':state.step===1?(!state.cookingStarted?'♨ Mulai memasak':(state.actionIndex<(r.actions||1)&&state.cookingElapsed>=win.start&&state.cookingElapsed<=win.end?'🥄 Lakukan aksi sekarang':'⏳ Memasak…')):'✓ Sajikan & terima uang';
    $('cook-btn').innerHTML=buttonLabel;$('cook-btn').disabled=state.step===1&&state.cookingStarted&&state.cookingElapsed>=r.cookTime;
    $('kitchen-status').textContent=state.step===2?'SIAP SAJI':state.cookingStarted?'MEMASAK':state.step===1?'BAHAN SIAP':'SIAP';
    for(let i=1;i<=3;i++){const el=$('step-'+i);el.classList.toggle('active',state.step===i-1);el.classList.toggle('done',state.step>=i);el.querySelector('.step-check').textContent=state.step>=i?'✓':state.step===i-1?'●':'○';}
    if(state.step===0)$('cook-feedback-text').textContent=state.menu===state.orderMenu?'Siapkan bahan. Stok baru dikurangi saat memasak benar-benar dimulai.':'Pesanan pelanggan: '+r.name+'. Pilih menu yang sama sebelum menyiapkan bahan.';
    else if(state.step===1&&!state.cookingStarted)$('cook-feedback-text').textContent='Bahan siap. Tekan Mulai memasak untuk memulai timer dan mengurangi stok.';
    else if(state.step===1)$('cook-feedback-text').textContent=state.actionIndex>=(r.actions||1)?'Masakan sedang diproses… '+Math.max(0,Math.ceil(r.cookTime-state.cookingElapsed))+' detik tersisa.':'Memasak '+r.name+' · '+Math.min(100,Math.round(state.cookingElapsed/r.cookTime*100))+'% · '+Math.max(0,Math.ceil(r.cookTime-state.cookingElapsed))+' detik tersisa. '+(state.cookingElapsed<win.start?'Bersiap untuk aksi berikutnya.':state.cookingElapsed<=win.end?'Sekarang! Tekan tombol aksi.':'Aksi terlewat; tunggu aksi berikutnya.');
    else $('cook-feedback-text').textContent='Hidangan siap disajikan. Kualitas: '+state.qualityLabel+'. Sajikan untuk menyelesaikan pesanan.';
    updateActionTiming();
  }
  function updateActionTiming(){
    const panel=$('action-timing'),trackWindow=$('action-timing-window'),marker=$('action-timing-marker'),label=$('action-timing-label');
    if(!panel||!trackWindow||!marker||!label)return;
    const r=recipes[state.orderMenu]||recipes.nasi, count=r.actions||1;
    const active=state.step===1&&state.cookingStarted&&state.actionIndex<count;
    panel.hidden=!active;
    if(!active)return;
    const win=actionWindow(), total=Math.max(1,r.cookTime);
    trackWindow.style.left=(Math.max(0,win.start)/total*100)+'%';
    trackWindow.style.width=(Math.max(0,Math.min(total,win.end)-Math.max(0,win.start))/total*100)+'%';
    marker.style.left=(Math.min(100,Math.max(0,state.cookingElapsed/total*100)))+'%';
    if(state.cookingElapsed<win.start){label.textContent='TUNGGU · aksi '+(state.actionIndex+1)+' dari '+count+' segera';panel.dataset.status='waiting';}
    else if(state.cookingElapsed<=win.end){label.textContent='SEKARANG! Tekan “Lakukan aksi”';panel.dataset.status='ready';}
    else {label.textContent='Aksi terlewat · tunggu indikator berikutnya';panel.dataset.status='missed';}
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
    ctx.font='12px DM Sans, sans-serif';['Nasi goreng  '+compactPrice('nasi'),'Mi goreng     '+compactPrice('mie'),'Bakso kuah   '+compactPrice('bakso'),'Es teh             '+compactPrice('es')].forEach((t,i)=>ctx.fillText(t,710,95+i*17));
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
    if(skipped&&state.orderSource==='online'&&state.suspendedOrder){const pending=state.suspendedOrder;state.suspendedOrder=null;state.orderMenu=pending.orderMenu;state.menu=pending.menu;state.orderSource='walkin';state.orderAcceptedAt=0;state.orderDeadlineAt=0;state.step=0;state.cookingStarted=false;state.cookingElapsed=0;state.actionIndex=0;state.qualityScore=0;state.qualityLabel='Biasa';state.patience=pending.patience??100;$('menu-select').value=state.menu;updateOrder();updateStats();drawScene();persist();toast('Order online dilepas. Pesanan pelanggan sebelumnya kembali, bro.');return;}
    state.orderNo++;const available=Object.keys(recipes).filter(id=>unlocked(id));state.orderMenu=available[Math.floor(Math.random()*available.length)];state.step=0;state.cookingStarted=false;state.cookingElapsed=0;state.actionIndex=0;state.qualityScore=0;state.qualityLabel='Biasa';state.patience=state.promoBonusPending?125:100;state.promoBonusPending=false;
    state.orderSource='walkin';state.orderAcceptedAt=0;state.orderDeadlineAt=0;state.suspendedOrder=null;
    updateOrder();updateStats();drawScene();persist();if(skipped)toast('Pesanan dibatalkan sebelum memasak. Pelanggan baru datang.');
  }
  function cookAction(){
    const r=recipes[state.orderMenu]||recipes.nasi;
    if(state.step===0){
      // Otomatis pilih menu yang dipesan agar pemain tidak terjebak karena pilihan menu berbeda.
      if(state.menu!==state.orderMenu){
        state.menu=state.orderMenu;
        $('menu-select').value=state.menu;
      }
      if(state.stock<r.stock){toast('Stok bahan kurang. Buka Pasar untuk membeli stok dulu.');return;}
      state.step=1;state.stock-=r.stock;state.cookingStarted=true;state.cookingElapsed=0;state.actionIndex=0;state.qualityScore=0;state.qualityLabel='Biasa';$('scene-status').textContent='Koki sedang memasak '+r.name;toast('Memasak dimulai! Stok dikurangi. Perhatikan indikator dan tekan tombol saat aksi muncul.');
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
      const onlineOrder=state.orderSource==='online';
      const onTime=onlineOrder&&Date.now()<=state.orderDeadlineAt;
      const deadlineAdjustment=onlineOrder?(onTime?1500:-1500):0;
      const reward=Math.max(1000,sellingPrice(state.orderMenu)+tip+qualityBonus+deadlineAdjustment);state.cash+=reward;state.cashEarned+=reward;state.totalRevenue+=reward;state.todayRevenue+=reward;state.served++;state.todayServed++;
      const repChange=(state.qualityLabel==='Istimewa'?.16:state.qualityLabel==='Enak'?.08:(state.patience>45?.03:-.12))+(onlineOrder&&!onTime?-.08:0);
      state.rep=Math.min(5,Math.max(.5,state.rep+repChange));
      let rolloverMessage='';
      if(state.todayServed>=8){
        if(!state.missionClaimed&&state.todayServed>=3&&state.todayRevenue>=30000){state.cash+=15000;state.rep=Math.min(5,state.rep+.2);state.missionClaimed=true;rolloverMessage=' Hadiah misi yang belum diklaim otomatis diberikan.';}
        const completedDay=state.day,dayRevenue=state.todayRevenue,dayCustomers=state.todayServed;state.day++;state.todayServed=0;state.todayRevenue=0;state.missionClaimed=false;state.promoUsed=false;state.cash+=10000;
        toast('Ringkasan Hari '+completedDay+': '+dayCustomers+' pelanggan, omzet '+money(dayRevenue)+'. Hari baru dimulai; bonus operasional Rp 10.000.'+rolloverMessage);
      } else toast('Pesanan tersaji! '+state.qualityLabel+' · '+(onlineOrder?(onTime?'bonus tepat waktu +Rp 1.500.':'terlambat, penalti Rp 1.500 dan reputasi -0,08. '):'')+'+'+money(reward)+' pendapatan'+(tip?' termasuk tip.':'.'));
      if(onlineOrder&&state.suspendedOrder){const pending=state.suspendedOrder;state.suspendedOrder=null;state.orderMenu=pending.orderMenu;state.menu=pending.menu;state.step=0;state.cookingStarted=false;state.cookingElapsed=0;state.actionIndex=0;state.qualityScore=0;state.qualityLabel='Biasa';state.patience=pending.patience??100;state.orderSource='walkin';state.orderAcceptedAt=0;state.orderDeadlineAt=0;$('menu-select').value=state.menu;$('scene-status').textContent='Kembali ke pesanan pelanggan';toast('Order online selesai ('+(onTime?'bonus tepat waktu +Rp 1.500':'penalti terlambat Rp 1.500')+'). Pesanan pelanggan sebelumnya menunggu untuk dilanjutkan.');}
      else{state.orderNo++;const available=Object.keys(recipes).filter(id=>unlocked(id));state.orderMenu=available[Math.floor(Math.random()*available.length)];state.step=0;state.cookingStarted=false;state.cookingElapsed=0;state.actionIndex=0;state.qualityScore=0;state.qualityLabel='Biasa';state.patience=state.promoBonusPending?125:100;state.promoBonusPending=false;state.orderSource='walkin';state.orderAcceptedAt=0;state.orderDeadlineAt=0;state.suspendedOrder=null;}
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
  function frame(t){const dt=Math.min((t-lastTime)/1000||0,.1);lastTime=t;state.tick+=dt;state.marketTimer+=dt;
    const now=Date.now();
    if(now>=state.nextOnlineAt){if(state.onlineOrders.length<5)queueOnlineOrder();else state.nextOnlineAt=now+6500;}
    if(now-(state.lastOnlineRenderAt||0)>500){state.lastOnlineRenderAt=now;renderOnlineOrders();if(state.orderSource==='online')updateOrder();}if(state.marketTimer>=MARKET_RESTOCK_SECONDS){state.marketTimer=0;state.marketCycle++;state.marketSold={};persist();if(!$('market-panel').classList.contains('app-view-hidden'))renderMarket();}
    if(state.step<2&&!state.cookingStarted){state.patience=Math.max(0,state.patience-dt*(state.step===1?(state.staff?0.95:1.4):(state.staff?0.22:.35)));}
    if(state.cookingStarted&&state.step===1){const r=recipes[state.orderMenu]||recipes.nasi;state.cookingElapsed=Math.min(r.cookTime,state.cookingElapsed+dt);const win=state.actionIndex<(r.actions||1)?actionWindow():null;if(win&&state.cookingElapsed>win.end){state.actionIndex++;persist();}if(state.cookingElapsed>=r.cookTime){state.step=2;state.cookingStarted=false;state.qualityLabel=state.qualityScore>=(r.actions||1)?'Istimewa':state.qualityScore>0?'Enak':'Biasa';$('scene-status').textContent='Hidangan '+state.qualityLabel.toLowerCase()+' siap disajikan';toast('Masakan selesai! Kualitas: '+state.qualityLabel+'.');persist();updateOrder();updateStats();}}
    if(state.patience===0&&state.step<2&&!state.cookingStarted&&state.orderSource!=='online'){state.rep=Math.max(.5,state.rep-.08);state.patience=100;state.step=0;state.orderNo++;const available=Object.keys(recipes).filter(id=>unlocked(id));state.orderMenu=available[Math.floor(Math.random()*available.length)];state.actionIndex=0;state.qualityScore=0;state.orderSource='walkin';state.orderAcceptedAt=0;state.orderDeadlineAt=0;state.suspendedOrder=null;toast('Pelanggan kehabisan sabar. Pesanan dilepas dan pelanggan baru datang.');updateOrder();updateStats();persist();}
    $('patience-label').textContent=Math.round(state.patience)+'%';$('patience-bar').style.width=Math.min(100,state.patience)+'%';$('patience-bar').style.background=state.patience<30?'#c66a54':state.patience<60?'#d7a64e':'#70a879';
    if(state.cookingStarted&&t-lastUiUpdate>180){updateOrder();lastUiUpdate=t;}
    if(state.cookingStarted&&t-lastSaveAt>1000){persist();lastSaveAt=t;}
    if(Math.floor(state.tick*2)%2===0)drawScene();
    requestAnimationFrame(frame);
  }
  $('enter-kitchen-btn').addEventListener('click',()=>setView('kitchen'));
  $('online-order-list').addEventListener('click',event=>{const button=event.target.closest('[data-accept-online]');if(button)acceptOnlineOrder(button.dataset.acceptOnline);});
  $('market-checkout-btn').addEventListener('click',confirmMarketPurchase);
  $('sell-stock-btn').addEventListener('click',sellStock);
  $('stock-sell-qty').addEventListener('input',()=>{const input=$('stock-sell-qty');const btn=$('sell-stock-btn');const qty=Math.max(1,Math.floor(Number(input.value)||1));btn.textContent='Jual · '+money(qty*1500);btn.disabled=state.stock<1||qty>state.stock;});
  const marketSearchInput=$('market-search'),marketCategorySelect=$('market-category'),marketSearchClear=$('market-search-clear');
  if(marketSearchInput)marketSearchInput.addEventListener('input',()=>{marketSearch=marketSearchInput.value;renderMarket();marketSearchInput.focus();});
  if(marketCategorySelect)marketCategorySelect.addEventListener('change',()=>{marketCategory=marketCategorySelect.value;renderMarket();});
  if(marketSearchClear)marketSearchClear.addEventListener('click',()=>{marketSearch='';if(marketSearchInput)marketSearchInput.value='';renderMarket();if(marketSearchInput)marketSearchInput.focus();});
  function toggleMarketCart(open){const panel=$('market-cart-panel'),trigger=$('market-cart-trigger');if(!panel||!trigger)return;const shouldOpen=typeof open==='boolean'?open:!panel.classList.contains('cart-drawer-open');panel.classList.toggle('cart-drawer-open',shouldOpen);trigger.setAttribute('aria-expanded',String(shouldOpen));document.body.classList.toggle('market-cart-drawer-active',shouldOpen);if(shouldOpen){renderCart();const close=$('market-cart-close');if(close)close.focus();}else trigger.focus();}
  $('market-cart-trigger').addEventListener('click',()=>toggleMarketCart());
  $('market-cart-close').addEventListener('click',()=>toggleMarketCart(false));
  $('market-cart-panel').addEventListener('click',event=>{if(event.target===$('market-cart-panel'))toggleMarketCart(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')toggleMarketCart(false);});
  $('receipt-close-btn').addEventListener('click',closeReceipt);
  $('receipt-close-bottom-btn').addEventListener('click',closeReceipt);
  $('receipt-print-btn').addEventListener('click',()=>window.print());
  $('receipt-modal').addEventListener('click',event=>{if(event.target===$('receipt-modal'))closeReceipt();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeReceipt();});
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
  updateStats();updateOrder();updateProgress();drawScene();renderMarket();setView('home');requestAnimationFrame(frame);
})();