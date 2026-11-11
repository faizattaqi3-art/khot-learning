import { curriculum, galleryItems } from './data.js';
import { Store, getLearningProgress } from './store.js';
import { initCanvasEngine } from './canvas-engine.js';
import {
  firebaseEnabled, loginWithEmail, registerStudent, sendPasswordReset,
  logoutFirebase, uploadArtwork, saveCloudSubmission, saveCloudAssessment, loadCloudSubmissions, loadCloudAssessments
} from './firebase-service.js';

const root = document.getElementById('app');
const toastRegion = document.getElementById('toast-region');
const appState = {
  user: null,
  profile: null,
  role: 'student',
  page: 'dashboard',
  selectedLesson: null,
  canvasMode: 'free',
  canvasAssignment: '',
  sidebarOpen: false,
  search: '',
  firebaseUser: null
};

const studentNav = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂', group: 'Ruang Belajar' },
  { id: 'curriculum', label: 'Kurikulum', icon: '▤' },
  { id: 'gallery', label: 'Galeri Kaligrafi', icon: '▧' },
  { id: 'tracing', label: 'Tracing Practice', icon: '✎' },
  { id: 'practice', label: 'Free Practice', icon: '﹏' },
  { id: 'assignments', label: 'Tugas Saya', icon: '☷', group: 'Akademik' },
  { id: 'results', label: 'Hasil & Progres', icon: '◷' },
  { id: 'profile', label: 'Profil', icon: '◉', group: 'Akun' }
];
const teacherNav = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂', group: 'Pengelolaan' },
  { id: 'classes', label: 'Manajemen Kelas', icon: '▦' },
  { id: 'students', label: 'Data Santri', icon: '♙' },
  { id: 'curriculum', label: 'Kurikulum & Materi', icon: '▤' },
  { id: 'assignments', label: 'Manajemen Tugas', icon: '☷' },
  { id: 'submissions', label: 'Pengumpulan Karya', icon: '▧' },
  { id: 'reports', label: 'Laporan Progres', icon: '◷', group: 'Evaluasi' },
  { id: 'profile', label: 'Profil', icon: '◉', group: 'Akun' }
];

