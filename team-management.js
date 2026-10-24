(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = window.WARUNG_TEAM_CONFIG || {};
  const roles = {
    chef: 'Koki', cashier: 'Kasir', server: 'Pelayan',
    stock_manager: 'Pengelola stok', operations_manager: 'Manajer operasional'
  };
  const authRoles = { owner: 'Pemilik', manager: 'Pengelola', member: 'Anggota' };
  let client = null, user = null, team = null, membership = null, members = [];
  let presenceChannel = null, onlineIds = new Set(), busy = false;
  const esc = value => String(value ?? '');
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  const show = (id, visible) => { const el = $(id); if (el) el.hidden = !visible; };
  const note = (message, kind = 'info') => {
    setText('tm-status', message);
    const el = $('tm-status'); if (el) el.dataset.kind = kind;
  };
  const money = value => 'Rp ' + Math.round(Number(value) || 0).toLocaleString('id-ID');
  const canManage = () => ['owner', 'manager'].includes(membership?.role);
  const isOwner = () => membership?.role === 'owner';
  const roleOptions = selected => Object.entries(roles).map(([key, label]) =>
    '<option value="' + key + '"' + (key === selected ? ' selected' : '') + '>' + label + '</option>').join('');
  const memberOptions = (selected = '') => members.map(m =>
    '<option value="' + esc(m.user_id) + '"' + (m.user_id === selected ? ' selected' : '') + '>' +
    esc(m.display_name) + ' — ' + (roles[m.job_role] || roles.server) + '</option>').join('');

  function mount() {
    if ($('team-management-v3')) return;
    const host = $('team-panel');
    if (!host) return;
    const style = document.createElement('style');
    style.textContent = `
      #team-management-v3{margin-top:18px;padding:18px;border:1px solid #dfe7df;border-radius:18px;background:#fff;color:#20372e}
      #team-management-v3 [hidden]{display:none!important}
      #team-management-v3 .tm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      #team-management-v3 .tm-card{min-width:0;margin-top:12px;padding:14px;border:1px solid #e0e8df;border-radius:14px;background:#fbfcf8}
      #team-management-v3 h3{margin:0 0 8px;font-size:1.02rem}
      #team-management-v3 p{color:#63746a;font-size:.88rem;line-height:1.5}
      #team-management-v3 label{display:grid;gap:5px;margin:9px 0;color:#42574a;font-size:.82rem;font-weight:700}
      #team-management-v3 input,#team-management-v3 select,#team-management-v3 textarea{box-sizing:border-box;width:100%;min-width:0;padding:9px;border:1px solid #cfdacf;border-radius:9px;background:#fff;color:#20372e;font:inherit}
      #team-management-v3 button{border:1px solid #245d43;border-radius:9px;padding:9px 12px;background:#245d43;color:#fff;font:inherit;font-weight:700;cursor:pointer}
      #team-management-v3 button.secondary{background:#fff;color:#245d43}
      #team-management-v3 button:disabled{opacity:.5;cursor:not-allowed}
      #team-management-v3 .tm-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
      #team-management-v3 .tm-row>*{flex:1}
      #team-management-v3 .tm-list{display:grid;gap:8px;padding:0;margin:10px 0;list-style:none}
      #team-management-v3 .tm-item{padding:11px;border:1px solid #e0e8df;border-radius:10px;background:#fff;overflow-wrap:anywhere}
      #team-management-v3 .tm-item strong{display:block;margin-bottom:4px}
      #team-management-v3 .tm-meta{display:block;color:#66776c;font-size:.78rem;margin-top:5px}
      #team-management-v3 .tm-status{margin:10px 0;padding:10px 12px;border-radius:10px;background:#f1f6ee;color:#365440;font-size:.85rem}
      #team-management-v3 .tm-status[data-kind="error"]{background:#fff1ed;color:#8d382a}
      #team-management-v3 .tm-status[data-kind="warning"]{background:#fff8e5;color:#765817}
      #team-management-v3 .tm-status[data-kind="success"]{background:#eaf6e8;color:#245d43}
      #team-management-v3 .tm-pill{display:inline-block;padding:4px 7px;border-radius:999px;background:#edf3e9;color:#365440;font-size:.75rem;font-weight:700}
      #team-management-v3 .tm-ledger{display:grid;gap:6px}
      #team-management-v3 .tm-ledger-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #e8eee6;font-size:.84rem}
      #team-management-v3 .tm-ledger-row span{overflow-wrap:anywhere}
      #team-management-v3 .tm-online{color:#21734c;font-size:.8rem;font-weight:700}
      @media(max-width:640px){#team-management-v3 .tm-grid{grid-template-columns:1fr}#team-management-v3 .tm-row{align-items:stretch}}
    `;
    document.head.append(style);
    const section = document.createElement('section');
    section.id = 'team-management-v3';
    section.innerHTML = `
      <div><p class="eyebrow">MULTIPLAYER · TAHAP LANJUTAN</p><h2>Manajemen tim & usaha</h2><p>Lowongan, jabatan, keuangan game, konflik, dan pengunduran diri. Semua tindakan penting dicatat.</p></div>
      <p id="tm-status" class="tm-status" role="status" aria-live="polite">Memeriksa sesi akun…</p>
      <section class="tm-card" id="tm-vacancy-browser"><h3>🔎 Lowongan terbuka</h3><p>Pemain yang belum menjadi anggota tim dapat melamar ke warung yang membuka lowongan.</p><ul id="tm-vacancy-list" class="tm-list"><li>Memuat lowongan…</li></ul></section>
      <section id="tm-team-area" hidden>
        <div class="tm-card"><h3>👥 Anggota & kehadiran</h3><ul id="tm-members" class="tm-list"></ul><p id="tm-presence-note" class="tm-online">Status online hanya menunjukkan koneksi sesi saat ini.</p></div>
        <div class="tm-grid">
          <section class="tm-card" id="tm-vacancy-create-card" hidden><h3>📣 Buka lowongan</h3>
            <label>Posisi<select id="tm-vacancy-role">${roleOptions('chef')}</select></label>
            <label>Judul<input id="tm-vacancy-title" maxlength="60" placeholder="Contoh: Koki shift siang"></label>
            <label>Deskripsi<textarea id="tm-vacancy-description" maxlength="600" rows="3" placeholder="Jadwal, tanggung jawab, dan kebutuhan posisi"></textarea></label>
            <button id="tm-create-vacancy">Publikasikan lowongan</button>
          </section>
          <section class="tm-card" id="tm-applications-card" hidden><h3>📨 Lamaran masuk</h3><ul id="tm-applications" class="tm-list"><li>Belum ada lamaran.</li></ul></section>
        </div>
        <section class="tm-card" id="tm-role-card" hidden><h3>🪪 Atur jabatan anggota</h3><p>Pemilik mengatur jabatan kerja dan peran akses secara terpisah. Pengelola tidak dapat mempromosikan dirinya menjadi pemilik.</p>
          <label>Anggota<select id="tm-role-member"></select></label>
          <div class="tm-grid"><label>Jabatan kerja<select id="tm-job-role">${roleOptions('server')}</select></label><label>Hak akses<select id="tm-access-role"><option value="member">Anggota</option><option value="manager">Pengelola</option></select></label></div>
          <div class="tm-row"><button id="tm-save-job-role">Simpan jabatan kerja</button><button id="tm-save-access-role" class="secondary">Simpan hak akses</button></div>
          <label>Transfer kepemilikan ke anggota<select id="tm-transfer-member"></select></label><button id="tm-transfer-owner" class="secondary">Transfer kepemilikan</button>
        </section>
        <section class="tm-card" id="tm-finance-card" hidden><h3>💰 Buku kas warung (simulasi game)</h3><p>Catatan ini untuk ekonomi di dalam game, bukan pembayaran uang sungguhan. Catat pendapatan, biaya, gaji, bonus, cadangan, dan pembagian keuntungan.</p>
          <div class="tm-grid"><label>Jenis transaksi<select id="tm-entry-type"><option value="income">Pendapatan</option><option value="expense">Biaya operasional</option><option value="owner_contribution">Tambahan modal pemilik</option><option value="salary">Pembayaran gaji</option><option value="bonus">Bonus kinerja</option><option value="reserve">Dana cadangan</option><option value="profit_distribution">Bagi hasil keuntungan</option></select></label><label>Nominal (Rp)<input id="tm-entry-amount" type="number" min="1" max="1000000000" step="1"></label></div>
          <label>Deskripsi<input id="tm-entry-description" maxlength="240" placeholder="Contoh: gaji periode Oktober"></label>
          <label>Anggota terkait (opsional)<select id="tm-entry-member"><option value="">Tidak ada</option></select></label><button id="tm-record-entry">Catat transaksi</button>
          <div id="tm-finance-summary" class="tm-card"><strong>Ringkasan</strong><p>Memuat buku kas…</p></div>
          <h3>Aturan cadangan & bagi hasil</h3><div class="tm-grid"><label>Persentase keuntungan ditahan (%)<input id="tm-reserve-percent" type="number" min="0" max="80" value="20"></label><label class="tm-row"><input id="tm-profit-share-enabled" type="checkbox"> Bagi hasil diaktifkan sesuai kesepakatan</label></div><button id="tm-save-finance-settings" class="secondary">Simpan aturan keuntungan</button>
          <h3 style="margin-top:14px">Kompensasi anggota</h3><label>Anggota<select id="tm-comp-member"></select></label>
          <div class="tm-grid"><label>Nama jabatan<input id="tm-comp-title" maxlength="60" value="Anggota"></label><label>Gaji dasar per periode (Rp)<input id="tm-comp-salary" type="number" min="0" value="0"></label><label>Batas bonus kinerja (Rp)<input id="tm-comp-bonus" type="number" min="0" value="0"></label><label>Bagi hasil (%)<input id="tm-comp-share" type="number" min="0" max="100" step="0.01" value="0"></label></div>
          <button id="tm-save-compensation">Simpan kompensasi</button>
        </section>
        <section class="tm-grid">
          <section class="tm-card"><h3>🤝 Ajukan penyelesaian konflik</h3><label>Anggota terkait<select id="tm-dispute-target"></select></label><div class="tm-grid"><label>Jenis<select id="tm-dispute-category"><option value="pay">Gaji/bonus</option><option value="workload">Beban kerja</option><option value="conduct">Perilaku</option><option value="authority">Kewenangan</option><option value="finance">Keuangan</option><option value="other">Lainnya</option></select></label><label>Tingkat<select id="tm-dispute-severity"><option value="light">Ringan</option><option value="medium">Sedang</option><option value="serious">Berat</option></select></label></div><label>Penjelasan faktual<textarea id="tm-dispute-details" maxlength="1200" rows="3" placeholder="Jelaskan kejadian, dampak, dan waktu jika diketahui"></textarea></label><button id="tm-open-dispute">Ajukan konflik</button></section>
          <section class="tm-card"><h3>🚪 Pengunduran diri</h3><p>Ajukan permintaan keluar dengan alasan. Pemilik/pengelola meninjau tugas yang masih berjalan dan hak yang harus diselesaikan.</p><label>Alasan<textarea id="tm-exit-reason" maxlength="500" rows="3" placeholder="Alasan pengunduran diri (5–500 karakter)"></textarea></label><button id="tm-request-exit" class="secondary">Ajukan keluar dari tim</button></section>
        </section>
        <section class="tm-card"><h3>🧭 Perselisihan & tanggapan</h3><ul id="tm-disputes" class="tm-list"><li>Memuat perselisihan…</li></ul></section>
        <section class="tm-card" id="tm-exit-review-card" hidden><h3>📋 Permintaan keluar anggota</h3><ul id="tm-exit-requests" class="tm-list"><li>Belum ada permintaan.</li></ul></section>
        <section class="tm-card" id="tm-audit-card" hidden><h3>🧾 Jejak audit</h3><ul id="tm-audit-list" class="tm-list"><li>Belum ada catatan.</li></ul></section>
      </section>`;
    host.append(section);
    $('tm-create-vacancy').addEventListener('click', () => run(createVacancy));
    $('tm-save-job-role').addEventListener('click', () => run(() => setJobRole()));
    $('tm-save-access-role').addEventListener('click', () => run(() => setAccessRole()));
    $('tm-transfer-owner').addEventListener('click', () => run(transferOwner));
    $('tm-record-entry').addEventListener('click', () => run(recordEntry));
    $('tm-save-finance-settings').addEventListener('click', () => run(saveFinanceSettings));
    $('tm-save-compensation').addEventListener('click', () => run(saveCompensation));
    $('tm-open-dispute').addEventListener('click', () => run(openDispute));
    $('tm-request-exit').addEventListener('click', () => run(requestExit));
    section.addEventListener('click', event => {
      const button = event.target.closest('button[data-tm-action]');
      if (!button) return;
      const {tmAction, id} = button.dataset;
      run(async () => {
        if (tmAction === 'close-vacancy') {
          if (!confirm('Tutup lowongan ini?')) return;
          await rpc('wk_close_vacancy', {p_vacancy_id:id}); note('Lowongan ditutup.','success');
        } else if (tmAction === 'apply') {
          const display = prompt('Nama pemain yang ingin ditampilkan (1–40 karakter):','');
          if (!display) return;
          const message = prompt('Pesan lamaran (opsional, maksimal 600 karakter):','') || '';
          await rpc('wk_apply_to_vacancy',{p_vacancy_id:id,p_display_name:display.trim(),p_message:message});
          note('Lamaran dikirim. Pemilik/pengelola akan meninjaunya.','success');
        } else if (tmAction === 'review-application') {
          const decision = button.dataset.decision;
          await rpc('wk_review_application',{p_application_id:id,p_decision:decision});
          note(decision === 'accepted' ? 'Lamaran diterima dan anggota ditambahkan.' : 'Lamaran ditolak.','success');
        } else if (tmAction === 'respond-dispute') {
          const response = prompt('Tulis tanggapan faktual (5–1.200 karakter):','');
          if (!response) return;
          await rpc('wk_respond_team_dispute',{p_dispute_id:id,p_response:response.trim()});
          note('Tanggapan tersimpan.','success');
        } else if (tmAction === 'review-dispute') {
          const status = button.dataset.status;
          const resolution = ['resolved','dismissed'].includes(status) ? prompt('Catatan penyelesaian (minimal 5 karakter):','') : null;
          if (['resolved','dismissed'].includes(status) && !resolution) return;
          await rpc('wk_review_team_dispute',{p_dispute_id:id,p_status:status,p_resolution:resolution});
          note('Status penanganan konflik diperbarui.','success');
        } else if (tmAction === 'review-exit') {
          const decision = button.dataset.decision;
          if (!confirm(decision === 'approved' ? 'Setujui permintaan keluar anggota?' : 'Tolak permintaan keluar anggota?')) return;
          await rpc('wk_review_team_exit',{p_request_id:id,p_decision:decision});
          note('Permintaan keluar diproses.','success');
        }
        await loadData();
      });
    });
  }

  async function rpc(name, args) {
    if (!client) throw new Error('Backend belum siap.');
    const {data,error} = await client.rpc(name,args);
    if (error) throw error;
    return data;
  }
  async function run(fn) {
    if (busy) return;
    busy = true;
    try { note('Memproses…'); await fn(); await loadData(); }
    catch (error) { note(error?.message || 'Permintaan gagal. Periksa konfigurasi backend/migrasi.','error'); }
    finally { busy = false; }
  }
  function item(text, sub = '') {
    const li = document.createElement('li'); li.className = 'tm-item';
    const strong = document.createElement('strong'); strong.textContent = text; li.append(strong);
    if (sub) { const small = document.createElement('span'); small.className='tm-meta'; small.textContent=sub; li.append(small); }
    return li;
  }
  function button(label, action, id, decision = '', status = '') {
    const el = document.createElement('button'); el.type='button'; el.textContent=label;
    el.dataset.tmAction=action; el.dataset.id=id;
    if (decision) el.dataset.decision=decision;
    if (status) el.dataset.status=status;
    return el;
  }
  function renderVacancies(rows) {
    const list=$('tm-vacancy-list'); list.replaceChildren();
    if (!rows.length) { list.append(item('Belum ada lowongan terbuka.','Pemilik/pengelola dapat membuka lowongan untuk mencari anggota baru.')); return; }
    rows.forEach(v => {
      const li=item(v.title, (roles[v.role_key]||v.role_key)+' · '+v.description+' · '+new Date(v.created_at).toLocaleDateString('id-ID'));
      const row=document.createElement('div'); row.className='tm-row';
      if (!membership && user) row.append(button('Lamar posisi','apply',v.id));
      if (canManage() && v.team_id===team?.id) row.append(button('Tutup lowongan','close-vacancy',v.id));
      if (row.childElementCount) li.append(row);
      list.append(li);
    });
  }
  function renderMembers() {
    const list=$('tm-members'); list.replaceChildren();
    members.forEach(m => {
      const li=item(m.display_name, (roles[m.job_role]||roles.server)+' · '+(authRoles[m.role]||m.role));
      const status=document.createElement('span'); status.className=onlineIds.has(m.user_id)?'tm-online':'tm-meta'; status.textContent=onlineIds.has(m.user_id)?'● Online':'○ Offline'; li.append(status); list.append(li);
    });
    ['tm-role-member','tm-transfer-member','tm-entry-member','tm-comp-member','tm-dispute-target'].forEach(id=>{
      const select=$(id); if(!select)return;
      const old=select.value; select.replaceChildren();
      members.filter(m=>m.user_id!==user?.id || id==='tm-entry-member').forEach(m=>{
        const opt=document.createElement('option'); opt.value=m.user_id; opt.textContent=m.display_name+' — '+(roles[m.job_role]||roles.server); select.append(opt);
      });
      if([...select.options].some(o=>o.value===old))select.value=old;
    });
  }
  function renderApplications(rows) {
    const list=$('tm-applications'); list.replaceChildren();
    if(!rows.length){list.append(item('Belum ada lamaran masuk.'));return;}
    rows.forEach(app=>{
      const vacancy=app.vacancy;
      const li=item(app.display_name+' · '+(vacancy?.title||'Lowongan'),app.message||'Tidak ada pesan tambahan.');
      li.append(button('Terima','review-application',app.id,'accepted'),button('Tolak','review-application',app.id,'rejected'));
      list.append(li);
    });
  }
  function renderDisputes(rows) {
    const list=$('tm-disputes'); list.replaceChildren();
    if(!rows.length){list.append(item('Belum ada perselisihan.'));return;}
    rows.forEach(d=>{
      const name=id=>members.find(m=>m.user_id===id)?.display_name||'Anggota yang sudah tidak aktif';
      const li=item(name(d.opened_by)+' ↔ '+name(d.target_user_id),d.details);
      const meta=document.createElement('span'); meta.className='tm-pill'; meta.textContent=( {light:'Ringan',medium:'Sedang',serious:'Berat'}[d.severity]||d.severity )+' · '+d.status; li.append(meta);
      if(d.opened_by===user?.id||d.target_user_id===user?.id)li.append(button('Beri tanggapan','respond-dispute',d.id));
      if(canManage()){
        const actions=document.createElement('div');actions.className='tm-row';
        ['mediation','formal_review','resolved','dismissed'].forEach(s=>actions.append(button(({mediation:'Mediasi',formal_review:'Evaluasi formal',resolved:'Selesaikan',dismissed:'Tutup tanpa sanksi'})[s],'review-dispute',d.id,'',s)));
        li.append(actions);
      }
      if(d.opener_response){const p=document.createElement('p');p.textContent='Tanggapan pelapor: '+d.opener_response;li.append(p);}
      if(d.target_response){const p=document.createElement('p');p.textContent='Tanggapan anggota: '+d.target_response;li.append(p);}
      if(d.resolution){const p=document.createElement('p');p.textContent='Hasil: '+d.resolution;li.append(p);}
      list.append(li);
    });
  }
  function renderExitRequests(rows) {
    const list=$('tm-exit-requests');list.replaceChildren();
    if(!rows.length){list.append(item('Belum ada permintaan keluar.'));return;}
    rows.forEach(r=>{
      const name=members.find(m=>m.user_id===r.user_id)?.display_name||'Anggota';
      const li=item(name,r.reason);
      if(r.status==='pending'){li.append(button('Setujui','review-exit',r.id,'approved'),button('Tolak','review-exit',r.id,'rejected'));}
      else li.append(document.createTextNode('Status: '+r.status));
      list.append(li);
    });
  }
  function renderAudit(rows) {
    const list=$('tm-audit-list');list.replaceChildren();
    if(!rows.length){list.append(item('Belum ada catatan audit.'));return;}
    rows.forEach(r=>list.append(item(r.action,new Date(r.created_at).toLocaleString('id-ID')+' · '+JSON.stringify(r.details))));
  }
  function renderFinance(entries, settings) {
    const summary=$('tm-finance-summary');summary.replaceChildren();
    const totals={income:0,outflow:0};
    const positive=new Set(['income','owner_contribution']);
    entries.forEach(e=>{if(positive.has(e.entry_type))totals.income+=Number(e.amount);else totals.outflow+=Number(e.amount);});
    const title=document.createElement('strong');title.textContent='Ringkasan catatan';summary.append(title);
    const p=document.createElement('p');p.textContent='Pemasukan/modal tercatat: '+money(totals.income)+' · Pengeluaran, gaji, cadangan, dan distribusi: '+money(totals.outflow)+' · Selisih buku kas: '+money(totals.income-totals.outflow);summary.append(p);
    const list=document.createElement('div');list.className='tm-ledger';
    entries.slice(0,15).forEach(e=>{const row=document.createElement('div');row.className='tm-ledger-row';const label=document.createElement('span');label.textContent=e.entry_type+' · '+e.description;const amount=document.createElement('strong');amount.textContent=(positive.has(e.entry_type)?'+':'−')+money(e.amount);row.append(label,amount);list.append(row);});
    summary.append(list);
    $('tm-reserve-percent').value=settings?.reserve_percent??20;
    $('tm-profit-share-enabled').checked=Boolean(settings?.profit_share_enabled);
  }
  async function createVacancy() {
    await rpc('wk_create_vacancy',{p_role_key:$('tm-vacancy-role').value,p_title:$('tm-vacancy-title').value.trim(),p_description:$('tm-vacancy-description').value.trim()});
    $('tm-vacancy-title').value='';$('tm-vacancy-description').value='';note('Lowongan dipublikasikan.','success');
  }
  async function setJobRole() {
    await rpc('wk_set_job_role',{p_target_user:$('tm-role-member').value,p_job_role:$('tm-job-role').value});note('Jabatan kerja diperbarui.','success');
  }
  async function setAccessRole() {
    await rpc('wk_set_member_role',{p_target_user:$('tm-role-member').value,p_role:$('tm-access-role').value});note('Hak akses anggota diperbarui.','success');
  }
  async function transferOwner() {
    if(!confirm('Transfer kepemilikan kepada anggota terpilih? Kamu akan menjadi pengelola.'))return;
    await rpc('wk_transfer_team_ownership',{p_target_user:$('tm-transfer-member').value});note('Kepemilikan tim ditransfer.','success');
  }
  async function recordEntry() {
    const amount=Number($('tm-entry-amount').value);
    if(!Number.isFinite(amount)||amount<=0)throw new Error('Nominal harus lebih besar dari nol.');
    await rpc('wk_record_financial_entry',{p_entry_type:$('tm-entry-type').value,p_amount:amount,p_description:$('tm-entry-description').value.trim(),p_related_user:$('tm-entry-member').value||null});
    $('tm-entry-amount').value='';$('tm-entry-description').value='';note('Transaksi game dicatat dalam buku kas.','success');
  }
  async function saveFinanceSettings() {
    const reserve=Number($('tm-reserve-percent').value);
    if(!Number.isFinite(reserve)||reserve<0||reserve>80)throw new Error('Cadangan harus antara 0% dan 80%.');
    await rpc('wk_set_financial_settings',{p_reserve_percent:reserve,p_profit_share_enabled:$('tm-profit-share-enabled').checked});
    note('Aturan cadangan dan bagi hasil tersimpan.','success');
  }
  async function saveCompensation() {
    await rpc('wk_set_compensation',{p_target_user:$('tm-comp-member').value,p_role_title:$('tm-comp-title').value.trim(),p_base_salary:Number($('tm-comp-salary').value),p_bonus_cap:Number($('tm-comp-bonus').value),p_profit_share_percent:Number($('tm-comp-share').value)});
    note('Kompensasi disimpan sebagai aturan game; pembayaran tetap harus dicatat di buku kas.','success');
  }
  async function openDispute() {
    const details=$('tm-dispute-details').value.trim();
    if(details.length<10)throw new Error('Penjelasan minimal 10 karakter.');
    await rpc('wk_open_team_dispute',{p_target_user:$('tm-dispute-target').value,p_category:$('tm-dispute-category').value,p_severity:$('tm-dispute-severity').value,p_details:details});
    $('tm-dispute-details').value='';note('Perselisihan tercatat. Pihak terkait dapat memberikan tanggapan.','success');
  }
  async function requestExit() {
    const reason=$('tm-exit-reason').value.trim();
    if(reason.length<5)throw new Error('Alasan keluar minimal 5 karakter.');
    if(!confirm('Ajukan permintaan keluar? Pengelola akan meninjau tugas yang tersisa.'))return;
    await rpc('wk_request_team_exit',{p_reason:reason});$('tm-exit-reason').value='';note('Permintaan keluar dikirim.','success');
  }
  function stopPresence() { if(presenceChannel&&client)client.removeChannel(presenceChannel);presenceChannel=null;onlineIds=new Set(); }
  function startPresence() {
    if(!client||!team||!user)return;
    stopPresence();
    presenceChannel=client.channel('wk-team-presence-'+team.id,{config:{presence:{key:user.id}}});
    presenceChannel.on('presence',{event:'sync'},()=>{
      const state=presenceChannel.presenceState();onlineIds=new Set(Object.keys(state));
      renderMembers();
    }).subscribe(async status=>{
      if(status==='SUBSCRIBED')await presenceChannel.track({user_id:user.id,online_at:new Date().toISOString()});
    });
  }
  async function loadData() {
    if(!client||!user)return;
    const {data:membershipRow,error:memberError}=await client.from('wk_team_members').select('team_id,role,job_role').eq('user_id',user.id).maybeSingle();
    if(memberError)throw memberError;
    membership=membershipRow;
    team=null;members=[];
    show('tm-team-area',Boolean(membership));
    show('tm-vacancy-create-card',canManage());
    show('tm-applications-card',canManage());
    show('tm-role-card',isOwner());
    show('tm-finance-card',canManage());
    show('tm-exit-review-card',canManage());
    show('tm-audit-card',canManage());
    if(membership){
      const {data:teamRow,error:teamError}=await client.from('wk_teams').select('id,name,owner_id,status').eq('id',membership.team_id).single();
      if(teamError)throw teamError;team=teamRow;
      const {data:memberRows,error:membersError}=await client.from('wk_team_members').select('user_id,display_name,role,job_role,joined_at').eq('team_id',team.id).order('joined_at',{ascending:true});
      if(membersError)throw membersError;members=memberRows||[];
      renderMembers();
      const [vacancyRes,appRes,settingsRes,entriesRes,disputesRes,exitsRes,auditRes]=await Promise.all([
        client.from('wk_team_vacancies').select('id,team_id,role_key,title,description,status,created_at').eq('team_id',team.id).order('created_at',{ascending:false}),
        canManage()?client.from('wk_team_applications').select('id,team_id,display_name,message,status,created_at,vacancy:wk_team_vacancies(title)').eq('team_id',team.id).eq('status','pending').order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
        client.from('wk_team_financial_settings').select('reserve_percent,profit_share_enabled').eq('team_id',team.id).maybeSingle(),
        canManage()?client.from('wk_team_financial_entries').select('entry_type,amount,description,created_at').eq('team_id',team.id).order('created_at',{ascending:false}).limit(30):Promise.resolve({data:[],error:null}),
        client.from('wk_team_disputes').select('*').eq('team_id',team.id).order('created_at',{ascending:false}).limit(30),
        canManage()?client.from('wk_team_exit_requests').select('id,user_id,reason,status,created_at').eq('team_id',team.id).order('created_at',{ascending:false}).limit(30):Promise.resolve({data:[],error:null}),
        canManage()?client.from('wk_team_audit_logs').select('action,details,created_at').eq('team_id',team.id).order('created_at',{ascending:false}).limit(30):Promise.resolve({data:[],error:null})
      ]);
      for(const result of [vacancyRes,appRes,settingsRes,entriesRes,disputesRes,exitsRes,auditRes])if(result.error)throw result.error;
      renderVacancies((vacancyRes.data||[]).filter(v=>v.status==='open'||canManage()));
      renderApplications(appRes.data||[]);
      renderDisputes((disputesRes.data||[]).filter(d=>canManage()||d.opened_by===user.id||d.target_user_id===user.id));
      renderExitRequests(exitsRes.data||[]);renderAudit(auditRes.data||[]);renderFinance(entriesRes.data||[],settingsRes.data);
      if(isOwner()){
        const {data:comp,error:compError}=await client.from('wk_team_compensation').select('user_id,role_title,base_salary,bonus_cap,profit_share_percent').eq('team_id',team.id).maybeSingle();
        if(compError)throw compError;
        if(comp){$('tm-comp-member').value=comp.user_id;$('tm-comp-title').value=comp.role_title;$('tm-comp-salary').value=comp.base_salary;$('tm-comp-bonus').value=comp.bonus_cap;$('tm-comp-share').value=comp.profit_share_percent;}
      }
      if(!presenceChannel)startPresence();
      setText('tm-status','Tim: '+team.name+' · akses '+(authRoles[membership.role]||membership.role)+'.');
    } else {
      stopPresence();
      const {data:vacancies,error}=await client.from('wk_team_vacancies').select('id,team_id,role_key,title,description,status,created_at').eq('status','open').order('created_at',{ascending:false}).limit(50);
      if(error)throw error;
      renderVacancies(vacancies||[]);
      setText('tm-status','Kamu belum menjadi anggota tim. Kamu bisa melamar ke lowongan terbuka atau membuat tim lewat panel Teman.');
    }
  }
  async function init() {
    mount();
    if(!config.supabaseUrl||!config.publishableKey||!window.supabase?.createClient){note('Supabase belum dikonfigurasi; fitur manajemen lanjutan menunggu backend.','warning');return;}
    client=window.supabase.createClient(config.supabaseUrl,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await client.auth.getSession();
    if(error)throw error;user=data.session?.user||null;
    if(user)await loadData();else note('Masuk lewat panel Teman untuk menggunakan manajemen lanjutan.');
    client.auth.onAuthStateChange((_event,session)=>{
      user=session?.user||null;
      window.setTimeout(()=>{loadData().catch(e=>note(e?.message||'Gagal memuat data tim. Pastikan migrasi tahap 3 telah diterapkan.','error'));},0);
    });
  }
  function boot(){init().catch(error=>note(error?.message||'Fitur lanjutan belum siap. Pastikan migrasi tahap 3 diterapkan.','error'));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();