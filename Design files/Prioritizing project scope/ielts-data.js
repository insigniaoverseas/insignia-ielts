// Shared content + scoring for the IELTS practice platform screens.
export const TEST = {
  name: "Listening Mock Test 2",
  skill: "Listening",
  mode: "mock",
  minutes: 30,
  sections: [
    { n: 1, title: "A phone call about a sports club", from: 1, to: 10 },
    { n: 2, title: "A talk about a community garden", from: 11, to: 20 },
    { n: 3, title: "Two students discussing a project", from: 21, to: 30 },
    { n: 4, title: "A lecture on urban beekeeping", from: 31, to: 40 }
  ]
};

const t = (n, section, prompt, answer, hint) => ({ n, section, type: "text", prompt, answer, hint: hint || "Write one or two words, or a number." });
const r = (n, section, prompt, options, answer) => ({ n, section, type: "radio", prompt, options, answer });
const tf = (n, section, prompt, answer) => ({ n, section, type: "tfng", prompt, options: ["True", "False", "Not Given"], answer });
const m = (n, section, prompt, options, answer) => ({ n, section, type: "match", prompt, options, answer });

export const QUESTIONS = [
  t(1, 1, "Club name: Riverside <strong>1</strong> ______ Club", "Tennis"),
  t(2, 1, "Address: 14 <strong>2</strong> ______ Road", "Marsh"),
  t(3, 1, "Nearest station: <strong>3</strong> ______", "Kingsway"),
  t(4, 1, "Membership costs £<strong>4</strong> ______ a year", "85"),
  t(5, 1, "Courts are open until <strong>5</strong> ______ on weekdays", "9 p.m."),
  t(6, 1, "Beginners' lessons start in <strong>6</strong> ______", "April"),
  t(7, 1, "Members must bring their own <strong>7</strong> ______", "racket"),
  r(8, 1, "How did the caller hear about the club?", ["A poster at the library", "A friend at work", "The club website"], "A friend at work"),
  r(9, 1, "What does the caller want to book first?", ["A private lesson", "A court on Saturday", "A tour of the club"], "A tour of the club"),
  t(10, 1, "The caller will be sent a form by <strong>10</strong> ______", "email"),

  t(11, 2, "The garden opened in <strong>11</strong> ______", "1974"),
  t(12, 2, "It is funded by the <strong>12</strong> ______ council", "city"),
  t(13, 2, "There are <strong>13</strong> ______ plots in total", "48"),
  r(14, 2, "Who may use the shared tools?", ["Any visitor", "Plot holders only", "Staff only"], "Plot holders only"),
  r(15, 2, "The Saturday session is aimed at", ["children", "new gardeners", "experienced growers"], "new gardeners"),
  r(16, 2, "What has recently been added?", ["A greenhouse", "A pond", "A café"], "A pond"),
  m(17, 2, "The compost area", ["A — behind the shed", "B — near the gate", "C — by the pond"], "A — behind the shed"),
  m(18, 2, "The tool store", ["A — behind the shed", "B — near the gate", "C — by the pond"], "B — near the gate"),
  m(19, 2, "The seating area", ["A — behind the shed", "B — near the gate", "C — by the pond"], "C — by the pond"),
  t(20, 2, "Visitors should report problems to the <strong>20</strong> ______", "warden"),

  r(21, 3, "What is the students' project about?", ["Water use in cities", "Noise in classrooms", "Bus routes"], "Water use in cities"),
  r(22, 3, "Why does Sam want to change the title?", ["It is too long", "It is too general", "It repeats the module name"], "It is too general"),
  r(23, 3, "What surprised Maya about the survey?", ["The low response rate", "The number of older people", "How honest people were"], "The low response rate"),
  r(24, 3, "They agree to collect more data by", ["visiting households", "posting online", "using library records"], "posting online"),
  t(25, 3, "The interim report is due in week <strong>25</strong> ______", "7"),
  t(26, 3, "Sam will write the section on <strong>26</strong> ______", "methods"),
  t(27, 3, "Maya will prepare the <strong>27</strong> ______", "charts"),
  m(28, 3, "Dr Malik will advise on", ["A — statistics", "B — rainfall data", "C — interview design"], "A — statistics"),
  m(29, 3, "Prof Osei will advise on", ["A — statistics", "B — rainfall data", "C — interview design"], "B — rainfall data"),
  m(30, 3, "Ms Reyes will advise on", ["A — statistics", "B — rainfall data", "C — interview design"], "C — interview design"),

  tf(31, 4, "City hives produce more honey on average than rural hives.", "True"),
  tf(32, 4, "Beekeeping licences are required in every European country.", "False"),
  tf(33, 4, "The speaker has kept bees for more than twenty years.", "Not Given"),
  tf(34, 4, "Warmer city temperatures lengthen the flowering season.", "True"),
  tf(35, 4, "Most city hives are placed on rooftops for safety reasons.", "Not Given"),
  t(36, 4, "The first city apiary was recorded in <strong>36</strong> ______", "1936"),
  t(37, 4, "Bees travel up to <strong>37</strong> ______ kilometres to forage", "3"),
  t(38, 4, "The main threat named by the speaker is loss of <strong>38</strong> ______", "habitat"),
  r(39, 4, "What does the speaker recommend city councils do first?", ["Fund new hives", "Plant more wildflowers", "Train inspectors"], "Plant more wildflowers"),
  r(40, 4, "The talk ends with a warning about", ["disease spreading between hives", "falling honey prices", "untrained keepers"], "disease spreading between hives")
];

