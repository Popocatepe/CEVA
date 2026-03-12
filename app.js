const STORAGE_KEY = "creativeResearchProjectV2";
const DB_NAME = "creativeResearchDB";
const DB_STORE = "audio";

const QUESTIONS = [
  "Ce emoție dominantă am simțit înainte de realizarea fotografiei?",
  "De ce am ales acest obiect?",
  "Ce mesaj sau stare am intenționat să transmit?",
  "Ce elemente tehnice și estetice am folosit pentru a susține acest mesaj?",
  "Care este contextul personal/afectiv al relației mele cu obiectul?",
  "Ce emoție am simțit când am văzut fotografia finală?",
  "În ce măsură fotografia finală corespunde intenției mele inițiale?",
  "Unde cred că se află emoția dominantă a imaginii: în obiect, în fotografie sau în relația mea cu obiectul?"
];

const FRAME_TEMPLATES = [
  { key: "natural", label: "Cadru natural" },
  { key: "neutru", label: "Cadru neutru" },
  { key: "controlat", label: "Cadru controlat" }
];

const projectForm = document.getElementById("project-form");
const projectNameEl = document.getElementById("project-name");
const objectNameEl = document.getElementById("object-name");
const projectDescriptionEl = document.getElementById("project-description");
const framesEl = document.getElementById("frames");
const questionProgressEl = document.getElementById("question-progress");
const questionnaireEl = document.getElementById("questionnaire");
const activeFrameTitleEl = document.getElementById("active-frame-title");
const photoPreviewEl = document.getElementById("photo-preview");
const currentQuestionEl = document.getElementById("current-question");
const answerTextEl = document.getElementById("answer-text");
const recordBtn = document.getElementById("record-btn");
const stopBtn = document.getElementById("stop-btn");
const speechBtn = document.getElementById("speech-btn");
const saveNextBtn = document.getElementById("save-next-btn");
const recordingStatusEl = document.getElementById("recording-status");
const answerAudioEl = document.getElementById("answer-audio");
const exportJsonBtn = document.getElementById("export-json-btn");
const resetBtn = document.getElementById("reset-btn");

let state = createEmptyState();
let activeFrameIndex = null;
let mediaRecorder = null;
let mediaChunks = [];
let currentAudioId = null;
let currentAudioUrl = null;

function createEmptyState() {
  return {
    projectName: "",
    objectName: "",
    description: "",
    frames: FRAME_TEMPLATES.map((item) => ({
      key: item.key,
      label: item.label,
      photoName: "",
      photoDataUrl: "",
      answers: [],
      completed: false
    }))
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    const fresh = createEmptyState();
    state.projectName = parsed.projectName || "";
    state.objectName = parsed.objectName || "";
    state.description = parsed.description || "";
    state.frames = fresh.frames.map((frame, index) => {
      const src = parsed.frames?.[index] || {};
      return {
        ...frame,
        photoName: src.photoName || "",
        photoDataUrl: src.photoDataUrl || "",
        answers: Array.isArray(src.answers) ? src.answers : [],
        completed: Boolean(src.completed)
      };
    });
  } catch {
    state = createEmptyState();
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putAudioBlob(blob) {
  const db = await openDb();
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put({ id, blob, createdAt: Date.now() });
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

async function getAudioBlob(id) {
  if (!id) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const request = tx.objectStore(DB_STORE).get(id);
    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => reject(request.error);
  });
}

async function clearAudioDb() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function isFrameUnlocked(index) {
  return index === 0 || state.frames[index - 1].completed;
}

function renderProjectFields() {
  projectNameEl.value = state.projectName;
  objectNameEl.value = state.objectName;
  projectDescriptionEl.value = state.description;
}

function renderFrames() {
  framesEl.innerHTML = "";

  state.frames.forEach((frame, index) => {
    const unlocked = isFrameUnlocked(index);
    const li = document.createElement("li");
    li.className = `frame-card ${frame.completed ? "done" : ""}`;

    const answeredCount = frame.answers.length;
    li.innerHTML = `
      <div class="frame-head">
        <strong>${index + 1}. ${frame.label}</strong>
        <span class="badge ${frame.completed ? "done" : ""}">${frame.completed ? "Finalizat" : `${answeredCount}/${QUESTIONS.length} răspunsuri`}</span>
      </div>
      <label>
        Fotografie (${frame.label})
        <input type="file" accept="image/*" ${unlocked ? "" : "disabled"} />
      </label>
      <p class="hint">${frame.photoName ? `Fișier: ${frame.photoName}` : "Nu ai încărcat fotografie."}</p>
      <button type="button" ${unlocked && frame.photoDataUrl && !frame.completed ? "" : "disabled"}>${frame.answers.length > 0 ? "Continuă chestionarul" : "Începe chestionarul"}</button>
    `;

    const fileInput = li.querySelector("input[type='file']");
    const startBtn = li.querySelector("button");

    fileInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      frame.photoName = file.name;
      frame.photoDataUrl = dataUrl;
      saveState();
      renderFrames();
    });

    startBtn.addEventListener("click", () => {
      activeFrameIndex = index;
      currentAudioId = null;
      setCurrentAudio(null);
      renderQuestionnaire();
    });

    framesEl.appendChild(li);
  });
}

