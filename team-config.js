// Warung Kita Add Team/Teman configuration.
// Supabase publishable keys are intended for browser clients.
// NEVER put a service_role/secret key in this file.
window.WARUNG_TEAM_CONFIG = {
  supabaseUrl: 'https://anpwnkceyzpabkvwojic.supabase.co',
  publishableKey: 'sb_publishable_1NjOiTUJZ8uGcqL2BLh5zA_YoWt9Kqp'
};

// Load the additive team-management UI without changing the single-player game bundle.
(() => {
  const script = document.createElement('script');
  script.src = 'team-management.js?v=team-management-20261024-01';
  script.defer = true;
  document.head.appendChild(script);
})();