export const norm = (v) => String(v == null ? "" : v).trim().toLowerCase().replace(/\s+/g, " ").replace(/[.]$/, "");

export const isCorrect = (q, given) => norm(given) === norm(q.answer);

export function bandFor(raw) {
  if (raw >= 39) return 9;
  if (raw >= 37) return 8.5;
  if (raw >= 35) return 8;
  if (raw >= 32) return 7.5;
  if (raw >= 30) return 7;
  if (raw >= 26) return 6.5;
  if (raw >= 23) return 6;
  if (raw >= 18) return 5.5;
  if (raw >= 16) return 5;
  if (raw >= 13) return 4.5;
  if (raw >= 10) return 4;
  return 3.5;
}

export function descriptorFor(band) {
  if (band >= 8.5) return "Expert user";
  if (band >= 7.5) return "Very good user";
  if (band >= 6.5) return "Good user";
  if (band >= 5.5) return "Competent user";
  if (band >= 4.5) return "Modest user";
  return "Limited user";
}

export const STORAGE_KEY = "ielts.attempt.listening2";

// Used by Result / Review when opened directly, so those screens always have something to show.
export function demoAttempt() {
  const answers = {};
  QUESTIONS.forEach((q, i) => {
    const wrong = [3, 8, 13, 17, 24, 31, 35, 38].includes(q.n);
    if (wrong) {
      if (q.options) answers[q.n] = q.options.find((o) => norm(o) !== norm(q.answer));
      else answers[q.n] = ["nine", "twelve", "March", "the gate", "1963", "two"][i % 6];
    } else {
      answers[q.n] = q.answer;
    }
  });
  return { answers, flags: [17, 24], timeTakenSec: 1587, submittedAt: null, demo: true };
}

export function scoreAttempt(attempt) {
  const answers = (attempt && attempt.answers) || {};
  const rows = QUESTIONS.map((q) => ({ q, given: answers[q.n], ok: isCorrect(q, answers[q.n]) }));
  const raw = rows.filter((row) => row.ok).length;
  const band = bandFor(raw);
  const bySection = TEST.sections.map((s) => {
    const inSection = rows.filter((row) => row.q.section === s.n);
    return { section: s, correct: inSection.filter((row) => row.ok).length, total: inSection.length };
  });
  return { rows, raw, band, descriptor: descriptorFor(band), bySection, total: QUESTIONS.length };
}

export function loadAttempt() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return demoAttempt();
}