function renderQuestionnaire() {
  if (activeFrameIndex === null) {
    questionnaireEl.classList.add("hidden");
    questionProgressEl.textContent = "Selectează un cadru activ pentru a începe.";
    return;
  }

  const frame = state.frames[activeFrameIndex];
  const nextQuestionIndex = frame.answers.length;

  if (frame.completed || nextQuestionIndex >= QUESTIONS.length) {
    frame.completed = true;
    saveState();
    activeFrameIndex = null;
    renderFrames();
    renderQuestionnaire();
    return;
  }

  questionnaireEl.classList.remove("hidden");
  activeFrameTitleEl.textContent = `${frame.label} — ${state.objectName || "Obiect personal"}`;
  photoPreviewEl.src = frame.photoDataUrl;
  currentQuestionEl.textContent = `Întrebarea ${nextQuestionIndex + 1}/${QUESTIONS.length}: ${QUESTIONS[nextQuestionIndex]}`;
  questionProgressEl.textContent = "Trebuie să salvezi răspunsul curent pentru a continua la următoarea întrebare.";
  answerTextEl.value = "";
  recordingStatusEl.textContent = "Pentru fiecare întrebare: înregistrează audio și completează transcrierea în text.";

  currentAudioId = null;
  setCurrentAudio(null);
}

function setCurrentAudio(url) {
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
  }
  currentAudioUrl = url;
  if (url) {
    answerAudioEl.src = url;
    answerAudioEl.classList.remove("hidden");
  } else {
    answerAudioEl.removeAttribute("src");
    answerAudioEl.classList.add("hidden");
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    recordingStatusEl.textContent = "Browserul nu suportă înregistrarea audio.";
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  mediaChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) mediaChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const blob = new Blob(mediaChunks, { type: "audio/webm" });
    currentAudioId = await putAudioBlob(blob);
    setCurrentAudio(URL.createObjectURL(blob));
    stream.getTracks().forEach((track) => track.stop());
    recordingStatusEl.textContent = "Audio salvat pentru această întrebare.";
  };

  mediaRecorder.start();
  recordBtn.disabled = true;
  stopBtn.disabled = false;
  recordingStatusEl.textContent = "Înregistrare în curs...";
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

function runSpeechToText() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    recordingStatusEl.textContent = "Transcrierea automată nu este disponibilă în acest browser.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "ro-RO";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    recordingStatusEl.textContent = "Dictare activă... vorbește acum.";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript || "";
    answerTextEl.value = answerTextEl.value ? `${answerTextEl.value} ${transcript}` : transcript;
    recordingStatusEl.textContent = "Transcriere adăugată în câmpul text.";
  };

  recognition.onerror = () => {
    recordingStatusEl.textContent = "Transcrierea a eșuat. Poți completa manual textul.";
  };

  recognition.start();
}

function saveAnswerAndGoNext() {
  if (activeFrameIndex === null) return;

  const frame = state.frames[activeFrameIndex];
  const text = answerTextEl.value.trim();

  if (!text) {
    recordingStatusEl.textContent = "Trebuie să completezi răspunsul în text înainte de a continua.";
    return;
  }

  if (!currentAudioId) {
    recordingStatusEl.textContent = "Trebuie să înregistrezi audio pentru această întrebare înainte de a continua.";
    return;
  }

  const questionIndex = frame.answers.length;
  frame.answers.push({
    question: QUESTIONS[questionIndex],
    text,
    audioId: currentAudioId
  });

  if (frame.answers.length === QUESTIONS.length) {
    frame.completed = true;
    questionProgressEl.textContent = `${frame.label} a fost finalizat. Poți continua cu următorul cadru.`;
    activeFrameIndex = null;
    questionnaireEl.classList.add("hidden");
  }

  saveState();
  renderFrames();

  if (activeFrameIndex !== null) {
    renderQuestionnaire();
  }
}

async function exportProjectJson() {
  const exportPayload = {
    projectName: state.projectName,
    objectName: state.objectName,
    description: state.description,
    exportedAt: new Date().toISOString(),
    frames: []
  };

  for (const frame of state.frames) {
    const answers = [];
    for (const answer of frame.answers) {
      const blob = await getAudioBlob(answer.audioId);
      const base64Audio = blob ? await fileToDataUrl(blob) : null;
      answers.push({ ...answer, audioDataUrl: base64Audio });
    }
    exportPayload.frames.push({ ...frame, answers });
  }

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${state.projectName || "proiect-cercetare"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function resetAll() {
  state = createEmptyState();
  activeFrameIndex = null;
  localStorage.removeItem(STORAGE_KEY);
  await clearAudioDb();
  renderProjectFields();
  renderFrames();
  renderQuestionnaire();
}

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.projectName = projectNameEl.value.trim();
  state.objectName = objectNameEl.value.trim();
  state.description = projectDescriptionEl.value.trim();
  saveState();
  questionProgressEl.textContent = "Proiect salvat. Încarcă fotografia pentru primul cadru.";
});

recordBtn.addEventListener("click", startRecording);
stopBtn.addEventListener("click", stopRecording);
speechBtn.addEventListener("click", runSpeechToText);
saveNextBtn.addEventListener("click", saveAnswerAndGoNext);
exportJsonBtn.addEventListener("click", exportProjectJson);
resetBtn.addEventListener("click", resetAll);

loadState();
renderProjectFields();
renderFrames();
renderQuestionnaire();
