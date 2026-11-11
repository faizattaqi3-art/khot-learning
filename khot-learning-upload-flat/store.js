import { curriculum, seedAssignments } from './data.js';

const STORAGE_KEY = 'khot-learning-v1';

function freshState() {
  return {
    completedLessons: ['l1-1', 'l1-2'],
    customLessons: [],
    assignments: seedAssignments,
    submissions: [],
    assessments: [],
    savedWorks: [],
    classes: [
      { id: 'kelas-a', name: 'Kelas Khat Dasar A', teacher: 'Ust. Ahmad', students: 18, level: 'Level 1' },
      { id: 'kelas-b', name: 'Kelas Khat Menengah', teacher: 'Ust. Ahmad', students: 12, level: 'Level 2–3' }
    ],
    students: [
      { id: 's-001', name: 'Muhammad Faqih', classId: 'kelas-a', progress: 68, submitted: 3 },
      { id: 's-002', name: 'Abdullah Farhan', classId: 'kelas-a', progress: 52, submitted: 2 },
      { id: 's-003', name: 'Ahmad Zaid', classId: 'kelas-b', progress: 81, submitted: 5 },
      { id: 's-004', name: 'Hasan Rasyid', classId: 'kelas-b', progress: 43, submitted: 1 }
    ],
    announcements: [
      { id: 'n1', title: 'Selamat datang di KHOT Learning', text: 'Mulailah dari materi dasar dan lakukan latihan secara rutin.', date: '2026-11-04' }
    ]
  };
}

function normalizeState(value) {
  const fresh = freshState();
  return { ...fresh, ...(value || {}), assignments: value?.assignments || fresh.assignments };
}

let state;
try { state = normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
catch { state = freshState(); }

export const Store = {
  get() { return state; },
  persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); },
  reset() { state = freshState(); this.persist(); return state; },
  update(mutator) { mutator(state); this.persist(); return state; },
  isCompleted(lessonId) { return state.completedLessons.includes(lessonId); },
  markCompleted(lessonId) { this.update(s => { if (!s.completedLessons.includes(lessonId)) s.completedLessons.push(lessonId); }); },
  getLessons() { return [...curriculum.flatMap(level => level.lessons.map(lesson => ({ ...lesson, levelId: level.id, levelTitle: level.title, levelNumber: level.number }))), ...(state.customLessons || [])]; },
  getLesson(lessonId) { return this.getLessons().find(lesson => lesson.id === lessonId); },
  addAssignment(assignment) { this.update(s => s.assignments.unshift({ id: `a-${Date.now()}`, status: 'active', ...assignment })); },
  addSubmission(submission) {
    const item = { id: `sub-${Date.now()}`, createdAt: new Date().toISOString(), status: 'Submitted', ...submission };
    this.update(s => s.submissions.unshift(item));
    return item;
  },
  updateSubmission(id, changes) { this.update(s => { const item = s.submissions.find(x => x.id === id); if (item) Object.assign(item, changes); }); },
  mergeCloudSubmissions(items = []) { this.update(s => { const map = new Map(s.submissions.map(item => [item.id, item])); items.forEach(item => map.set(item.id, { ...map.get(item.id), ...item })); s.submissions = [...map.values()].sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))); }); },
  mergeCloudAssessments(items = []) { this.update(s => { const map = new Map(s.assessments.map(item => [item.id, item])); items.forEach(item => map.set(item.id, { ...map.get(item.id), ...item })); s.assessments = [...map.values()]; }); },
  addAssessment(assessment) {
    const item = { id: `ass-${Date.now()}`, createdAt: new Date().toISOString(), ...assessment };
    this.update(s => { s.assessments = s.assessments.filter(x => x.submissionId !== assessment.submissionId); s.assessments.unshift(item); });
    const sub = state.submissions.find(x => x.id === assessment.submissionId);
    if (sub) { sub.status = assessment.status || 'Reviewed'; sub.score = assessment.score; }
    this.persist();
    return item;
  },
  saveWork(work) { const item = { id: `work-${Date.now()}`, createdAt: new Date().toISOString(), ...work }; this.update(s => s.savedWorks.unshift(item)); return item; }
};

export function getLearningProgress() {
  const all = Store.getLessons();
  const done = state.completedLessons.length;
  return { total: all.length, done, percent: Math.round((done / all.length) * 100) };
}
