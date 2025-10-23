// Wstaw swoje dane Supabase poniżej (zamień placeholdery)
const SUPABASE_URL = 'https://twoj-supabase-url.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51Z2tvbnVhZWRucXpoaHh2cHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMTk5NDEsImV4cCI6MjA3MTc5NTk0MX0.tCNCVi-hmvz_cIbTqOUHgpmxKpy6epQ7v29Q7wj0kBU';

const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Helpery ----
function $(sel){ return document.querySelector(sel) }
function $all(sel){ return Array.from(document.querySelectorAll(sel)) }

// Apply theme from JSON
function applyTheme(themeJson){
  try{
    const t = typeof themeJson === 'string' ? JSON.parse(themeJson) : themeJson;
    if(!t) return;
    if(t.mode === 'dark') document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
    if(t.primary){
      document.documentElement.style.setProperty('--primary', t.primary);
    }
  }catch(e){ console.warn('theme parse error', e) }
}

// ---- Auth / session ----
async function handleAuthOnLoad(){
  const { data: { session } } = await supabase.auth.getSession();
  if(session){
    onUser(session.user);
  } else {
    // check if redirect from provider sign-in
    const { data: { user } } = await supabase.auth.getUser();
    if(user) onUser(user);
  }
}

async function onUser(user){
  // display basic info and load profile
  $('#user-email')?.textContent && ($('#user-email').textContent = user.email);
  $('#email-display') && ($('#email-display').textContent = user.email);
  // load profile row
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single().catch(()=>({data:null}));
  if(!profile){
    // create profile on first login
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null
    }, { returning: 'representation' });
  } else {
    if(profile.theme) applyTheme(profile.theme);
    if(profile.full_name) $('#full-name') && ($('#full-name').textContent = profile.full_name);
    if(profile.avatar_url) $('#avatar') && ($('#avatar').src = profile.avatar_url);
  }
  // update UI
  $all('#user-area, #logout').forEach(el => el.classList.remove('hidden'));
  $all('#auth-area').forEach(el => el.classList.add('hidden'));
  // show note about approval
  checkApprovalAndNote(user.id);
}

async function checkApprovalAndNote(userId){
  const { data: profile } = await supabase.from('profiles').select('approved').eq('id', userId).single();
  const note = $('#comment-note');
  if(profile && profile.approved){
    note.textContent = 'Jesteś zatwierdzonym użytkownikiem — możesz zostawiać komentarze i oceny.';
  } else {
    note.textContent = 'Twoje konto nie jest jeszcze zatwierdzone przez admina — po zatwierdzeniu będziesz mógł zostawić opinię.';
  }
}

// ---- Auth UI handlers ----
document.addEventListener('DOMContentLoaded', () => {
  // login page handlers
  $('#email-login')?.addEventListener('click', async () => {
    const email = $('#email-input').value;
    if(!email) return $('#auth-message').textContent = 'Podaj email.';
    const { error } = await supabase.auth.signInWithOtp({ email });
    if(error) $('#auth-message').textContent = 'Błąd: ' + error.message;
    else $('#auth-message').textContent = 'Wysłano link do logowania na email.';
  });

  $('#google-login')?.addEventListener('click', async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/'} });
  });

  $('#logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.href = '/';
  });

  // settings modal
  $('#settings-btn')?.addEventListener('click', ()=> $('#settings-modal').classList.remove('hidden'));
  $('#close-settings')?.addEventListener('click', ()=> $('#settings-modal').classList.add('hidden'));

  $('#save-theme')?.addEventListener('click', async () => {
    const sel = $('#theme-select').value;
    let themeObj = JSON.parse(sel);
    if(themeObj.mode === 'custom'){
      themeObj.primary = $('#theme-color').value;
    }
    applyTheme(themeObj);
    // save to profile
    const { data: { session } } = await supabase.auth.getSession();
    if(!session) return alert('Musisz być zalogowany, aby zapisać ustawienia.');
    await supabase.from('profiles').update({ theme: themeObj }).eq('id', session.user.id);
    $('#settings-modal').classList.add('hidden');
    alert('Motyw zapisany.');
  });

  // comment submit
  $('#submit-comment')?.addEventListener('click', async () => {
    const content = $('#comment-content').value.trim();
    const rating = parseInt($('#comment-rating').value,10);
    const { data: { session } } = await supabase.auth.getSession();
    if(!session) return alert('Zaloguj się najpierw.');
    // check approval
    const { data: profile } = await supabase.from('profiles').select('approved').eq('id', session.user.id).single();
    if(!profile || !profile.approved) return alert('Twoje konto nie jest zatwierdzone przez admina.');
    if(!content) return alert('Wpisz treść komentarza.');
    // For this demo we attach comment to null project (bio). Could be project_id in future.
    const { error } = await supabase.from('comments').insert({
      project_id: null,
      author_id: session.user.id,
      content,
      rating
    });
    if(error) return alert('Błąd: ' + error.message);
    $('#comment-content').value = '';
    loadComments();
    alert('Dziękujemy za opinię!');
  });

  // contact message (simple - stores as comment with no project)
  $('#send-contact')?.addEventListener('click', async () => {
    const msg = $('#contact-message').value.trim();
    if(!msg) return $('#contact-note').textContent = 'Wpisz wiadomość.';
    const { data: { session } } = await supabase.auth.getSession();
    if(!session) return $('#contact-note').textContent = 'Musisz być zalogowany, by wysłać.';
    // optional: check approval
    const { data: profile } = await supabase.from('profiles').select('approved').eq('id', session.user.id).single();
    if(!profile || !profile.approved) return $('#contact-note').textContent = 'Twoje konto niezatwierdzone.';
    await supabase.from('comments').insert({ project_id: null, author_id: session.user.id, content: msg, rating: 0 });
    $('#contact-note').textContent = 'Wysłano.';
    $('#contact-message').value = '';
  });

  // load data for pages
  initPage();
  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    if(session && session.user) onUser(session.user);
    else {
      // logged out
      $all('#user-area').forEach(el=>el.classList.add('hidden'));
      $all('#auth-area').forEach(el=>el.classList.remove('hidden'));
    }
  });
});

