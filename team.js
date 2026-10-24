(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = window.WARUNG_TEAM_CONFIG || {};
  const status = (message, kind='info') => {
    const el=$('team-status'); if(el){el.textContent=message;el.dataset.kind=kind;}
  };
  let client=null,currentUser=null,currentTeam=null,channel=null,gameChannel=null,roster=[];
  let gameRevision=null,gameSnapshotStale=false;
  const setHidden=(id,hidden)=>{const el=$(id);if(el)el.hidden=hidden;};
  const showSignedOut=()=>{setHidden('team-auth',false);setHidden('team-workspace',true);setHidden('team-setup',true);};
  const showSignedIn=()=>{setHidden('team-auth',true);setHidden('team-workspace',true);setHidden('team-setup',false);};
  const safeError=(error,fallback='Permintaan gagal.')=>error?.message||fallback;

  function renderRoster(){
    const list=$('team-roster');if(!list)return;
    list.replaceChildren();
    if(!roster.length){list.textContent='Belum ada anggota yang ditampilkan.';return;}
    roster.forEach(member=>{
      const item=document.createElement('li'),name=document.createElement('strong'),role=document.createElement('span');
      name.textContent=member.display_name;
      role.textContent=({owner:'Pemilik',manager:'Pengelola',member:'Anggota'})[member.role]||'Anggota';
      item.append(name,role);item.dataset.userId=member.user_id;list.append(item);
    });
    const select=$('team-report-target');
    if(select){
      const old=select.value;select.replaceChildren();
      roster.filter(m=>m.user_id!==currentUser?.id).forEach(member=>{
        const option=document.createElement('option');option.value=member.user_id;option.textContent=member.display_name;select.append(option);
      });
      if([...select.options].some(option=>option.value===old))select.value=old;
      select.disabled=select.options.length===0;
    }
  }
  function renderActivity(rows){
    const list=$('team-activity-list');if(!list)return;
    list.replaceChildren();
    if(!rows?.length){const empty=document.createElement('li');empty.textContent='Belum ada aktivitas tim.';list.append(empty);return;}
    rows.forEach(row=>{
      const item=document.createElement('li'),heading=document.createElement('strong'),message=document.createElement('p'),time=document.createElement('small');
      heading.textContent=({team_created:'Tim dibuat',member_joined:'Pemain bergabung',task_update:'Pembaruan tugas',shared_action:'Aksi bersama',reputation_review:'Peninjauan reputasi',member_left:'Anggota keluar'})[row.event_type]||'Aktivitas tim';
      message.textContent=row.message;time.textContent=new Date(row.created_at).toLocaleString('id-ID');
      item.append(heading,message,time);list.append(item);
    });
  }
  async function refreshActivity(){
    if(!client||!currentTeam)return;
    const {data,error}=await client.from('wk_team_activity').select('id,actor_id,event_type,message,created_at').eq('team_id',currentTeam.id).order('created_at',{ascending:false}).limit(30);
    if(!error)renderActivity(data||[]);
  }
  function stopSubscriptions(){
    if(channel&&client)client.removeChannel(channel);
    if(gameChannel&&client)client.removeChannel(gameChannel);
    channel=null;gameChannel=null;
  }
  function injectGameSync(){
    const workspace=$('team-workspace');if(!workspace||$('team-game-sync'))return;
    const section=document.createElement('section');
    section.id='team-game-sync';section.className='team-subcard';section.setAttribute('aria-labelledby','team-game-sync-title');
    const title=document.createElement('h4');title.id='team-game-sync-title';title.textContent='🎮 Progres permainan bersama';
    const note=document.createElement('p');note.textContent='Simpan atau muat snapshot progres warung untuk semua anggota. Sinkronisasi ini manual; perubahan tidak digabung otomatis. Muat progres tim sebelum menyimpan jika teman sudah memperbaruinya.';
    const actions=document.createElement('div');actions.className='team-actions';
    const save=document.createElement('button');save.type='button';save.id='team-game-save';save.textContent='Simpan progres ke tim';
    const load=document.createElement('button');load.type='button';load.id='team-game-load';load.className='team-secondary-btn';load.textContent='Muat progres tim';
    const message=document.createElement('p');message.id='team-game-sync-status';message.className='team-footer-note';message.setAttribute('role','status');message.textContent='Belum memuat progres bersama.';
    actions.append(save,load);section.append(title,note,actions,message);workspace.prepend(section);
    save.addEventListener('click',()=>saveGameSnapshot().catch(e=>gameSyncStatus(safeError(e))));
    load.addEventListener('click',()=>loadGameSnapshot().catch(e=>gameSyncStatus(safeError(e))));
  }
  function gameSyncStatus(message){const el=$('team-game-sync-status');if(el)el.textContent=message;}
  async function loadGameSnapshot(){
    if(!client||!currentTeam)throw new Error('Gabung ke tim terlebih dahulu.');
    gameSyncStatus('Memuat progres tim…');
    const {data,error}=await client.from('wk_team_game_state').select('state,revision,updated_at,updated_by').eq('team_id',currentTeam.id).maybeSingle();
    if(error)throw new Error('Tidak dapat memuat progres. Pastikan migrasi multiplayer tahap 2 sudah diterapkan.');
    if(!data){gameRevision=null;gameSnapshotStale=false;gameSyncStatus('Belum ada snapshot tim. Kamu bisa menyimpan progres lokal sebagai snapshot pertama.');return;}
    if(!data.state||typeof data.state!=='object'||Array.isArray(data.state))throw new Error('Snapshot progres tim tidak valid.');
    localStorage.setItem('warung-kita-save',JSON.stringify(data.state));
    gameRevision=data.revision;gameSnapshotStale=false;
    gameSyncStatus('Snapshot revisi '+data.revision+' dimuat ('+new Date(data.updated_at).toLocaleString('id-ID')+'). Memuat ulang game…');
    window.location.reload();
  }
  async function saveGameSnapshot(){
    if(!client||!currentTeam)throw new Error('Gabung ke tim terlebih dahulu.');
    const raw=localStorage.getItem('warung-kita-save');
    if(!raw)throw new Error('Belum ada progres lokal untuk disimpan.');
    let snapshot;try{snapshot=JSON.parse(raw);}catch{throw new Error('Progres lokal rusak dan tidak bisa dibaca.');}
    if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new Error('Format progres lokal tidak valid.');
    delete snapshot.devCashGrant20261024;
    if(gameSnapshotStale)throw new Error('Progres tim berubah. Klik “Muat progres tim” terlebih dahulu agar perubahan teman tidak tertimpa.');
    if(gameRevision===null){
      const {data,error}=await client.from('wk_team_game_state').select('revision').eq('team_id',currentTeam.id).maybeSingle();
      if(error)throw new Error('Tidak dapat memeriksa revisi progres tim. Pastikan migrasi multiplayer tahap 2 sudah diterapkan.');
      if(data)throw new Error('Snapshot tim sudah ada. Muat progres tim sebelum menyimpan agar tidak menimpa perubahan teman.');
    }
    gameSyncStatus('Menyimpan progres…');
    const {data,error}=await client.rpc('wk_save_game_state',{p_state:snapshot,p_expected_revision:gameRevision});
    if(error)throw new Error(error.message||'Gagal menyimpan progres.');
    const result=Array.isArray(data)?data[0]:data;
    gameRevision=result?.revision??null;gameSnapshotStale=false;
    gameSyncStatus('Progres tersimpan untuk anggota tim (revisi '+gameRevision+') pada '+new Date(result.updated_at).toLocaleString('id-ID')+'.');
    status('Progres permainan berhasil disimpan ke tim.','success');
  }
  function subscribeTeam(){
    if(!client||!currentTeam)return;
    if(channel)client.removeChannel(channel);
    if(gameChannel)client.removeChannel(gameChannel);
    const teamId=currentTeam.id;
    channel=client.channel('wk-team-'+teamId)
      .on('postgres_changes',{event:'*',schema:'public',table:'wk_team_members',filter:'team_id=eq.'+teamId},()=>refreshTeam())
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'wk_team_activity',filter:'team_id=eq.'+teamId},()=>refreshActivity())
      .subscribe();
    gameChannel=client.channel('wk-game-'+teamId)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'wk_team_game_state',filter:'team_id=eq.'+teamId},payload=>{
        if(payload.new?.updated_by!==currentUser?.id){
          gameSnapshotStale=true;
          gameSyncStatus('Teman memperbarui progres tim. Klik “Muat progres tim” untuk memuat revisi terbaru sebelum menyimpan.');
        }
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'wk_team_game_state',filter:'team_id=eq.'+teamId},payload=>{
        if(payload.new?.updated_by!==currentUser?.id){gameSnapshotStale=true;gameSyncStatus('Progres bersama baru tersedia. Klik “Muat progres tim” untuk menggunakannya.');}
      }).subscribe();
  }
  async function refreshTeam(){
    if(!client||!currentUser)return;
    const {data:membership,error:memberError}=await client.from('wk_team_members').select('team_id,role').eq('user_id',currentUser.id).maybeSingle();
    if(memberError){status('Tidak dapat memuat keanggotaan: '+safeError(memberError,'periksa migrasi backend.'),'error');return;}
    if(!membership){
      stopSubscriptions();currentTeam=null;roster=[];gameRevision=null;gameSnapshotStale=false;showSignedIn();
      $('team-setup-title').textContent='Buat tim atau gabung dengan kode';$('team-invite-code').textContent='Belum ada kode undangan';
      renderRoster();renderActivity([]);return;
    }
    const {data:team,error:teamError}=await client.from('wk_teams').select('id,name,invite_code,status,owner_id').eq('id',membership.team_id).single();
    if(teamError){status('Tim belum dapat dimuat: '+safeError(teamError,'periksa kebijakan RLS dan migrasi.'),'error');return;}
    const changedTeam=currentTeam?.id!==team.id;
    if(changedTeam){stopSubscriptions();gameRevision=null;gameSnapshotStale=false;}
    currentTeam=team;showSignedIn();setHidden('team-setup',true);setHidden('team-workspace',false);injectGameSync();
    $('team-name-title').textContent=team.name;$('team-role-label').textContent=({owner:'Pemilik tim',manager:'Pengelola',member:'Anggota'})[membership.role]||'Anggota';
    $('team-invite-code').textContent=team.invite_code;$('team-invite-code').title='Bagikan kode ini hanya kepada pemain yang kamu percaya.';
    setHidden('team-leave-btn',membership.role==='owner');
    const [membersResult,activityResult]=await Promise.all([
      client.from('wk_team_members').select('user_id,display_name,role,joined_at').eq('team_id',team.id).order('joined_at',{ascending:true}),
      client.from('wk_team_activity').select('id,actor_id,event_type,message,created_at').eq('team_id',team.id).order('created_at',{ascending:false}).limit(30)
    ]);
    if(membersResult.error||activityResult.error){status('Tim terbuka, tetapi sebagian data belum dapat dimuat. Periksa migrasi/RLS.','error');return;}
    roster=membersResult.data||[];renderRoster();renderActivity(activityResult.data||[]);
    status('Terhubung ke tim. Riwayat aktivitas dibatasi oleh izin akun.','success');
    if(changedTeam||!channel)subscribeTeam();
  }
  async function refreshSession(){
    if(!client)return;
    const {data,error}=await client.auth.getSession();
    if(error){status(error.message,'error');return;}
    currentUser=data.session?.user||null;
    if(!currentUser){stopSubscriptions();showSignedOut();status('Masuk untuk membuat tim atau bergabung dengan teman.');return;}
    await refreshTeam();
  }
  async function signInOrSignUp(mode){
    const email=$('team-email').value.trim(),password=$('team-password').value;
    if(!email||!password){status('Isi email dan kata sandi terlebih dahulu.','error');return;}
    if(password.length<8){status('Kata sandi minimal 8 karakter.','error');return;}
    status(mode==='signup'?'Membuat akun…':'Memeriksa akun…');
    const result=mode==='signup'?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});
    if(result.error){status(result.error.message,'error');return;}
    if(mode==='signup'&&!result.data.session){status('Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.','success');return;}
    currentUser=result.data.user||result.data.session?.user||null;await refreshSession();
  }
  async function createTeam(){
    const name=$('team-create-name').value.trim(),display=$('team-display-name').value.trim();
    if(!name||!display){status('Isi nama tim dan nama pemain.','error');return;}
    status('Membuat tim…');
    const {error}=await client.rpc('wk_create_team',{p_name:name,p_display_name:display});
    if(error){status(error.message,'error');return;}
    $('team-create-name').value='';await refreshTeam();status('Tim berhasil dibuat. Bagikan kode undangan kepada teman yang kamu percaya.','success');
  }
  async function joinTeam(){
    const code=$('team-join-code').value.trim().toUpperCase(),display=$('team-display-name').value.trim();
    if(!/^[A-F0-9]{8}$/.test(code)){status('Kode undangan harus 8 karakter A–F atau 0–9.','error');return;}
    if(!display){status('Isi nama pemain terlebih dahulu.','error');return;}
    status('Memeriksa undangan…');
    const {error}=await client.rpc('wk_join_team',{p_invite_code:code,p_display_name:display});
    if(error){status(error.message,'error');return;}
    $('team-join-code').value='';await refreshTeam();status('Berhasil bergabung ke tim.','success');
  }
  async function logActivity(){
    const message=$('team-activity-message').value.trim(),type=$('team-activity-type').value;
    if(!message){status('Tulis ringkasan aktivitas terlebih dahulu.','error');return;}
    const {error}=await client.rpc('wk_log_team_activity',{p_event_type:type,p_message:message});
    if(error){status(error.message,'error');return;}
    $('team-activity-message').value='';await refreshActivity();status('Aktivitas tercatat pada riwayat tim.','success');
  }
  async function submitReport(){
    const target=$('team-report-target').value,category=$('team-report-category').value,details=$('team-report-details').value.trim();
    if(!target){status('Pilih anggota tim yang dilaporkan.','error');return;}
    if(details.length<10){status('Jelaskan kejadian secara faktual, minimal 10 karakter.','error');return;}
    if(!window.confirm('Kirim laporan privat kepada pihak yang berwenang meninjau? Gunakan laporan hanya untuk kejadian nyata.'))return;
    const {error}=await client.rpc('wk_submit_reputation_report',{p_target_user:target,p_category:category,p_details:details});
    if(error){status(error.message,'error');return;}
    $('team-report-details').value='';await refreshActivity();status('Laporan privat terkirim. Laporan tidak otomatis mengubah reputasi publik.','success');
  }
  async function leaveTeam(){
    if(!window.confirm('Keluar dari tim ini? Riwayat aktivitas yang sudah tercatat akan tetap ada.'))return;
    const {error}=await client.rpc('wk_leave_team');if(error){status(error.message,'error');return;}
    stopSubscriptions();currentTeam=null;await refreshTeam();status('Kamu sudah keluar dari tim.','success');
  }
  function init(){
    if(!$('team-panel'))return;
    if(!config.supabaseUrl||!config.publishableKey||!window.supabase?.createClient){
      showSignedOut();status('Multiplayer belum aktif: Supabase belum dikonfigurasi. Isi URL proyek dan publishable key di team-config.js, lalu jalankan kedua migrasi SQL.','warning');
      $('team-signin-btn').disabled=true;$('team-signup-btn').disabled=true;return;
    }
    client=window.supabase.createClient(config.supabaseUrl,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    $('team-signin-btn').addEventListener('click',()=>signInOrSignUp('signin').catch(e=>status(safeError(e),'error')));
    $('team-signup-btn').addEventListener('click',()=>signInOrSignUp('signup').catch(e=>status(safeError(e),'error')));
    $('team-signout-btn').addEventListener('click',async()=>{stopSubscriptions();await client.auth.signOut();currentUser=null;currentTeam=null;showSignedOut();status('Kamu sudah keluar.','success');});
    $('team-create-btn').addEventListener('click',()=>createTeam().catch(e=>status(safeError(e),'error')));
    $('team-join-btn').addEventListener('click',()=>joinTeam().catch(e=>status(safeError(e),'error')));
    $('team-activity-submit').addEventListener('click',()=>logActivity().catch(e=>status(safeError(e),'error')));
    $('team-report-submit').addEventListener('click',()=>submitReport().catch(e=>status(safeError(e),'error')));
    $('team-leave-btn').addEventListener('click',()=>leaveTeam().catch(e=>status(safeError(e),'error')));
    $('team-copy-code-btn').addEventListener('click',async()=>{
      if(!currentTeam)return;
      try{await navigator.clipboard.writeText(currentTeam.invite_code);status('Kode undangan disalin. Bagikan hanya kepada teman yang kamu percaya.','success');}
      catch{status('Kode undangan: '+currentTeam.invite_code,'info');}
    });
    client.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;window.setTimeout(()=>refreshSession().catch(e=>status(safeError(e),'error')),0);});
    refreshSession().catch(e=>status(safeError(e),'error'));
  }
  document.addEventListener('DOMContentLoaded',init,{once:true});
})();