const titles = {
  dashboard: ['Dashboard', 'Ringkasan aktivitas pembelajaran'],
  curriculum: ['Kurikulum Pembelajaran', 'Jalur belajar khat dari dasar hingga lanjutan'],
  gallery: ['Galeri Kaligrafi', 'Amati contoh karya dan karakter berbagai gaya tulisan'],
  tracing: ['Tracing Practice', 'Tebalkan contoh huruf di atas lembar latihan digital'],
  practice: ['Free Practice', 'Tuangkan latihan dan eksplorasi goresan secara bebas'],
  assignments: ['Tugas Pembelajaran', 'Pantau dan kumpulkan karya sesuai instruksi pengajar'],
  results: ['Hasil & Progres', 'Lihat perkembangan belajar dan evaluasi pengajar'],
  profile: ['Profil Pengguna', 'Informasi akun dan pengaturan sesi'],
  classes: ['Manajemen Kelas', 'Kelola kelas dan kelompok pembelajaran'],
  students: ['Data Santri', 'Pantau peserta dan perkembangan belajar'],
  submissions: ['Pengumpulan Karya', 'Periksa karya yang telah dikirimkan santri'],
  reports: ['Laporan Progres', 'Ringkasan perkembangan pembelajaran per kelas']
};

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function dateText(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
function toast(message, type = 'normal') {
  const item = document.createElement('div');
  item.className = `toast ${type === 'error' ? 'error' : type === 'success' ? 'success' : ''}`;
  item.textContent = message;
  toastRegion.append(item);
  setTimeout(() => item.remove(), 3600);
}
function initials(name = 'KH') { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }
function currentName() { return appState.profile?.name || appState.user?.name || 'Pengguna KHOT'; }
function progressMarkup(percent) { return `<div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, percent))}%"></div></div>`; }
function statusPill(status) {
  const map = { Submitted: ['warning', 'Terkirim'], 'Under Review': ['gold', 'Sedang Dinilai'], Reviewed: ['success', 'Selesai Dinilai'], 'Revision Required': ['danger', 'Perlu Revisi'], Draft: ['', 'Draft'] };
  const [tone, label] = map[status] || ['', status || '—'];
  return `<span class="pill ${tone}">${label}</span>`;
}

function renderAuth() {
  root.innerHTML = `
    <main class="auth-screen">
      <section class="auth-visual">
        <div class="brand"><div class="brand-symbol">خ</div><div><div class="brand-name">KHOT LEARNING</div><div class="brand-ar">مَدْرَسَةُ الْخَطِّ</div></div></div>
        <div>
          <div class="arabic-hero" dir="rtl">فَنُّ الْخَطِّ الْعَرَبِيِّ</div>
          <h1>Belajar menulis, memahami keindahan.</h1>
          <p>Ruang belajar seni khat Arab yang menghubungkan materi, latihan digital, karya, dan evaluasi.</p>
        </div>
        <div class="small" style="color:#c9b69e">LEARN · PRACTICE · CREATE <span style="float:right">© KHOT LEARNING</span></div>
      </section>
      <section class="auth-panel">
        <div class="auth-card">
          <div class="eyebrow">Selamat datang</div>
          <h2>Masuk ke ruang belajar</h2>
          <p>Gunakan akun KHOT Learning untuk melanjutkan pembelajaran.</p>
          <form id="login-form">
            <div class="field"><label for="login-email">Email</label><input id="login-email" type="email" required placeholder="nama@email.com" autocomplete="username"></div>
            <div class="field"><label for="login-password">Password</label><input id="login-password" type="password" required minlength="6" placeholder="Masukkan password" autocomplete="current-password"></div>
            <div style="display:flex;justify-content:flex-end;margin:-3px 0 14px"><button type="button" class="btn btn-ghost btn-sm" data-action="forgot-password">Lupa password?</button></div>
            <button class="btn btn-primary" style="width:100%" type="submit">Masuk <span>→</span></button>
          </form>
          <div class="divider"></div>
          <div class="small muted" style="font-weight:800">BELUM MEMILIKI AKUN?</div>
          <button class="btn btn-secondary" style="width:100%;margin-top:8px" data-action="show-register">Daftar sebagai santri</button>
          <div class="divider"></div>
          <div class="small muted" style="font-weight:800">COBA PROTOTIPE TANPA LOGIN</div>
          <div class="demo-choice">
            <button data-action="demo-login" data-role="student"><strong>♙ Santri</strong><small>Masuk ke ruang belajar</small></button>
            <button data-action="demo-login" data-role="teacher"><strong>▤ Pengajar</strong><small>Masuk ke panel pengajar</small></button>
          </div>
          <p class="small muted" style="margin:12px 0 0">${firebaseEnabled ? 'Mode Firebase aktif.' : 'Mode demo lokal aktif. Data tersimpan di browser ini.'}</p>
        </div>
      </section>
    </main>`;
}

function renderRegister() {
  root.innerHTML = `
    <main class="auth-screen">
      <section class="auth-visual">
        <div class="brand"><div class="brand-symbol">خ</div><div><div class="brand-name">KHOT LEARNING</div><div class="brand-ar">مَدْرَسَةُ الْخَطِّ</div></div></div>
        <div><div class="arabic-hero" dir="rtl">اُكْتُبْ وَتَعَلَّمْ</div><h1>Mulai perjalanan belajar khat.</h1><p>Registrasi terbuka untuk akun santri. Akun pengajar dibuat dan ditetapkan oleh administrator.</p></div>
        <div class="small" style="color:#c9b69e">LEARN · PRACTICE · CREATE</div>
      </section>
      <section class="auth-panel"><div class="auth-card">
        <div class="eyebrow">Registrasi santri</div><h2>Buat akun baru</h2><p>Isi data berikut untuk memulai pembelajaran.</p>
        <form id="register-form">
          <div class="field"><label>Nama lengkap</label><input name="name" required maxlength="70" placeholder="Nama lengkap"></div>
          <div class="field"><label>Email</label><input name="email" type="email" required placeholder="nama@email.com"></div>
          <div class="field"><label>Password</label><input name="password" type="password" minlength="6" required placeholder="Minimal 6 karakter"></div>
          <div class="field"><label>Kode kelas (opsional)</label><input name="classCode" placeholder="Kode dari pengajar"></div>
          <div class="callout">Pendaftaran hanya membuat akun dengan role <b>Santri</b>. Hak akses pengajar tidak dapat dipilih melalui formulir ini.</div>
          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:15px">Buat akun</button>
        </form>
        <button class="btn btn-ghost" style="width:100%;margin-top:10px" data-action="show-login">← Kembali ke login</button>
      </div></section>
    </main>`;
}

function renderShell() {
  const nav = appState.role === 'teacher' ? teacherNav : studentNav;
  const groups = [];
  nav.forEach(item => {
    if (item.group) groups.push(`<div class="nav-label">${item.group}</div>`);
    groups.push(`<button class="nav-item ${appState.page === item.id ? 'active' : ''}" data-action="navigate" data-page="${item.id}"><span class="nav-icon">${item.icon}</span>${item.label}</button>`);
  });
  const pageTitle = titles[appState.page] || titles.dashboard;
  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar ${appState.sidebarOpen ? 'open' : ''}" id="sidebar">
        <div class="brand"><div class="brand-symbol">خ</div><div><div class="brand-name">KHOT LEARNING</div><div class="brand-ar">مَدْرَسَةُ الْخَطِّ</div></div></div>
        <nav class="nav-list" aria-label="Navigasi utama">${groups.join('')}</nav>
        <div class="sidebar-bottom">
          <div class="sidebar-note"><div class="arabic">وَقُلْ رَبِّ زِدْنِي عِلْمًا</div><div style="margin-top:5px">“Ya Tuhanku, tambahkanlah ilmu kepadaku.”</div></div>
          <div class="profile-mini"><div class="avatar">${initials(currentName())}</div><div style="flex:1;min-width:0"><strong>${escapeHTML(currentName())}</strong><small>${appState.role === 'teacher' ? 'Pengajar' : 'Santri'}</small></div><button class="icon-btn" style="width:30px;height:30px;background:transparent;border-color:rgba(255,255,255,.15);color:#e8d7c0" data-action="logout" title="Keluar">↪</button></div>
        </div>
      </aside>
      <main class="main-area">
        <header class="topbar">
          <button class="icon-btn mobile-menu" data-action="toggle-sidebar" aria-label="Buka menu">☰</button>
          <div class="topbar-title"><h1>${pageTitle[0]}</h1><p>${pageTitle[1]}</p></div>
          <div class="topbar-actions"><span class="mode-chip">${firebaseEnabled && appState.firebaseUser ? 'FIREBASE CONNECTED' : 'LOCAL DEMO'}</span><div class="avatar profile-top">${initials(currentName())}</div></div>
        </header>
        <section class="content" id="page-content">${renderCurrentPage()}</section>
      </main>
    </div>`;
  if (appState.page === 'tracing' || appState.page === 'practice') initCanvasPage();
}

function renderCurrentPage() {
  if (appState.role === 'teacher') {
    const pages = { dashboard: teacherDashboard, classes: teacherClasses, students: teacherStudents, curriculum: teacherCurriculum, assignments: teacherAssignments, submissions: teacherSubmissions, reports: teacherReports, profile: profilePage };
    return (pages[appState.page] || teacherDashboard)();
  }
  const pages = { dashboard: studentDashboard, curriculum: studentCurriculum, gallery: studentGallery, tracing: () => canvasPage('tracing'), practice: () => canvasPage('free'), assignments: studentAssignments, results: studentResults, profile: profilePage };
  return (pages[appState.page] || studentDashboard)();
}

function studentDashboard() {
  const progress = getLearningProgress();
  const tasks = Store.get().assignments.filter(a => a.status === 'active');
  const lessons = Store.getLessons();
  const next = lessons.find(l => !Store.isCompleted(l.id)) || lessons[0];
  const completed = progress.done;
  return `
    <div class="welcome-banner"><div class="eyebrow">Assalamu'alaikum, ${escapeHTML(currentName().split(' ')[0])}</div><h2>Setiap goresan adalah proses belajar.</h2><p>Lanjutkan latihan khatmu dan bangun keterampilan satu tahap demi satu tahap.</p><button class="btn" data-action="open-lesson" data-id="${next.id}">Lanjutkan belajar <span>→</span></button></div>
    <div class="stats-grid">
      <div class="card stat-card"><div class="stat-icon">▤</div><div><div class="stat-value">${progress.total}</div><div class="stat-label">Total materi</div></div></div>
      <div class="card stat-card"><div class="stat-icon">✓</div><div><div class="stat-value">${completed}</div><div class="stat-label">Materi selesai</div></div></div>
      <div class="card stat-card"><div class="stat-icon">✎</div><div><div class="stat-value">${Store.get().submissions.filter(s => s.studentId === (appState.firebaseUser?.uid || 'demo-student')).length}</div><div class="stat-label">Karya dikumpulkan</div></div></div>
      <div class="card stat-card"><div class="stat-icon">◷</div><div><div class="stat-value">${progress.percent}%</div><div class="stat-label">Progres belajar</div></div></div>
    </div>
    <div class="dashboard-grid">
      <section class="card card-pad"><div class="section-heading"><div><div class="eyebrow">Learning path</div><h2>Perjalanan belajarmu</h2></div><button class="btn btn-ghost btn-sm" data-action="navigate" data-page="curriculum">Lihat kurikulum →</button></div>
        ${curriculum.map(level => { const ids = level.lessons.map(l => l.id); const done = ids.filter(id => Store.isCompleted(id)).length; const pct = Math.round(done / ids.length * 100); return `<div class="level-row"><div class="level-number">${level.number}</div><div class="level-info"><strong>${level.title}</strong><small>${done} dari ${ids.length} materi selesai</small><div style="margin-top:7px">${progressMarkup(pct)}</div></div><div class="level-percent">${pct}%</div></div>`; }).join('')}
      </section>
      <section class="card card-pad"><div class="section-heading"><div><div class="eyebrow">Your next step</div><h2>Materi berikutnya</h2></div></div>
        <div class="lesson-art" style="border:1px solid var(--border);border-radius:12px"><div><div class="arabic">${next.arabic}</div><div class="small muted">${next.levelTitle}</div></div></div>
        <h3 style="font-size:14px;margin:13px 0 4px">${next.title}</h3><p class="muted small" style="margin:0 0 12px">${next.summary}</p><button class="btn btn-primary" style="width:100%" data-action="open-lesson" data-id="${next.id}">Buka materi</button>
        <div class="divider"></div><div class="section-heading" style="margin-bottom:10px"><h3>Tugas aktif</h3><button class="btn btn-ghost btn-sm" data-action="navigate" data-page="assignments">Semua tugas</button></div>
        ${tasks.slice(0,2).map(a => `<div class="level-row"><div class="level-number">✎</div><div class="level-info"><strong>${escapeHTML(a.title)}</strong><small>Batas: ${dateText(a.due)}</small></div><span class="pill warning">Aktif</span></div>`).join('') || '<div class="small muted">Belum ada tugas aktif.</div>'}
      </section>
    </div>`;
}

function studentCurriculum() {
  const lessons = Store.getLessons();
  return `<div class="page-intro"><div><div class="eyebrow">Guided learning</div><h2>Jalur pembelajaran khat</h2><p>Ikuti materi secara bertahap atau pilih materi yang ingin kamu pelajari kembali.</p></div></div>
    ${curriculum.map(level => { const items = lessons.filter(l => l.levelId === level.id); const done = items.filter(l => Store.isCompleted(l.id)).length; return `<section class="card card-pad" style="margin-bottom:14px"><div class="section-heading"><div><span class="pill gold">LEVEL ${level.number}</span><h2 style="margin-top:8px">${level.title} <span class="arabic" style="font-size:18px;color:var(--gold);margin-left:5px">${level.arabic}</span></h2><p>${level.description}</p></div><div style="min-width:65px;text-align:right"><strong>${done}/${items.length}</strong><div class="small muted">selesai</div></div></div>
      ${items.map((lesson,i) => `<div class="level-row"><div class="level-number">${Store.isCompleted(lesson.id) ? '✓' : String(i+1).padStart(2,'0')}</div><div class="level-info"><strong>${escapeHTML(lesson.title)}</strong><small>${escapeHTML(lesson.summary)} · ${lesson.duration || '20 menit'}</small></div>${Store.isCompleted(lesson.id) ? '<span class="pill success">Selesai</span>' : '<span class="pill">Belum</span>'}<button class="btn btn-secondary btn-sm" data-action="open-lesson" data-id="${lesson.id}">Buka</button></div>`).join('')}
    </section>`; }).join('')}`;
}

function lessonDetail() {
  const lesson = Store.getLesson(appState.selectedLesson);
  if (!lesson) return studentCurriculum();
  return `<div class="page-intro"><div><button class="btn btn-ghost btn-sm" data-action="navigate" data-page="curriculum">← Kembali ke kurikulum</button><div class="eyebrow" style="margin-top:12px">${escapeHTML(lesson.levelTitle)}</div><h2>${escapeHTML(lesson.title)}</h2><p>${escapeHTML(lesson.summary)}</p></div>${Store.isCompleted(lesson.id) ? '<span class="pill success">✓ Telah dipelajari</span>' : ''}</div>
    <div class="detail-layout"><article class="card article-content"><div class="arabic-sample">${lesson.sample || lesson.arabic}</div><h3>Tujuan pembelajaran</h3><p>${escapeHTML(lesson.objective || 'Memahami materi dan menerapkannya melalui latihan.')}</p><h3>Materi</h3><p>${escapeHTML(lesson.theory || lesson.summary)}</p><h3>Kaidah dan perhatian</h3><ul>${(lesson.rules || ['Perhatikan bentuk huruf.', 'Latih secara bertahap.', 'Bandingkan dengan contoh.']).map(rule => `<li>${escapeHTML(rule)}</li>`).join('')}</ul><div class="divider"></div><div class="action-row"><button class="btn btn-primary" data-action="complete-lesson" data-id="${lesson.id}">${Store.isCompleted(lesson.id) ? 'Tandai selesai lagi' : 'Tandai selesai ✓'}</button><button class="btn btn-secondary" data-action="open-tracing">Latihan tracing</button></div></article>
      <aside class="card card-pad"><div class="eyebrow">Lesson guide</div><h3 style="margin:6px 0 14px">Ringkasan materi</h3><div class="feature-list"><div class="feature-line"><b>✓</b><span>Materi teori dan pengamatan contoh</span></div><div class="feature-line"><b>✓</b><span>Latihan bentuk dan kaidah tulisan</span></div><div class="feature-line"><b>✓</b><span>Evaluasi mandiri melalui praktik digital</span></div></div><div class="divider"></div><div class="small muted">Estimasi waktu</div><strong>${lesson.duration || '20 menit'}</strong></aside>
    </div>`;
}

function studentGallery() {
  return `<div class="page-intro"><div><div class="eyebrow">Visual reference</div><h2>Galeri inspirasi khat</h2><p>Gunakan contoh sebagai bahan pengamatan bentuk, sambungan, dan komposisi. Contoh pada prototipe ini merupakan kartu referensi teks.</p></div></div>
    <div class="gallery-grid">${galleryItems.map(item => `<article class="card gallery-card"><div class="gallery-preview"><div class="arabic">${item.text}</div></div><div class="gallery-info"><div style="display:flex;justify-content:space-between;gap:8px"><strong>${item.title}</strong><span class="pill gold">${item.style}</span></div><span>${item.note}</span><div style="margin-top:10px"><button class="btn btn-secondary btn-sm" data-action="use-template" data-text="${escapeHTML(item.text)}">Gunakan untuk latihan</button></div></div></article>`).join('')}</div>`;
}

function canvasPage(mode) {
  const tracing = mode === 'tracing';
  const assignments = Store.get().assignments.filter(a => a.status === 'active');
  const templates = [
    ['ا ب ت ث', 'Huruf alif–tsa'], ['ج ح خ', 'Huruf jim–kha'], ['د ذ ر ز', 'Huruf dal–zay'], ['س ش ص ض', 'Huruf sin–dhad'], ['ع غ ف ق', 'Huruf ain–qaf'], ['ك ل م ن', 'Huruf kaf–nun'], ['ه و ي', 'Huruf ha–ya'], ['بِسْمِ اللَّهِ', 'Basmalah'], ['طَلَبُ الْعِلْمِ', 'Thalabul ilmi'], ['رَبِّ زِدْنِي عِلْمًا', 'Rabbi zidni ilma']
  ];
  return `<div class="page-intro"><div><div class="eyebrow">Digital calligraphy workspace</div><h2>${tracing ? 'Tebalkan contoh tulisan' : 'Ruang menulis bebas'}</h2><p>${tracing ? 'Ikuti bentuk template secara perlahan. Atur transparansi panduan dan ketebalan pena.' : 'Gunakan area seperti kertas latihan untuk membuat goresan dan menyimpan karya.'}</p></div><span class="pill gold">Canvas workspace</span></div>
    <div class="canvas-layout">
      <section class="card canvas-card">
        <div class="canvas-toolbar"><div class="canvas-tools"><button class="tool-btn active" data-tool="pen">✎ Pena</button><button class="tool-btn" data-tool="eraser">⌫ Penghapus</button><button class="tool-btn" id="canvas-undo">↶ Undo</button><button class="tool-btn" id="canvas-redo">↷ Redo</button></div><div class="small muted">Mouse · Touch · Stylus</div></div>
        <div class="canvas-wrap ${tracing ? '' : 'ruled-paper'}" id="canvas-wrap"><canvas id="guide-canvas"></canvas><canvas id="ink-canvas" aria-label="Area menulis kaligrafi"></canvas></div>
        <div class="canvas-toolbar"><div class="small muted">Gunakan jari atau pena digital untuk menulis pada area kerja.</div><div class="action-row"><button class="btn btn-secondary btn-sm" id="canvas-clear">Clear</button><button class="btn btn-secondary btn-sm" id="canvas-reset">Reset</button><button class="btn btn-primary btn-sm" id="canvas-save">↓ Simpan PNG</button></div></div>
      </section>
      <aside class="canvas-side">
        <section class="card"><h3>Pengaturan pena</h3><div class="control-row"><label for="pen-color">Warna tinta</label><input id="pen-color" type="color" value="#302116"></div><div class="control-row"><label for="pen-size">Ketebalan</label><input id="pen-size" type="range" min="1" max="18" value="4"><b id="pen-size-value">4 px</b></div><div class="field" style="margin:12px 0 0"><label for="paper-select">Jenis kertas</label><select id="paper-select"><option value="plain">Polos</option><option value="ruled" ${!tracing ? 'selected' : ''}>Bergaris</option><option value="grid">Kotak-kotak</option></select></div></section>
        ${tracing ? `<section class="card"><h3>Template latihan</h3><select class="template-select" id="template-select">${templates.map(([text,label]) => `<option value="${escapeHTML(text)}">${label}</option>`).join('')}</select><div class="control-row"><label for="guide-opacity">Transparansi</label><input id="guide-opacity" type="range" min="5" max="65" value="25"><b id="opacity-value">25%</b></div><p class="canvas-tip">Template berada di lapisan panduan. Goresanmu dibuat pada lapisan terpisah.</p></section>` : `<section class="card"><h3>Petunjuk latihan</h3><p class="canvas-tip">Mulai dengan garis dasar, bentuk lengkung, dan sambungan. Simpan hasil sebagai PNG untuk dokumentasi latihan.</p></section>`}
        <section class="card canvas-full"><h3>Pengumpulan karya</h3><div class="field"><label for="canvas-assignment">Pilih tugas (opsional untuk simpan)</label><select id="canvas-assignment"><option value="">Latihan mandiri</option>${assignments.map(a => `<option value="${a.id}" ${appState.canvasAssignment === a.id ? 'selected' : ''}>${escapeHTML(a.title)}</option>`).join('')}</select></div><button class="btn btn-gold" style="width:100%" id="canvas-submit">Kumpulkan karya</button><p class="canvas-tip" style="margin:9px 0 0">Simpan PNG untuk mengunduh hasil. Tombol kumpulkan akan mengirim karya ke daftar penilaian pengajar.</p></section>
      </aside>
    </div>`;
}

function studentAssignments() {
  const state = Store.get();
  const mine = state.submissions.filter(s => s.studentId === (appState.firebaseUser?.uid || 'demo-student'));
  return `<div class="page-intro"><div><div class="eyebrow">Learning tasks</div><h2>Daftar tugasmu</h2><p>Baca instruksi, perhatikan batas pengumpulan, lalu kirim karya melalui ruang praktik digital.</p></div><button class="btn btn-primary" data-action="navigate" data-page="practice">Mulai latihan bebas</button></div>
    <div class="card card-pad"><div class="table-wrap"><table><thead><tr><th>Tugas</th><th>Materi</th><th>Batas waktu</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${state.assignments.map(a => { const sent = mine.find(s => s.assignmentId === a.id); return `<tr><td><strong>${escapeHTML(a.title)}</strong><div class="small muted">${escapeHTML(a.description)}</div></td><td>${escapeHTML(a.level || '—')}</td><td>${dateText(a.due)}</td><td>${sent ? statusPill(sent.status) : '<span class="pill warning">Belum dikumpulkan</span>'}</td><td><button class="btn btn-secondary btn-sm" data-action="start-assignment" data-id="${a.id}">${sent ? 'Kirim revisi' : 'Kerjakan'}</button></td></tr>`; }).join('') || '<tr><td colspan="5">Belum ada tugas tersedia.</td></tr>'}</tbody></table></div></div>
    <div class="card card-pad" style="margin-top:15px"><div class="section-heading"><div><div class="eyebrow">Submission history</div><h2>Riwayat pengumpulan</h2></div></div>${mine.length ? mine.map(s => `<div class="level-row"><div class="level-number">✎</div><div class="level-info"><strong>${escapeHTML(s.assignmentTitle || 'Latihan mandiri')}</strong><small>${dateText(s.createdAt?.slice(0,10))} · ${s.score != null ? `Nilai ${s.score}` : 'Menunggu evaluasi'}</small></div>${statusPill(s.status)}</div>`).join('') : '<div class="empty-state"><div class="empty-icon">▧</div><strong>Belum ada karya dikumpulkan</strong>Hasil latihan yang dikirim akan muncul di sini.</div>'}</div>`;
}

function studentResults() {
  const progress = getLearningProgress();
  const mine = Store.get().submissions.filter(s => s.studentId === (appState.firebaseUser?.uid || 'demo-student'));
  const assessments = Store.get().assessments.filter(a => mine.some(s => s.id === a.submissionId));
  return `<div class="page-intro"><div><div class="eyebrow">Learning analytics</div><h2>Perkembangan belajarmu</h2><p>Ringkasan materi, karya, dan hasil evaluasi yang tercatat pada prototipe ini.</p></div></div>
    <div class="stats-grid"><div class="card stat-card"><div class="stat-icon">◷</div><div><div class="stat-value">${progress.percent}%</div><div class="stat-label">Progres materi</div></div></div><div class="card stat-card"><div class="stat-icon">✓</div><div><div class="stat-value">${progress.done}/${progress.total}</div><div class="stat-label">Materi selesai</div></div></div><div class="card stat-card"><div class="stat-icon">▧</div><div><div class="stat-value">${mine.length}</div><div class="stat-label">Karya terkirim</div></div></div><div class="card stat-card"><div class="stat-icon">★</div><div><div class="stat-value">${assessments.length ? Math.round(assessments.reduce((a,b) => a + (b.score || 0),0) / assessments.length) : '—'}</div><div class="stat-label">Rata-rata nilai</div></div></div></div>
    <div class="dashboard-grid"><section class="card card-pad"><div class="section-heading"><div><div class="eyebrow">Learning progress</div><h2>Progres per level</h2></div></div>${curriculum.map(level => { const done = level.lessons.filter(l => Store.isCompleted(l.id)).length; const pct = Math.round(done / level.lessons.length * 100); return `<div class="level-row"><div class="level-number">${level.number}</div><div class="level-info"><strong>${level.title}</strong><small>${done} dari ${level.lessons.length} materi</small><div style="margin-top:7px">${progressMarkup(pct)}</div></div><b>${pct}%</b></div>`; }).join('')}</section><section class="card card-pad"><div class="section-heading"><div><div class="eyebrow">Teacher feedback</div><h2>Evaluasi terakhir</h2></div></div>${assessments.length ? assessments.map(a => `<div class="level-row"><div class="level-number">${a.score}</div><div class="level-info"><strong>${escapeHTML(a.title || 'Karya kaligrafi')}</strong><small>${escapeHTML(a.feedback || 'Tidak ada catatan.')}</small></div>${statusPill('Reviewed')}</div>`).join('') : '<div class="empty-state"><div class="empty-icon">✧</div><strong>Belum ada penilaian</strong>Catatan dan nilai pengajar akan tampil setelah karya diperiksa.</div>'}</section></div>`;
}

function profilePage() {
  return `<div class="page-intro"><div><div class="eyebrow">Account</div><h2>Profil pengguna</h2><p>Informasi sesi dan akun yang sedang digunakan.</p></div></div><div class="card card-pad" style="max-width:650px"><div style="display:flex;align-items:center;gap:14px"><div class="avatar" style="width:58px;height:58px;font-size:17px">${initials(currentName())}</div><div><h3 style="margin:0 0 3px">${escapeHTML(currentName())}</h3><span class="pill gold">${appState.role === 'teacher' ? 'Pengajar' : 'Santri'}</span></div></div><div class="divider"></div><div class="level-row"><div class="level-info"><strong>Nama</strong><small>${escapeHTML(currentName())}</small></div></div><div class="level-row"><div class="level-info"><strong>Email</strong><small>${escapeHTML(appState.profile?.email || appState.user?.email || 'Akun demo lokal')}</small></div></div><div class="level-row"><div class="level-info"><strong>Mode aplikasi</strong><small>${appState.firebaseUser ? 'Firebase Authentication' : 'Demo lokal — data di browser'}</small></div></div><div class="level-row"><div class="level-info"><strong>Peran</strong><small>${appState.role === 'teacher' ? 'Pengajar dengan akses pengelolaan' : 'Santri dengan akses pembelajaran'}</small></div></div><div class="divider"></div><button class="btn btn-secondary" data-action="logout">Keluar dari akun</button></div>`;
}

function teacherDashboard() {
  const state = Store.get();
  const waiting = state.submissions.filter(s => ['Submitted', 'Under Review'].includes(s.status));
  const avg = state.assessments.length ? Math.round(state.assessments.reduce((n,a) => n + (a.score || 0),0) / state.assessments.length) : '—';
  return `<div class="welcome-banner"><div class="eyebrow">Teacher workspace</div><h2>Selamat datang, ${escapeHTML(currentName())}.</h2><p>Kelola materi, pantau santri, dan berikan evaluasi pada karya yang dikumpulkan.</p><button class="btn" data-action="navigate" data-page="submissions">Periksa pengumpulan <span>→</span></button></div>
    <div class="stats-grid"><div class="card stat-card"><div class="stat-icon">▦</div><div><div class="stat-value">${state.classes.length}</div><div class="stat-label">Kelas dikelola</div></div></div><div class="card stat-card"><div class="stat-icon">♙</div><div><div class="stat-value">${state.students.length}</div><div class="stat-label">Data santri contoh</div></div></div><div class="card stat-card"><div class="stat-icon">▧</div><div><div class="stat-value">${waiting.length}</div><div class="stat-label">Menunggu pemeriksaan</div></div></div><div class="card stat-card"><div class="stat-icon">★</div><div><div class="stat-value">${avg}</div><div class="stat-label">Rata-rata nilai</div></div></div></div>
    <div class="dashboard-grid"><section class="card card-pad"><div class="section-heading"><div><div class="eyebrow">Recent submissions</div><h2>Pengumpulan terbaru</h2></div><button class="btn btn-ghost btn-sm" data-action="navigate" data-page="submissions">Lihat semua →</button></div>${waiting.length ? waiting.slice(0,5).map(s => `<div class="level-row"><div class="level-number">✎</div><div class="level-info"><strong>${escapeHTML(s.assignmentTitle || 'Latihan mandiri')}</strong><small>${escapeHTML(s.studentName || 'Santri')} · ${dateText(s.createdAt?.slice(0,10))}</small></div>${statusPill(s.status)}<button class="btn btn-secondary btn-sm" data-action="assess" data-id="${s.id}">Nilai</button></div>`).join('') : '<div class="empty-state"><div class="empty-icon">▧</div><strong>Belum ada pengumpulan</strong>Karya dari santri akan ditampilkan di sini setelah dikirim.</div>'}</section><section class="card card-pad"><div class="section-heading"><div><div class="eyebrow">Class overview</div><h2>Kelas pembelajaran</h2></div></div>${state.classes.map(c => `<div class="level-row"><div class="level-number">▦</div><div class="level-info"><strong>${escapeHTML(c.name)}</strong><small>${escapeHTML(c.level)} · ${c.students} santri</small></div></div>`).join('')}<button class="btn btn-secondary" style="width:100%;margin-top:12px" data-action="navigate" data-page="classes">Kelola kelas</button></section></div>`;
}

function teacherClasses() {
  const classes = Store.get().classes;
  return `<div class="page-intro"><div><div class="eyebrow">Class management</div><h2>Daftar kelas</h2><p>Atur kelompok belajar dan informasi dasar kelas. Pembatasan akses kelas di backend harus diaktifkan pada Rules Firebase.</p></div><button class="btn btn-primary" data-action="new-class">＋ Tambah kelas</button></div><div class="lesson-grid">${classes.map(c => `<div class="card card-pad"><div class="stat-icon">▦</div><h3 style="margin:12px 0 4px;font-size:14px">${escapeHTML(c.name)}</h3><div class="muted small">${escapeHTML(c.level)}</div><div class="divider"></div><div class="lesson-meta"><span>Pengajar: ${escapeHTML(c.teacher)}</span><strong>${c.students} santri</strong></div><button class="btn btn-secondary btn-sm" style="margin-top:13px" data-action="class-detail" data-id="${c.id}">Lihat kelas</button></div>`).join('')}</div>`;
}

function teacherStudents() {
  const students = Store.get().students;
  return `<div class="page-intro"><div><div class="eyebrow">Student management</div><h2>Data santri</h2><p>Data berikut adalah data contoh prototipe. Sinkronisasi daftar pengguna produksi memerlukan koleksi Firestore dan Rules kelas.</p></div></div><div class="card card-pad"><div class="toolbar"><div class="search-box"><span>⌕</span><input id="student-search" placeholder="Cari nama santri..."></div><span class="pill">${students.length} data contoh</span></div><div class="table-wrap"><table><thead><tr><th>Nama santri</th><th>Kelas</th><th>Progres</th><th>Karya terkirim</th><th></th></tr></thead><tbody>${students.map(s => { const cl = Store.get().classes.find(c => c.id === s.classId); return `<tr data-student-row><td><strong>${escapeHTML(s.name)}</strong></td><td>${escapeHTML(cl?.name || '—')}</td><td style="min-width:120px">${progressMarkup(s.progress)}<div class="small muted">${s.progress}%</div></td><td>${s.submitted}</td><td><button class="btn btn-secondary btn-sm" data-action="student-detail" data-id="${s.id}">Detail</button></td></tr>`; }).join('')}</tbody></table></div></div>`;
}

function teacherCurriculum() {
  const lessons = Store.getLessons();
  return `<div class="page-intro"><div><div class="eyebrow">Content management</div><h2>Kurikulum & materi</h2><p>Kelola daftar materi awal dan tambahkan materi baru untuk prototipe lokal.</p></div><button class="btn btn-primary" data-action="new-lesson">＋ Tambah materi</button></div>${curriculum.map(level => `<section class="card card-pad" style="margin-bottom:13px"><div class="section-heading"><div><span class="pill gold">LEVEL ${level.number}</span><h3 style="margin-top:7px">${level.title}</h3><p>${level.description}</p></div><span class="pill">${lessons.filter(l => l.levelId === level.id).length} materi</span></div>${lessons.filter(l => l.levelId === level.id).map(l => `<div class="level-row"><div class="level-number">▤</div><div class="level-info"><strong>${escapeHTML(l.title)}</strong><small>${escapeHTML(l.summary)}</small></div><span class="pill">${l.duration || '20 menit'}</span></div>`).join('')}</section>`).join('')}<section class="card card-pad"><div class="section-heading"><div><h3>Materi tambahan</h3><p>Materi yang dibuat pada prototipe ini.</p></div></div>${(Store.get().customLessons || []).map(l => `<div class="level-row"><div class="level-number">＋</div><div class="level-info"><strong>${escapeHTML(l.title)}</strong><small>${escapeHTML(l.summary)}</small></div><span class="pill gold">${escapeHTML(l.levelTitle)}</span></div>`).join('') || '<div class="small muted">Belum ada materi tambahan.</div>'}</section>`;
}

function teacherAssignments() {
  return `<div class="page-intro"><div><div class="eyebrow">Assignment management</div><h2>Manajemen tugas</h2><p>Buat instruksi tugas dan tetapkan materi serta batas pengumpulan.</p></div><button class="btn btn-primary" data-action="new-assignment">＋ Buat tugas</button></div><div class="card card-pad"><div class="table-wrap"><table><thead><tr><th>Nama tugas</th><th>Materi terkait</th><th>Batas waktu</th><th>Status</th></tr></thead><tbody>${Store.get().assignments.map(a => `<tr><td><strong>${escapeHTML(a.title)}</strong><div class="small muted">${escapeHTML(a.description)}</div></td><td>${escapeHTML(a.level || '—')}</td><td>${dateText(a.due)}</td><td><span class="pill success">Aktif</span></td></tr>`).join('')}</tbody></table></div></div>`;
}

function teacherSubmissions() {
  const subs = Store.get().submissions;
  return `<div class="page-intro"><div><div class="eyebrow">Work review</div><h2>Pengumpulan karya santri</h2><p>Pilih karya untuk memeriksa ketepatan bentuk, proporsi, kaidah, kerapian, dan kreativitas.</p></div></div><div class="card card-pad"><div class="toolbar"><span class="pill warning">${subs.filter(s => ['Submitted','Under Review'].includes(s.status)).length} menunggu review</span><span class="small muted">${subs.length} total pengumpulan</span></div>${subs.length ? `<div class="table-wrap"><table><thead><tr><th>Santri</th><th>Tugas / karya</th><th>Tanggal</th><th>Status</th><th>Nilai</th><th>Aksi</th></tr></thead><tbody>${subs.map(s => `<tr><td><strong>${escapeHTML(s.studentName || 'Santri')}</strong></td><td>${escapeHTML(s.assignmentTitle || 'Latihan mandiri')}</td><td>${dateText(s.createdAt?.slice(0,10))}</td><td>${statusPill(s.status)}</td><td>${s.score ?? '—'}</td><td><button class="btn btn-primary btn-sm" data-action="assess" data-id="${s.id}">${s.status === 'Reviewed' ? 'Lihat / ubah' : 'Periksa karya'}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><div class="empty-icon">▧</div><strong>Belum ada karya yang dikumpulkan</strong>Pengumpulan dari santri akan muncul di halaman ini. Gunakan akun demo santri untuk membuat contoh pengumpulan.</div>'}</div>`;
}

function teacherReports() {
  const students = Store.get().students;
  const average = students.length ? Math.round(students.reduce((n,s) => n + s.progress, 0) / students.length) : 0;
  return `<div class="page-intro"><div><div class="eyebrow">Learning report</div><h2>Laporan perkembangan</h2><p>Ringkasan progres dari data contoh pada penyimpanan lokal.</p></div></div><div class="stats-grid"><div class="card stat-card"><div class="stat-icon">♙</div><div><div class="stat-value">${students.length}</div><div class="stat-label">Santri contoh</div></div></div><div class="card stat-card"><div class="stat-icon">◷</div><div><div class="stat-value">${average}%</div><div class="stat-label">Rata-rata progres contoh</div></div></div><div class="card stat-card"><div class="stat-icon">▧</div><div><div class="stat-value">${Store.get().submissions.length}</div><div class="stat-label">Karya masuk</div></div></div><div class="card stat-card"><div class="stat-icon">★</div><div><div class="stat-value">${Store.get().assessments.length}</div><div class="stat-label">Penilaian tersimpan</div></div></div></div><div class="card card-pad"><div class="section-heading"><div><div class="eyebrow">Class performance</div><h2>Progres santri</h2></div></div>${students.map(s => `<div class="level-row"><div class="avatar">${initials(s.name)}</div><div class="level-info"><strong>${escapeHTML(s.name)}</strong><small>${escapeHTML(Store.get().classes.find(c => c.id === s.classId)?.name || '—')}</small><div style="margin-top:7px">${progressMarkup(s.progress)}</div></div><b>${s.progress}%</b></div>`).join('')}</div>`;
}

function initCanvasPage() {
  const mode = appState.page === 'tracing' ? 'tracing' : 'free';
  initCanvasEngine({
    mode,
    onSave: async dataUrl => {
      Store.saveWork({ studentId: appState.firebaseUser?.uid || 'demo-student', studentName: currentName(), mode, dataUrl, title: mode === 'tracing' ? 'Latihan tracing' : 'Latihan bebas' });
      if (firebaseEnabled && appState.firebaseUser) {
        try { await uploadArtwork(appState.firebaseUser.uid, dataUrl, `latihan-${Date.now()}.png`); toast('PNG diunduh dan salinan karya diunggah ke Firebase Storage.', 'success'); }
        catch (error) { toast('PNG tersimpan lokal, tetapi upload Firebase gagal: ' + error.message, 'error'); }
      } else toast('Karya berhasil disimpan ke perangkat dan daftar karya lokal.', 'success');
    },
    onSubmit: async dataUrl => {
      const assignmentId = document.getElementById('canvas-assignment')?.value || appState.canvasAssignment;
      const assignment = Store.get().assignments.find(a => a.id === assignmentId);
      const submission = Store.addSubmission({
        studentId: appState.firebaseUser?.uid || 'demo-student',
        studentName: currentName(),
        assignmentId: assignment?.id || '',
        assignmentTitle: assignment?.title || (mode === 'tracing' ? 'Latihan tracing mandiri' : 'Latihan bebas'),
        mode, dataUrl, classId: appState.profile?.classId ?? null, status: 'Submitted', score: null
      });
      if (firebaseEnabled && appState.firebaseUser) {
        try {
          const imageUrl = await uploadArtwork(appState.firebaseUser.uid, dataUrl, `${submission.id}.png`);
          await saveCloudSubmission(appState.firebaseUser.uid, { ...submission, dataUrl: null, imageUrl, classId: appState.profile?.classId ?? null });
          toast('Karya dikirim dan disinkronkan ke Firebase.', 'success');
        } catch (error) {
          console.error(error);
          toast('Karya tersimpan lokal, tetapi sinkronisasi Firebase gagal: ' + error.message, 'error');
        }
      } else {
        toast('Karya berhasil dikumpulkan. Pengajar dapat memeriksanya pada panel pengajar di browser ini.', 'success');
      }
      appState.page = 'assignments';
      appState.canvasAssignment = '';
      renderShell();
    }
  });
  document.getElementById('pen-size')?.addEventListener('input', event => { const label = document.getElementById('pen-size-value'); if (label) label.textContent = `${event.target.value} px`; });
  document.getElementById('guide-opacity')?.addEventListener('input', event => { const label = document.getElementById('opacity-value'); if (label) label.textContent = `${event.target.value}%`; });
}

function showModal(title, body, onSubmit) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-modal-close>×</button></div>${body}</div>`;
  document.body.append(backdrop);
  backdrop.addEventListener('click', event => { if (event.target === backdrop || event.target.closest('[data-modal-close]')) backdrop.remove(); });
  const form = backdrop.querySelector('form');
  if (form && onSubmit) form.addEventListener('submit', async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(form).entries()); await onSubmit(data, backdrop); });
  return backdrop;
}

function openAssessModal(submissionId) {
  const sub = Store.get().submissions.find(s => s.id === submissionId);
  if (!sub) return;
  const existing = Store.get().assessments.find(a => a.submissionId === submissionId) || {};
  const rubrics = [
    ['shape', 'Ketepatan bentuk huruf', 30], ['proportion', 'Proporsi dan ukuran', 25], ['rules', 'Ketepatan kaidah khat', 25], ['neatness', 'Kerapian dan konsistensi', 15], ['creativity', 'Kreativitas', 5]
  ];
  const previewSrc = sub.dataUrl || sub.imageUrl;
  const image = previewSrc ? `<div style="padding:10px;background:#f6efe3;border-radius:11px;margin-bottom:14px"><img src="${escapeHTML(previewSrc)}" alt="Karya santri" style="max-height:240px;margin:auto;object-fit:contain"></div>` : '<div class="callout" style="margin-bottom:14px">Pratinjau gambar tidak tersedia pada data ini.</div>';
  const body = `<div class="small muted" style="margin-bottom:10px">${escapeHTML(sub.studentName || 'Santri')} · ${escapeHTML(sub.assignmentTitle || 'Latihan mandiri')}</div>${image}<form id="assessment-form">${rubrics.map(([key,label,weight]) => `<div class="field"><label>${label} <span class="muted">(${weight}%)</span></label><input type="number" name="${key}" min="0" max="100" step="1" value="${existing.rubric?.[key] ?? 80}" required></div>`).join('')}<div class="field"><label>Catatan koreksi pengajar</label><textarea name="feedback" placeholder="Tuliskan apresiasi dan bagian yang perlu diperbaiki...">${escapeHTML(existing.feedback || '')}</textarea></div><div class="field"><label>Status penilaian</label><select name="status"><option value="Reviewed">Reviewed — selesai dinilai</option><option value="Revision Required" ${existing.status === 'Revision Required' ? 'selected' : ''}>Revision Required — perlu revisi</option></select></div><div class="callout" id="score-preview">Nilai akhir dihitung otomatis dari bobot rubrik.</div><button type="submit" class="btn btn-primary" style="width:100%;margin-top:12px">Simpan penilaian</button></form>`;
  const modal = showModal('Penilaian karya', body, async (data, backdrop) => {
    const rubric = { shape: Number(data.shape), proportion: Number(data.proportion), rules: Number(data.rules), neatness: Number(data.neatness), creativity: Number(data.creativity) };
    if (Object.values(rubric).some(n => !Number.isFinite(n) || n < 0 || n > 100)) { toast('Nilai rubrik harus 0–100.', 'error'); return; }
    const score = Math.round(rubric.shape * .30 + rubric.proportion * .25 + rubric.rules * .25 + rubric.neatness * .15 + rubric.creativity * .05);
    Store.addAssessment({ submissionId, studentId: sub.studentId, title: sub.assignmentTitle, rubric, feedback: data.feedback, status: data.status, score, teacherName: currentName() });
    if (firebaseEnabled && appState.firebaseUser) {
      try { await saveCloudAssessment(submissionId, { ...rubric, rubric, feedback: data.feedback, status: data.status, score, teacherId: appState.firebaseUser.uid }); }
      catch (error) { toast('Penilaian tersimpan lokal; sinkronisasi gagal: ' + error.message, 'error'); }
    }
    backdrop.remove(); renderShell(); toast(`Penilaian tersimpan. Nilai akhir: ${score}.`, 'success');
  });
  const form = modal.querySelector('#assessment-form');
  const updatePreview = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    const score = Math.round(Number(data.shape || 0)*.30 + Number(data.proportion || 0)*.25 + Number(data.rules || 0)*.25 + Number(data.neatness || 0)*.15 + Number(data.creativity || 0)*.05);
    modal.querySelector('#score-preview').textContent = `Perkiraan nilai akhir: ${score}/100`;
  };
  form.addEventListener('input', updatePreview);
  updatePreview();
}

function openLessonModal() {
  const options = curriculum.map(l => `<option value="${l.id}">${l.number}. ${l.title}</option>`).join('');
  const body = `<form id="new-lesson-form"><div class="field"><label>Judul materi</label><input name="title" required maxlength="100"></div><div class="field"><label>Level kurikulum</label><select name="levelId">${options}</select></div><div class="field"><label>Teks Arab / contoh</label><input name="arabic" dir="rtl" placeholder="الْخَطُّ الْعَرَبِيُّ"></div><div class="field"><label>Ringkasan materi</label><textarea name="summary" required></textarea></div><div class="field"><label>Penjelasan teori</label><textarea name="theory"></textarea></div><div class="field"><label>Tujuan pembelajaran</label><input name="objective"></div><button class="btn btn-primary" style="width:100%">Simpan materi</button></form>`;
  showModal('Tambah materi baru', body, data => {
    const level = curriculum.find(l => l.id === data.levelId) || curriculum[0];
    Store.update(s => s.customLessons.unshift({ id: `custom-${Date.now()}`, title: data.title, arabic: data.arabic || 'الْخَطُّ', summary: data.summary, theory: data.theory || data.summary, objective: data.objective || 'Memahami dan menerapkan materi.', sample: data.arabic || 'الْخَطُّ', rules: ['Perhatikan contoh.', 'Latih secara bertahap.', 'Evaluasi hasil tulisan.'], duration: '20 menit', levelId: level.id, levelTitle: level.title, levelNumber: level.number }));
    renderShell(); toast('Materi baru ditambahkan pada penyimpanan lokal.', 'success'); document.querySelector('.modal-backdrop')?.remove();
  });
}

function openAssignmentModal() {
  const lessons = Store.getLessons();
  const body = `<form id="new-assignment-form"><div class="field"><label>Judul tugas</label><input name="title" required></div><div class="field"><label>Materi terkait</label><select name="lessonId">${lessons.map(l => `<option value="${l.id}">${escapeHTML(l.title)}</option>`).join('')}</select></div><div class="field"><label>Batas pengumpulan</label><input name="due" type="date" required></div><div class="field"><label>Instruksi</label><textarea name="description" required></textarea></div><button class="btn btn-primary" style="width:100%">Terbitkan tugas</button></form>`;
  showModal('Buat tugas pembelajaran', body, data => {
    const lesson = lessons.find(l => l.id === data.lessonId);
    Store.addAssignment({ ...data, level: lesson?.levelTitle || 'Umum' });
    renderShell(); toast('Tugas berhasil dibuat di penyimpanan lokal.', 'success'); document.querySelector('.modal-backdrop')?.remove();
  });
}

function openClassModal() {
  const body = `<form><div class="field"><label>Nama kelas</label><input name="name" required></div><div class="field"><label>Level</label><select name="level"><option>Level 1</option><option>Level 2–3</option><option>Level 4</option><option>Level 5</option></select></div><div class="field"><label>Nama pengajar</label><input name="teacher" value="${escapeHTML(currentName())}" required></div><button class="btn btn-primary" style="width:100%">Simpan kelas</button></form>`;
  showModal('Tambah kelas', body, data => {
    Store.update(s => s.classes.unshift({ id: `class-${Date.now()}`, name: data.name, level: data.level, teacher: data.teacher, students: 0 }));
    renderShell(); toast('Kelas ditambahkan.', 'success'); document.querySelector('.modal-backdrop')?.remove();
  });
}

async function handleClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'show-register') { renderRegister(); return; }
  if (action === 'show-login') { renderAuth(); return; }
  if (action === 'forgot-password') {
    const email = document.getElementById('login-email')?.value.trim();
    if (!email) { toast('Masukkan email pada kolom login terlebih dahulu.', 'error'); return; }
    try { await sendPasswordReset(email); toast('Tautan pemulihan password dikirim ke email.', 'success'); }
    catch (error) { toast(error.message, 'error'); }
    return;
  }
  if (action === 'demo-login') {
    const role = button.dataset.role;
    appState.role = role;
    appState.profile = { name: role === 'teacher' ? 'Ust. Ahmad' : 'Muhammad Faqih', email: role === 'teacher' ? 'pengajar@demo.local' : 'santri@demo.local', role };
    appState.user = { name: appState.profile.name, email: appState.profile.email };
    appState.firebaseUser = null;
    appState.page = 'dashboard';
    renderShell();
    toast(`Masuk sebagai ${role === 'teacher' ? 'pengajar' : 'santri'} demo.`, 'success');
    return;
  }
  if (action === 'logout') {
    try { await logoutFirebase(); } catch {}
    Object.assign(appState, { user: null, profile: null, role: 'student', page: 'dashboard', firebaseUser: null, selectedLesson: null });
    renderAuth();
    return;
  }
  if (action === 'navigate') {
    appState.page = button.dataset.page;
    appState.selectedLesson = null;
    appState.sidebarOpen = false;
    renderShell();
    return;
  }
  if (action === 'toggle-sidebar') { appState.sidebarOpen = !appState.sidebarOpen; document.getElementById('sidebar')?.classList.toggle('open', appState.sidebarOpen); return; }
  if (action === 'open-lesson') { appState.selectedLesson = button.dataset.id; root.querySelector('#page-content').innerHTML = lessonDetail(); return; }
  if (action === 'complete-lesson') { Store.markCompleted(button.dataset.id); root.querySelector('#page-content').innerHTML = lessonDetail(); toast('Materi ditandai selesai.', 'success'); return; }
  if (action === 'open-tracing') { appState.page = 'tracing'; renderShell(); return; }
  if (action === 'start-assignment') { appState.canvasAssignment = button.dataset.id; appState.page = 'tracing'; renderShell(); return; }
  if (action === 'use-template') { appState.page = 'tracing'; renderShell(); const select = document.getElementById('template-select'); if (select) { const found = [...select.options].find(o => o.value === button.dataset.text); if (found) select.value = found.value; select.dispatchEvent(new Event('change')); } return; }
  if (action === 'new-lesson') { openLessonModal(); return; }
  if (action === 'new-assignment') { openAssignmentModal(); return; }
  if (action === 'new-class') { openClassModal(); return; }
  if (action === 'assess') { openAssessModal(button.dataset.id); return; }
  if (action === 'student-detail') { const s = Store.get().students.find(x => x.id === button.dataset.id); if (s) showModal('Detail santri', `<p><b>${escapeHTML(s.name)}</b></p><p class="muted small">Progres belajar: ${s.progress}%<br>Karya terkumpul: ${s.submitted}</p>`); return; }
  if (action === 'class-detail') { const c = Store.get().classes.find(x => x.id === button.dataset.id); if (c) showModal('Informasi kelas', `<p><b>${escapeHTML(c.name)}</b></p><p class="muted small">Level: ${escapeHTML(c.level)}<br>Pengajar: ${escapeHTML(c.teacher)}<br>Jumlah santri: ${c.students}</p>`); return; }
}

async function handleSubmit(event) {
  const form = event.target;
  if (form.id === 'login-form') {
    event.preventDefault();
    const email = form.querySelector('[type=email]').value.trim();
    const password = form.querySelector('[type=password]').value;
    if (!firebaseEnabled) { toast('Firebase belum dikonfigurasi. Gunakan tombol demo untuk mencoba aplikasi.', 'error'); return; }
    const submit = form.querySelector('[type=submit]'); submit.disabled = true; submit.textContent = 'Memeriksa akun…';
    try {
      const result = await loginWithEmail(email, password);
      appState.firebaseUser = result.user;
      appState.profile = result.profile;
      appState.user = { name: result.profile.name, email };
      appState.role = result.profile.role === 'teacher' ? 'teacher' : 'student';
      const cloudSubs = await loadCloudSubmissions(result.user.uid, appState.role, result.profile.assignedClasses || []);
      Store.mergeCloudSubmissions(cloudSubs);
      const cloudAssessments = await loadCloudAssessments(cloudSubs.map(item => item.id));
      Store.mergeCloudAssessments(cloudAssessments);
      appState.page = 'dashboard'; renderShell(); toast('Berhasil masuk.', 'success');
    } catch (error) { toast(error.message || 'Gagal masuk.', 'error'); submit.disabled = false; submit.textContent = 'Masuk →'; }
  }
  if (form.id === 'register-form') {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!firebaseEnabled) { toast('Registrasi online membutuhkan konfigurasi Firebase. Gunakan mode demo untuk menjelajahi prototipe.', 'error'); return; }
    try {
      const result = await registerStudent(data);
      appState.firebaseUser = result.user; appState.profile = result.profile; appState.user = { name: data.name, email: data.email }; appState.role = 'student'; appState.page = 'dashboard';
      renderShell(); toast('Akun santri berhasil dibuat.', 'success');
    } catch (error) { toast(error.message || 'Registrasi gagal.', 'error'); }
  }
}

root.addEventListener('click', handleClick);
root.addEventListener('submit', handleSubmit);
root.addEventListener('input', event => {
  if (event.target.id === 'student-search') {
    const value = event.target.value.toLowerCase();
    document.querySelectorAll('[data-student-row]').forEach(row => row.style.display = row.textContent.toLowerCase().includes(value) ? '' : 'none');
  }
});

if (location.protocol === 'file:') {
  renderAuth();
  toast('Jalankan melalui Live Server atau hosting agar JavaScript Modules dan PWA bekerja.', 'error');
} else {
  renderAuth();
}