async function initPage(){
  await handleAuthOnLoad();
  // load socials/profiles/projects/comments as appropriate
  loadProfile();
  loadProjectsPreview();
  loadComments();
}

async function loadProfile(){
  // For demo: load first profile (owner). You can change to specific user id.
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at').limit(1);
  if(profiles && profiles.length){
    const p = profiles[0];
    if(p.full_name) $('#full-name') && ($('#full-name').textContent = p.full_name);
    if(p.avatar_url) $('#avatar') && ($('#avatar').src = p.avatar_url);
    if(p.email) $('#email-display') && ($('#email-display').textContent = p.email);
    applyTheme(p.theme);
    // load socials for this profile
    const { data: socials } = await supabase.from('socials').select('*').eq('profile_id', p.id);
    const container = $('#social-links');
    if(socials && socials.length){
      container.innerHTML = socials.map(s => `<a href="${s.url}" target="_blank">${s.platform}</a>`).join('');
    } else {
      container.innerHTML = '<span class="muted">Brak linków</span>';
    }
  }
}

async function loadProjectsPreview(){
  const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(3);
  const list = $('#projects-list');
  if(!list) return;
  if(!data || data.length===0) { list.innerHTML = '<p class="muted">Brak projektów</p>'; return; }
  list.innerHTML = data.map(p => `
    <div class="project">
      <h4>${p.title || 'Beznazwy'}</h4>
      <p class="muted">${p.year || ''} • ${p.stack || ''}</p>
      <p>${p.description || ''}</p>
      ${p.link ? `<a href="${p.link}" target="_blank" class="btn small">Zobacz projekt</a>` : ''}
    </div>
  `).join('');
  // also populate projekty page if present
  const grid = $('#projects-grid');
  if(grid){
    grid.innerHTML = data.map(p => `
      <div class="project card">
        <h4>${p.title}</h4>
        <p class="muted">${p.year || ''} • ${p.stack || ''}</p>
        <p>${p.description || ''}</p>
        ${p.link ? `<a href="${p.link}" target="_blank" class="btn small">Zobacz</a>` : ''}
      </div>
    `).join('');
  }
}

async function loadComments(){
  const { data } = await supabase.from('comments').select('*, profiles(full_name,avatar_url)').order('created_at', { ascending: false }).limit(50);
  const container = $('#comments-list');
  if(!container) return;
  if(!data || data.length===0){ container.innerHTML = '<p class="muted">Brak opinii</p>'; return; }
  container.innerHTML = data.map(c => {
    const author = c.profiles || {};
    const name = author.full_name || (author.email ? author.email.split('@')[0] : 'Anonim');
    const avatar = author.avatar_url || '/assets/default-avatar.png';
    const ratingStars = c.rating > 0 ? '★'.repeat(c.rating) + '☆'.repeat(5-c.rating) : '';
    return `
      <div class="card" style="margin-bottom:8px;">
        <div style="display:flex;gap:10px;align-items:center">
          <img src="${avatar}" style="width:48px;height:48px;border-radius:8px;object-fit:cover"/>
          <div>
            <strong>${name}</strong> <div class="muted small-muted">${new Date(c.created_at).toLocaleString()}</div>
            <div class="muted">${ratingStars}</div>
          </div>
        </div>
        <p style="margin-top:8px">${c.content}</p>
      </div>
    `;
  }).join('');
}
