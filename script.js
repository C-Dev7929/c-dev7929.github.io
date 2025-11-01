// script.js — phiên bản sửa so sánh "A." với "A"

let quizData = [];
let currentQuestionIndex = 0;
let correctCount = 0;
let incorrectCount = 0;
let startTime = null;

function getFileName() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('file') || 'input.json';
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function loadQuizData() {
  const fileName = getFileName();
  try {
    const resp = await fetch(fileName);
    if (!resp.ok) throw new Error(`Không thể tải file: ${fileName}`);

    quizData = await resp.json();
    shuffleArray(quizData);
    startTime = Date.now();
    displayQuestion();
  } catch (err) {
    document.getElementById('question-area').innerHTML =
      `<p style="color:red">${err.message}</p>`;
  }
}

function displayQuestion() {
  if (currentQuestionIndex >= quizData.length) {
    showResults();
    return;
  }

  const q = quizData[currentQuestionIndex];
  const qArea = document.getElementById('question-area');
  const exArea = document.getElementById('explanation-area');
  qArea.innerHTML = '';
  exArea.innerHTML = '';

  const p = document.createElement('p');
  p.textContent = `Câu ${currentQuestionIndex + 1}/${quizData.length}: ${q.cauhoi}`;
  qArea.appendChild(p);

  const answersDiv = document.createElement('div');
  answersDiv.className = 'answers';
  const answers = q.cac_dap_an.split('|').map(a => a.trim());

  answers.forEach(answer => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = answer;
    btn.onclick = () => checkAnswer(answer, q);
    answersDiv.appendChild(btn);
  });

  qArea.appendChild(answersDiv);
}

function checkAnswer(chosenAnswer, question) {
  document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

  // Cắt ký tự đầu nếu dạng "A." để lấy mã lựa chọn
  const getKey = s => {
    const trimmed = s.trim();
    return trimmed.includes('.') ? trimmed.split('.')[0].toLowerCase() : trimmed.toLowerCase();
  };

  const chosenKey = getKey(chosenAnswer);
  const correctKey = getKey(question.dap_an_dung);

  const isCorrect = chosenKey === correctKey;

  const exArea = document.getElementById('explanation-area');
  exArea.innerHTML = '';

  const resultP = document.createElement('p');
  resultP.style.fontWeight = 'bold';

  if (isCorrect) {
    correctCount++;
    resultP.textContent = `✅ Đúng rồi! Đáp án đúng: ${question.dap_an_dung}`;
    resultP.style.color = 'green';
  } else {
    incorrectCount++;
    resultP.textContent = `❌ Sai! Đáp án đúng là: ${question.dap_an_dung}`;
    resultP.style.color = 'red';
  }

  exArea.appendChild(resultP);
  const explain = document.createElement('p');
  explain.textContent = `Giải thích: ${question.giaithich}`;
  exArea.appendChild(explain);

  const nextBtn = document.createElement('button');
  nextBtn.textContent = currentQuestionIndex + 1 < quizData.length ? 'Câu tiếp theo >>' : 'Xem kết quả';
  nextBtn.onclick = () => {
    currentQuestionIndex++;
    displayQuestion();
  };
  exArea.appendChild(nextBtn);
}

function showResults() {
  const timeTaken = Math.floor((Date.now() - startTime) / 1000);
  document.getElementById('question-area').style.display = 'none';
  document.getElementById('explanation-area').style.display = 'none';
  const result = document.getElementById('result-area');
  result.style.display = 'block';
  document.getElementById('time-taken').textContent = `⏱️ Hoàn thành trong ${timeTaken} giây`;
  document.getElementById('score').innerHTML =
    `🟢 Đúng: ${correctCount}<br>🔴 Sai: ${incorrectCount}`;
}

window.onload = loadQuizData;
