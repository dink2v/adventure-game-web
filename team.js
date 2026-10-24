(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = window.WARUNG_TEAM_CONFIG || {};
  const status = (message, kind='info') => {
    const el=$('team-status'); if(!el)return;
    el.textContent=message; el.dataset.kind=kind;
  };
  const safeText = value => String(value ?? '');
  const escapeText = value => safeText(value).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  let client=null, currentUser=null, currentTeam=null, channel=null, roster=[];
  const setHidden=(id,hidden)=>{const el=$(id);if(el)el.hidden=hidden;};
  const showSignedOut=()=>{setHidden('team-auth',false);setHidden('team-workspace',true);setHidden('team-setup',true);};
  const showSignedIn=()=>{setHidden('team-auth',true);setHidden('team-workspace',true);setHidden('team-setup',false);};
  function renderRoster(){
    const list=$('team-roster');if(!list)return;
    list.replaceChildren();
    if(!roster.length){list.textContent='Belum ada anggota yang ditampilkan.';return;}
    roster.forEach(member=>{
      const item=document.createElement('li');
      const name=document.createElement('strong');name.textContent=member.display_name;
      const role=document.createElement('span');role.textContent=({owner:'Pemilik',manager:'Pengelola',member:'Anggota'})[member.role]||'Anggota';
      item.append(name,role);item.dataset.userId=member.user_id;list.append(item);
    });
    const select=$('team-report-target');if(select){
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
      const item=document.createElement('li');
      const heading=document.createElement('strong');heading.textContent=({team_created:'Tim dibuat',member_joined:'Pemain bergabung',task_update:'Pembaruan tugas',shared_action:'Aksi bersama',reputation_review:'Peninjauan reputasi',member_left:'Anggota keluar'})[row.event_type]||'Aktivitas tim';
      const message=document.createElement('p');message.textContent=row.message;
      const time=document.createElement('small');time.textContent=new Date(row.created_at).toLocaleString('id-ID');
      item.append(heading,message,time);list.append(item);
    });
  }
  async function refreshTeam(){
    if(!client||!currentUser)return;
    const {data:membership,error:memberError}=await client.from('wk_team_members').select('team_id,role').eq('user_id',currentUser.id).maybeSingle();
    if(memberError){status('Tidak dapat memuat keanggotaan. Periksa apakah migrasi backend sudah diterapkan.','error');return;}
    if(!membership){
      currentTeam=null;roster=[];showSignedIn();
      $('team-setup-title').textContent='Buat tim atau gabung dengan kode';
      $('team-invite-code').textContent='Belum ada kode undangan';
      renderRoster();renderActivity([]);
      return;
    }
    const {data:team,error:teamError}=await client.from('wk_teams').select('id,name,invite_code,status,owner_id').eq('id',membership.team_id).single();
    if(teamError){status('Tim belum dapat dimuat. Periksa kebijakan RLS dan migrasi.','error');return;}
    currentTeam=team;showSignedIn();setHidden('team-setup',true);setHidden('team-workspace',false);
    $('team-name-title').textContent=team.name;
    $('team-role-label').textContent=({owner:'Pemilik tim',manager:'Pengelola',member:'Anggota'})[membership.role]||'Anggota';
    $('team-invite-code').textContent=team.invite_code;
    $('team-invite-code').title='Bagikan kode ini hanya kepada pemain yang kamu percaya.';
    setHidden('team-leave-btn',membership.role==='owner');
    const [membersResult,activityResult]=await Promise.all([
      client.from('wk_team_members').select('user_id,display_name,role,joined_at').eq('team_id',team.id).order('joined_at',{ascending:true}),
      client.from('wk_team_activity').select('id,actor_id,event_type,message,created_at').eq('team_id',team.id).order('created_at',{ascending:false}).limit(30)
    ]);
    if(membersResult.error||activityResult.error){status('Tim terbuka, tetapi sebagian data belum dapat dimuat. Periksa migrasi/RLS.','error');return;}
    roster=membersResult.data||[];renderRoster();renderActivity(activityResult.data||[]);
    status('Terhubung ke tim. Riwayat aktivitas dibatasi oleh izin akun.','success');
    subscribeTeam();
  }
  function subscribeTeam(){
    if(!client||!currentTeam)return;
    if(channel)client.removeChannel(channel);
    channel=client.channel('wk-team-'+currentTeam.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'wk_team_members',filter:'team_id=eq.'+currentTeam.id},()=>refreshTeam())
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'wk_team_activity',filter:'team_id=eq.'+currentTeam.id},()=>refreshActivity())
      .subscribe();
  }
  async function refreshActivity(){
    if(!client||!currentTeam)return;
    const {data,error}=await client.from('wk_team_activity').select('id,actor_id,event_type,message,created_at').eq('team_id',currentTeam.id).order('created_at',{ascending:false}).limit(30);
    if(!error)renderActivity(data||[]);
  }
  async function handleError(error,successMessage){
    if(error){status(error.message||'Permintaan gagal.','error');return false;}
    if(successMessage)status(successMessage,'success');
    return true;
  }
  async function refreshSession(){
    if(!client)return;
    const {data,error}=await client.auth.getSession();
    if(error){status(error.message,'error');return;}
    currentUser=data.session?.user||null;
    if(!currentUser){showSignedOut();status('Masuk untuk membuat tim atau bergabung dengan teman.');return;}
    await refreshTeam();
  }
  async function signInOrSignUp(mode){
    const email=$('team-email').value.trim(),password=$('team-password').value;
    if(!email||!password){status('Isi email dan kata sandi terlebih dahulu.','error');return;}
    if(password.length<8){status('Kata sandi minimal 8 karakter.','error');return;}
    status(mode==='signup'?'Membuat akun…':'Memeriksa akun…');
    const result=mode==='signup'
      ?await client.auth.signUp({email,password})
      :await client.auth.signInWithPassword({email,password});
    if(result.error){status(result.error.message,'error');return;}
    if(mode==='signup'&&!result.data.session){status('Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.','success');return;}
    currentUser=result.data.user||result.data.session?.user||null;
    await refreshSession();
  }
  async function createTeam(){
    const name=$('team-create-name').value.trim(),display=$('team-display-name').value.trim();
    if(!name||!display){status('Isi nama tim dan nama pemain.','error');return;}
    status('Membuat tim…');
    const {data,error}=await client.rpc('wk_create_team',{p_name:name,p_display_name:display});
    if(error){status(error.message,'error');return;}
    $('team-create-name').value='';
    await refreshTeam();
    status('Tim berhasil dibuat. Bagikan kode undangan kepada teman yang kamu percaya.','success');
  }
  async function joinTeam(){
    const code=$('team-join-code').value.trim().toUpperCase(),display=$('team-display-name').value.trim();
    if(!/^[A-F0-9]{8}$/.test(code)){status('Kode undangan harus 8 karakter A–F atau 0–9.','error');return;}
    if(!display){status('Isi nama pemain terlebih dahulu.','error');return;}
    status('Memeriksa undangan…');
    const {data,error}=await client.rpc('wk_join_team',{p_invite_code:code,p_display_name:display});
    if(error){status(error.message,'error');return;}
    $('team-join-code').value='';await refreshTeam();
    status('Berhasil bergabung ke tim.','success');
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
    const confirmed=window.confirm('Kirim laporan privat kepada pihak yang berwenang meninjau? Gunakan laporan hanya untuk kejadian nyata.');
    if(!confirmed)return;
    const {error}=await client.rpc('wk_submit_reputation_report',{p_target_user:target,p_category:category,p_details:details});
    if(error){status(error.message,'error');return;}
    $('team-report-details').value='';await refreshActivity();status('Laporan privat terkirim. Laporan tidak otomatis mengubah reputasi publik.','success');
  }
  async function leaveTeam(){
    if(!window.confirm('Keluar dari tim ini? Riwayat aktivitas yang sudah tercatat akan tetap ada.'))return;
    const {error}=await client.rpc('wk_leave_team');
    if(error){status(error.message,'error');return;}
    if(channel){await client.removeChannel(channel);channel=null;}
    currentTeam=null;await refreshTeam();status('Kamu sudah keluar dari tim.','success');
  }
  function init(){
    const panel=$('team-panel');if(!panel)return;
    if(!config.supabaseUrl||!config.publishableKey||!window.supabase?.createClient){
      showSignedOut();
      status('Fondasi Add Team tersedia, tetapi backend belum dikonfigurasi. Isi team-config.js dan terapkan migrasi SQL untuk mengaktifkan akun serta multiplayer.','warning');
      $('team-signin-btn').disabled=true;$('team-signup-btn').disabled=true;
      return;
    }
    client=window.supabase.createClient(config.supabaseUrl,config.publishableKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    $('team-signin-btn').addEventListener('click',()=>signInOrSignUp('signin'));
    $('team-signup-btn').addEventListener('click',()=>signInOrSignUp('signup'));
    $('team-signout-btn').addEventListener('click',async()=>{if(channel){await client.removeChannel(channel);channel=null;}await client.auth.signOut();currentUser=null;currentTeam=null;showSignedOut();status('Kamu sudah keluar.','success');});
    $('team-create-btn').addEventListener('click',createTeam);
    $('team-join-btn').addEventListener('click',joinTeam);
    $('team-activity-submit').addEventListener('click',logActivity);
    $('team-report-submit').addEventListener('click',submitReport);
    $('team-leave-btn').addEventListener('click',leaveTeam);
    $('team-copy-code-btn').addEventListener('click',async()=>{
      if(!currentTeam)return;
      try{await navigator.clipboard.writeText(currentTeam.invite_code);status('Kode undangan disalin. Bagikan hanya kepada teman yang kamu percaya.','success');}
      catch{status('Kode undangan: '+currentTeam.invite_code,'info');}
    });
    client.auth.onAuthStateChange((_event,session)=>{
      currentUser=session?.user||null;
      window.setTimeout(()=>refreshSession(),0);
    });
    refreshSession();
  }
  document.addEventListener('DOMContentLoaded',init,{once:true});
})();