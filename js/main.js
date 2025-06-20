import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAyVRYYHVP0Fl4y15Dd4F1nsbKjjIwUIxI",
    authDomain: "simulado-nova-v2.firebaseapp.com",
    projectId: "simulado-nova-v2",
    storageBucket: "simulado-nova-v2.appspot.com",
    messagingSenderId: "1051282450034",
    appId: "1:1051282450034:web:4a2155324666f0bd3ec4eb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "simulado-nova-v2";

// Autenticação anônima
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await fetchAllQuestions();
    } else {
        signInAnonymously(auth).catch(error => {
            console.error("Anonymous sign-in error:", error);
            if (startBtn) startBtn.textContent = 'Erro de Autenticação';
        });
    }
});

// Variáveis globais
let allQuestions = [];
let sessionQuizData = [];
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = [];
let studentName = "";
let unsubscribeAdminResults = null;
let unsubscribeAdminQuestions = null;
let quizStartTime = null;
let timerInterval = null;
let questionIdToDelete = null;

// Referências DOM - serão inicializadas após o carregamento
let startBtn, nameInput;

// Sound Effects
const correctSynth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 } }).toDestination();
const incorrectSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 1 } }).toDestination();
const passSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 } }).toDestination();

// Funções principais
function showView(viewId) {
    const quizContainer = document.getElementById('quiz-container');
    const adminLoginScreen = document.getElementById('admin-login-screen');
    const adminPanelScreen = document.getElementById('admin-panel-screen');
    
    [quizContainer, adminLoginScreen, adminPanelScreen].forEach(el => {
        if (el) el.classList.add('hidden');
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.remove('hidden');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function formatDuration(ms) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

async function fetchAllQuestions() {
    if (startBtn) {
        startBtn.textContent = 'Carregando Perguntas...';
        startBtn.disabled = true;
        startBtn.classList.add('btn-disabled');
    }
    
    try {
const questionsCol = collection(db, "artifacts", appId, "public", "data", "questions");
        const snapshot = await getDocs(questionsCol);
        if (snapshot.empty) {
            await seedInitialQuestions();
            const newSnapshot = await getDocs(questionsCol);
            allQuestions = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
    } catch (error) {
        console.error("Error fetching questions:", error);
        if (startBtn) startBtn.textContent = 'Erro ao Carregar';
        return;
    }
    
    if (startBtn) {
        startBtn.textContent = 'Começar o Simulado';
    }
    if (nameInput) {
        nameInput.disabled = false;
        
        // Habilita o botão se já tem nome
        if (nameInput.value.trim() !== '') {
            startBtn.disabled = false;
            startBtn.classList.remove('btn-disabled');
        }
    }
}

function generateRandomQuiz() {
    const activeQuestions = allQuestions.filter(q => q.active !== false);
    const questionsByCat = {
        legislacao: activeQuestions.filter(q => q.category === 'legislacao'),
        direcao: activeQuestions.filter(q => q.category === 'direcao'),
        socorros: activeQuestions.filter(q => q.category === 'socorros'),
        meio_ambiente: activeQuestions.filter(q => q.category === 'meio_ambiente'),
        mecanica: activeQuestions.filter(q => q.category === 'mecanica'),
    };
    
    for (const cat in questionsByCat) shuffleArray(questionsByCat[cat]);
    
    const selectedQuestions = [
        ...questionsByCat.legislacao.slice(0, 13),
        ...questionsByCat.direcao.slice(0, 12),
        ...questionsByCat.socorros.slice(0, 2),
        ...questionsByCat.meio_ambiente.slice(0, 2),
        ...questionsByCat.mecanica.slice(0, 1),
    ];
    
    shuffleArray(selectedQuestions);
    return selectedQuestions;
}

function startTimer() {
    if(timerInterval) clearInterval(timerInterval);
    quizStartTime = new Date();
    timerInterval = setInterval(() => {
        const now = new Date();
        const elapsedTime = now - quizStartTime;
        const timerDisplay = document.getElementById('timer');
        if (timerDisplay) {
            timerDisplay.innerText = `Tempo: ${formatDuration(elapsedTime)}`;
        }
    }, 1000);
}

function startQuiz() {
    const nameInput = document.getElementById('name-input');
    studentName = nameInput ? nameInput.value.trim() : "";
    if (!studentName || allQuestions.length === 0) return;
    
    Tone.start();
    startTimer();
    sessionQuizData = generateRandomQuiz();
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    
    const startScreen = document.getElementById('start-screen');
    const resultScreen = document.getElementById('result-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const nextBtn = document.getElementById('next-btn');
    
    if (startScreen) startScreen.classList.add('hidden');
    if (resultScreen) resultScreen.classList.add('hidden');
    if (quizScreen) quizScreen.classList.remove('hidden');
    if (nextBtn) nextBtn.classList.add('hidden');
    
    showQuestion();
}

function showQuestion() {
    resetState();
    const question = sessionQuizData[currentQuestionIndex];
    const questionNumber = currentQuestionIndex + 1;
    
    const questionText = document.getElementById('question-text');
    const questionCounter = document.getElementById('question-counter');
    const scoreCounter = document.getElementById('score-counter');
    const progressBar = document.getElementById('progress-bar');
    const optionsContainer = document.getElementById('options-container');
    
    if (questionText) questionText.innerText = question.question;
    if (questionCounter) questionCounter.innerText = `Questão ${questionNumber} de ${sessionQuizData.length}`;
    if (scoreCounter) scoreCounter.innerText = `Acertos: ${score}`;
    if (progressBar) progressBar.style.width = `${(questionNumber / sessionQuizData.length) * 100}%`;

    if (optionsContainer) {
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.innerHTML = `
                <span class="flex-grow">${option}</span>
                <span class="feedback-icon correct-icon text-green-400">✓</span>
                <span class="feedback-icon incorrect-icon text-red-400">✗</span>
            `;
            button.classList.add('w-full', 'text-left', 'p-4', 'rounded-lg', 'border', 'flex', 'items-center', 'option-btn');
            button.dataset.index = index;
            button.addEventListener('click', selectAnswer);
            optionsContainer.appendChild(button);
        });
    }
}

function resetState() {
    const nextBtn = document.getElementById('next-btn');
    const confettiContainer = document.getElementById('confetti-container');
    const optionsContainer = document.getElementById('options-container');
    
    if (nextBtn) nextBtn.classList.add('hidden');
    if (confettiContainer) confettiContainer.innerHTML = '';
    if (optionsContainer) {
        while (optionsContainer.firstChild) {
            optionsContainer.removeChild(optionsContainer.firstChild);
        }
    }
}

function selectAnswer(e) {
    const selectedBtn = e.currentTarget;
    const selectedAnswerIndex = parseInt(selectedBtn.dataset.index);
    const question = sessionQuizData[currentQuestionIndex];
    const isCorrect = selectedAnswerIndex === question.answer;
    const scoreCounter = document.getElementById('score-counter');
    const nextBtn = document.getElementById('next-btn');
    const optionsContainer = document.getElementById('options-container');

    userAnswers.push({
        question: question.question,
        options: question.options,
        selected: selectedAnswerIndex,
        correct: question.answer,
        explanation: question.explanation
    });

    if (isCorrect) {
        score++;
        correctSynth.triggerAttackRelease("C5", "8n", Tone.now());
        if (scoreCounter) {
            scoreCounter.classList.add('score-pop');
            setTimeout(() => scoreCounter.classList.remove('score-pop'), 300);
        }
    } else {
        incorrectSynth.triggerAttackRelease("C3", "8n", Tone.now());
    }
    
    selectedBtn.classList.add(isCorrect ? 'correct' : 'incorrect');

    if (optionsContainer) {
        Array.from(optionsContainer.children).forEach(button => {
            const buttonIndex = parseInt(button.dataset.index);
            if (buttonIndex === question.answer) button.classList.add('correct');
            button.disabled = true;
        });
    }
    
    if (scoreCounter) scoreCounter.innerText = `Acertos: ${score}`;
    if (nextBtn) nextBtn.classList.remove('hidden');
}

function showNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < sessionQuizData.length) {
        showQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');
    
    if (quizScreen) quizScreen.classList.add('hidden');
    if (resultScreen) resultScreen.classList.remove('hidden');
    
    clearInterval(timerInterval);
    
    const quizEndTime = new Date();
    const duration = quizEndTime - quizStartTime;
    
    const totalQuestions = sessionQuizData.length;
    const percentage = Math.round((score / totalQuestions) * 100);
    
    const resultPercentage = document.getElementById('result-percentage');
    const resultCircle = document.getElementById('result-circle');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const finalDurationDisplay = document.getElementById('final-duration');
    
    if (resultPercentage) resultPercentage.innerText = `${percentage}%`;
    if (resultCircle) resultCircle.style.background = `conic-gradient(var(--accent) ${percentage * 3.6}deg, rgba(255, 255, 255, 0.1) 0deg)`;

    const resultText = `Você acertou ${score} de ${totalQuestions} questões!`;
    if (finalDurationDisplay) finalDurationDisplay.innerText = `Tempo de prova: ${formatDuration(duration)}`;

    if (score >= 21) {
        if (resultTitle) resultTitle.innerText = "Parabéns, APROVADO!";
        if (resultMessage) resultMessage.innerText = `${studentName}, ${resultText} Rumo à CNH!`;
        launchConfetti();
        passSynth.triggerAttackRelease(["C4", "E4", "G4"], "8n", Tone.now());
    } else {
        if (resultTitle) resultTitle.innerText = "Continue Estudando!";
        if (resultMessage) resultMessage.innerText = `${studentName}, ${resultText} A prática leva à perfeição, não desista!`;
    }

    saveResultInBackground(studentName, score, totalQuestions, percentage, duration);
}

async function saveResultInBackground(name, score, totalQuestions, percentage, duration) {
    try {
await addDoc(collection(db, "artifacts", appId, "public", "data", "quizResults"), {
            name, score, totalQuestions, percentage, duration,
            status: score >= 21 ? 'Aprovado' : 'Reprovado',
            createdAt: serverTimestamp()
        });
        console.log("Result saved successfully in the background.");
    } catch (e) {
        console.error("Error saving result in background: ", e);
    }
}

function launchConfetti() {
    const confettiContainer = document.getElementById('confetti-container');
    if (!confettiContainer) return;
    
    const colors = ['#ff9800', '#ec8800', '#ffa424', '#ffffff'];
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = `${Math.random() * 3}s`;
        confetti.style.transform = `scale(${Math.random() * 1.5 + 0.5})`;
        confettiContainer.appendChild(confetti);
    }
}

// Admin Functions
function showReview() {
    const reviewContent = document.getElementById('review-content');
    const reviewModal = document.getElementById('review-modal');
    
    if (!reviewContent || !reviewModal) return;
    
    reviewContent.innerHTML = '';
    userAnswers.forEach((answer, index) => {
        const answerBlock = document.createElement('div');
        answerBlock.classList.add('mb-6', 'pb-6', 'border-b', 'last:border-b-0', 'border-gray-200');
        let optionsHtml = '';
        answer.options.forEach((opt, i) => {
            let styleClass = 'text-gray-700';
            if (i === answer.correct) styleClass = 'text-green-600 font-bold';
            if (i === answer.selected && answer.selected !== answer.correct) styleClass = 'text-red-600 line-through';
            optionsHtml += `<li class="py-1 ${styleClass}">${String.fromCharCode(97 + i)}) ${opt}</li>`;
        });
        answerBlock.innerHTML = `
            <p class="font-bold text-gray-900 mb-2">${index + 1}. ${answer.question}</p>
            <ul class="space-y-1 mb-3">${optionsHtml}</ul>
            <div class="bg-orange-50 p-3 rounded-lg">
                <p class="text-sm text-orange-800"><strong class="font-semibold">Explicação:</strong> ${answer.explanation}</p>
            </div>`;
        reviewContent.appendChild(answerBlock);
    });
    reviewModal.classList.remove('hidden');
}

function handleAdminLogin(event) {
    event.preventDefault();
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-pass').value;
    const loginError = document.getElementById('login-error');

    if (user === 'nova' && pass === 'vialocal') {
        showView('admin-panel-screen');
        switchAdminTab('results');
        setupAdminListeners();
    } else {
        if (loginError) loginError.innerText = 'Usuário ou senha inválidos.';
    }
}

function switchAdminTab(tabName) {
    const adminResultsPanel = document.getElementById('admin-results-panel');
    const adminQuestionsPanel = document.getElementById('admin-questions-panel');
    const tabResults = document.getElementById('tab-results');
    const tabQuestions = document.getElementById('tab-questions');
    
    [adminResultsPanel, adminQuestionsPanel].forEach(p => {
        if (p) p.classList.add('hidden');
    });
    [tabResults, tabQuestions].forEach(t => {
        if (t) t.classList.remove('active');
    });

    if(tabName === 'results') {
        if (adminResultsPanel) adminResultsPanel.classList.remove('hidden');
        if (tabResults) tabResults.classList.add('active');
    } else {
        if (adminQuestionsPanel) adminQuestionsPanel.classList.remove('hidden');
        if (tabQuestions) tabQuestions.classList.add('active');
    }
}

function setupAdminListeners() {
    if (unsubscribeAdminResults) unsubscribeAdminResults();
    if (unsubscribeAdminQuestions) unsubscribeAdminQuestions();
    
    const adminResultsBody = document.getElementById('admin-results-body');
    const adminLoadingResults = document.getElementById('admin-loading-results');
    const questionsList = document.getElementById('questions-list');
    const adminLoadingQuestions = document.getElementById('admin-loading-questions');
    
    if (adminResultsBody) adminResultsBody.innerHTML = '';
    if (adminLoadingResults) {
        adminLoadingResults.classList.remove('hidden');
        adminLoadingResults.innerText = "Carregando resultados...";
    }
    
    const resultsQuery = query(collection(db, "artifacts", appId, "public", "data", "quizResults"));
    unsubscribeAdminResults = onSnapshot(resultsQuery, (querySnapshot) => {
        if (adminLoadingResults) adminLoadingResults.classList.add('hidden');
        if (querySnapshot.empty) {
            if (adminResultsBody) adminResultsBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">Nenhum resultado encontrado.</td></tr>';
            return;
        }
        const results = [];
        querySnapshot.forEach(doc => results.push(doc.data()));
        results.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

        if (adminResultsBody) {
            adminResultsBody.innerHTML = results.map(data => {
                const dateObj = data.createdAt ? data.createdAt.toDate() : null;
                const date = dateObj ? dateObj.toLocaleDateString('pt-BR') : 'N/A';
                const time = dateObj ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                const duration = data.duration ? formatDuration(data.duration) : '--';
                const statusClass = data.status === 'Aprovado' ? 'text-green-400' : 'text-red-400';
                return `
                    <tr class="hover:bg-gray-700/50 transition-colors">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">${data.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${data.score}/${data.totalQuestions} (${data.percentage}%)</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${duration}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${date}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${time}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${statusClass}">${data.status}</td>
                    </tr>
                `;
            }).join('');
        }
    });
    
    if (questionsList) questionsList.innerHTML = '';
    if (adminLoadingQuestions) {
        adminLoadingQuestions.classList.remove('hidden');
        adminLoadingQuestions.innerText = "Carregando perguntas...";
    }
    
    const questionsQuery = query(collection(db, "artifacts", appId, "public", "data", "questions"));
    unsubscribeAdminQuestions = onSnapshot(questionsQuery, (snapshot) => {
        if (adminLoadingQuestions) adminLoadingQuestions.classList.add('hidden');
        allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (allQuestions.length === 0) {
            if (questionsList) questionsList.innerHTML = '<div class="text-center p-4">Nenhuma pergunta encontrada. Clique em "Adicionar Pergunta" para começar.</div>';
            return;
        }
        
        allQuestions.sort((a,b) => a.category.localeCompare(b.category) || a.question.localeCompare(b.question));

        if (questionsList) {
            questionsList.innerHTML = allQuestions.map(q => {
                const statusClass = q.active ? 'text-green-400' : 'text-gray-500';
                const statusText = q.active ? 'Ativa' : 'Pausada';
                return `
                    <div class="bg-gray-800/50 p-4 rounded-lg">
                        <p class="font-semibold text-white">${q.question}</p>
                        <p class="text-sm text-gray-400 mt-1">Categoria: ${q.category}</p>
                        <p class="text-sm font-bold mt-1 ${statusClass}">Status: ${statusText}</p>
                        <div class="mt-3 flex flex-wrap gap-2">
                            <button data-id="${q.id}" class="edit-question-btn bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded">Editar</button>
                            <button data-id="${q.id}" class="toggle-status-btn bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-2 rounded">${q.active ? 'Pausar' : 'Ativar'}</button>
                            <button data-id="${q.id}" class="delete-question-btn bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded">Excluir</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    });
}

function openQuestionModal(question = null) {
    const questionForm = document.getElementById('question-form');
    const questionModalTitle = document.getElementById('question-modal-title');
    const questionIdInput = document.getElementById('question-id');
    const questionTextInput = document.getElementById('question-text-input');
    const questionCategoryInput = document.getElementById('question-category-input');
    const optionsInputContainer = document.getElementById('options-input-container');
    const questionExplanationInput = document.getElementById('question-explanation-input');
    const questionModal = document.getElementById('question-modal');
    
    if (questionForm) questionForm.reset();
    if (optionsInputContainer) optionsInputContainer.innerHTML = '';

    const isEditing = question !== null;
    if (questionModalTitle) questionModalTitle.textContent = isEditing ? "Editar Pergunta" : "Adicionar Nova Pergunta";
    if (questionIdInput) questionIdInput.value = isEditing ? question.id : '';
    if (questionTextInput) questionTextInput.value = isEditing ? question.question : '';
    if (questionCategoryInput) questionCategoryInput.value = isEditing ? question.category : 'legislacao';
    if (questionExplanationInput) questionExplanationInput.value = isEditing ? question.explanation : '';
    
    if (optionsInputContainer) {
        for(let i=0; i<4; i++) {
            const optionValue = isEditing && question.options[i] ? question.options[i] : '';
            const isChecked = isEditing && question.answer === i;
            optionsInputContainer.innerHTML += `
                <div class="flex items-center space-x-2">
                    <input type="radio" name="correctAnswer" value="${i}" class="form-radio h-4 w-4 text-orange-500 bg-gray-700 border-gray-600 focus:ring-orange-500" required ${isChecked ? 'checked' : ''}>
                    <input type="text" value="${optionValue}" class="w-full p-2 text-sm border border-gray-600 rounded-lg bg-gray-700 focus:ring-orange-500 focus:border-orange-500" placeholder="Opção ${i+1}" required>
                </div>
            `;
        }
    }
    if (questionModal) questionModal.classList.remove('hidden');
}

async function seedInitialQuestions() {
    const initialQuestions = [
        // Legislação
        { category: "legislacao", question: "Qual é a idade mínima para iniciar o processo de obtenção da primeira habilitação?", options: ["16 anos", "18 anos", "21 anos", "Não há idade mínima"], answer: 1, explanation: "Conforme o CTB, é necessário ter 18 anos completos para ser penalmente imputável e iniciar o processo de habilitação.", active: true },
        { category: "legislacao", question: "De acordo com o CTB, a Permissão para Dirigir (PPD) terá validade de:", options: ["2 anos", "1 ano", "6 meses", "5 anos"], answer: 1, explanation: "A PPD tem validade de 1 ano, período no qual o condutor não pode cometer infração grave, gravíssima ou ser reincidente em média.", active: true },
        { category: "legislacao", question: "Transitar com o veículo em velocidade superior à máxima permitida em mais de 50% é uma infração:", options: ["Média", "Grave", "Gravíssima (x3) com suspensão", "Leve"], answer: 2, explanation: "É uma infração gravíssima com multa multiplicada por três e suspensão imediata do direito de dirigir.", active: true },
        { category: "legislacao", question: "Uma linha amarela contínua no centro da pista indica:", options: ["Ultrapassagem permitida", "Ultrapassagem proibida para ambos os sentidos", "Via de mão única", "Ciclofaixa"], answer: 1, explanation: "Linha amarela contínua separa fluxos opostos e proíbe a ultrapassagem para ambos os lados.", active: true },
        { category: "legislacao", question: "A placa R-1 (PARE) exige que o condutor:", options: ["Reduza a velocidade", "Dê a preferência", "Pare o veículo antes da via", "Buzine"], answer: 2, explanation: "A placa R-1 indica parada obrigatória e incondicional do veículo.", active: true },
        { category: "legislacao", question: "Para conduzir transporte escolar, a categoria mínima exigida é:", options: ["B", "C", "D", "E"], answer: 2, explanation: "O Art. 138 do CTB exige categoria 'D' ou superior para o transporte de escolares.", active: true },
        { category: "legislacao", question: "O órgão máximo normativo do Sistema Nacional de Trânsito é o:", options: ["DETRAN", "DENATRAN", "CONTRAN", "CETRAN"], answer: 2, explanation: "O CONTRAN (Conselho Nacional de Trânsito) é o órgão máximo normativo e consultivo do SNT.", active: true },
        { category: "legislacao", question: "Deixar de prestar socorro à vítima de acidente, quando solicitado, é infração:", options: ["Leve", "Média", "Grave", "Gravíssima"], answer: 2, explanation: "O Art. 177 do CTB classifica como infração grave a recusa em prestar socorro quando solicitado pela autoridade.", active: true },
        { category: "legislacao", question: "Estacionar em pontes, viadutos e túneis é infração:", options: ["Leve", "Média", "Grave com remoção", "Gravíssima"], answer: 2, explanation: "É uma infração grave, com multa e medida administrativa de remoção do veículo.", active: true },
        { category: "legislacao", question: "As vias rurais abertas à circulação classificam-se em:", options: ["Arteriais e coletoras", "Locais e de trânsito rápido", "Rodovias e estradas", "Expressas e vicinais"], answer: 2, explanation: "O Art. 60 do CTB classifica as vias rurais em rodovias (pavimentadas) e estradas (não pavimentadas).", active: true },
        { category: "legislacao", question: "Dirigir veículo de categoria diferente da sua CNH é infração:", options: ["Grave", "Gravíssima", "Gravíssima (x2) com retenção", "Média"], answer: 2, explanation: "É infração gravíssima com multa multiplicada por dois e retenção do veículo até apresentação de condutor habilitado.", active: true },
        { category: "legislacao", question: "Usar o pisca-alerta com o veículo em movimento, exceto em emergência, é infração:", options: ["Leve", "Média", "Grave", "Não é infração"], answer: 1, explanation: "O uso indevido do pisca-alerta é uma infração de natureza média, conforme o Art. 251 do CTB.", active: true },
        { category: "legislacao", question: "A renovação da CNH para condutores com mais de 70 anos ocorre a cada:", options: ["10 anos", "5 anos", "3 anos", "1 ano"], answer: 2, explanation: "A Lei nº 14.071/2020 estabelece a renovação a cada 3 anos para condutores com 70 anos ou mais.", active: true },

        // Direção Defensiva
        { category: "direcao", question: "A perda de contato dos pneus com o solo pela água é chamada de:", options: ["Derrapagem", "Força centrífuga", "Aquaplanagem", "Subesterço"], answer: 2, explanation: "Aquaplanagem (ou hidroplanagem) é quando o pneu perde contato com a pista devido a uma camada de água.", active: true },
        { category: "direcao", question: "A distância que o veículo percorre desde que o perigo é visto até a pisada no freio é a de:", options: ["Frenagem", "Parada", "Seguimento", "Reação"], answer: 3, explanation: "Esta é a definição da distância de reação, que precede a distância de frenagem.", active: true },
        { category: "direcao", question: "Sob neblina intensa, o condutor deve usar:", options: ["Farol alto", "Pisca-alerta", "Farol baixo", "Apenas a luz de posição"], answer: 2, explanation: "O farol baixo é o correto para neblina, pois ilumina o chão. O farol alto reflete nas partículas de água e piora a visão.", active: true },
        { category: "direcao", question: "A 'regra dos dois segundos' serve para manter a distância de:", options: ["Frenagem", "Parada", "Seguimento", "Reação"], answer: 2, explanation: "É um método prático para calcular uma distância de seguimento segura em relação ao veículo da frente.", active: true },
        { category: "direcao", question: "Em um cruzamento não sinalizado, a preferência é de quem vem:", options: ["Da esquerda", "Da direita", "Mais rápido", "Na via mais larga"], answer: 1, explanation: "A regra geral do Art. 29 do CTB é que a preferência é de quem se aproxima pela direita do condutor.", active: true },
        { category: "direcao", question: "Ao ser ultrapassado, o condutor deve:", options: ["Acelerar", "Ir para o acostamento", "Manter-se em sua faixa sem acelerar", "Frear bruscamente"], answer: 2, explanation: "A conduta correta é facilitar a ultrapassagem, mantendo-se na faixa e não aumentando a velocidade.", active: true },
        { category: "direcao", question: "Ofuscamento pelo farol de outro veículo é uma condição adversa de:", options: ["Tempo", "Via", "Trânsito", "Luz"], answer: 3, explanation: "Ofuscamento é uma condição adversa de luz (ou iluminação).", active: true },
        { category: "direcao", question: "O principal motivo de colisões frontais é:", options: ["Falta de freio", "Pneus carecas", "Ultrapassagens indevidas", "Distração com o rádio"], answer: 2, explanation: "A grande maioria das colisões frontais, as mais perigosas, ocorrem durante manobras de ultrapassagem mal executadas.", active: true },
        { category: "direcao", question: "Para evitar acidentes com o veículo de trás, o condutor deve:", options: ["Frear sempre de repente", "Não usar a seta", "Sinalizar suas intenções com antecedência", "Mudar de faixa a todo momento"], answer: 2, explanation: "A comunicação clara através da sinalização (setas, luz de freio) é essencial para que o condutor de trás possa antecipar suas ações.", active: true },
        { category: "direcao", question: "O elemento básico da direção defensiva que envolve a capacidade de manusear os controles do veículo é a:", options: ["Previsão", "Decisão", "Atenção", "Habilidade"], answer: 3, explanation: "Habilidade é a perícia no controle do veículo, essencial para executar manobras de forma segura.", active: true },
        { category: "direcao", question: "Dirigir cansado ou com sono é perigoso porque:", options: ["Aumenta o consumo de combustível", "Reduz o tempo de reação e a concentração", "Danifica a suspensão do veículo", "É uma infração gravíssima"], answer: 1, explanation: "A fadiga afeta diretamente as capacidades cognitivas e motoras do condutor, tornando seus reflexos mais lentos e diminuindo a atenção.", active: true },
        { category: "direcao", question: "Em uma curva, a força que tende a jogar o veículo para fora é a:", options: ["Força centrípeta", "Força da gravidade", "Força centrífuga", "Força de atrito"], answer: 2, explanation: "A força centrífuga é a força inercial que age sobre um corpo em um sistema em rotação, empurrando-o para fora da curva.", active: true },

        // Primeiros Socorros
        { category: "socorros", question: "A primeira atitude em um local de acidente é:", options: ["Remover as vítimas", "Verificar os documentos", "Sinalizar o local para evitar novos acidentes", "Ligar para a família"], answer: 2, explanation: "Garantir a segurança do local é a prioridade número um para evitar que novas tragédias ocorram.", active: true },
        { category: "socorros", question: "Ao socorrer um motociclista acidentado, NÃO se deve:", options: ["Conversar com ele", "Verificar sua respiração", "Remover seu capacete", "Acionar o socorro"], answer: 2, explanation: "Nunca se deve remover o capacete, pois isso pode agravar uma lesão na coluna cervical. Apenas profissionais de resgate devem fazê-lo.", active: true },

        // Meio Ambiente
        { category: "meio_ambiente", question: "O equipamento que reduz os gases poluentes do escapamento é o:", options: ["Silenciador", "Abafador", "Catalisador", "Coletor de admissão"], answer: 2, explanation: "O catalisador é o responsável por converter grande parte dos gases tóxicos em substâncias menos nocivas.", active: true },
        { category: "meio_ambiente", question: "Atirar objetos pela janela do veículo é:", options: ["Permitido se for lixo orgânico", "Uma infração média e falta de cidadania", "Uma infração leve", "Permitido em estradas rurais"], answer: 1, explanation: "Além de ser um ato de desrespeito ao meio ambiente e à cidadania, é uma infração de trânsito de natureza média.", active: true },

        // Mecânica
        { category: "mecanica", question: "A profundidade mínima legal dos sulcos de um pneu é de:", options: ["1.0 mm", "1.6 mm", "2.0 mm", "Não há limite"], answer: 1, explanation: "Abaixo de 1.6 mm, o pneu é considerado 'careca', comprometendo a segurança, e o veículo está em situação irregular.", active: true }
    ];
    
    const questionsCol = collection(db, "artifacts", appId, "public", "data", "questions");
    const batch = writeBatch(db);
    initialQuestions.forEach(q => {
        const docRef = doc(questionsCol);
        batch.set(docRef, {...q, createdAt: serverTimestamp()});
    });
    await batch.commit();
    console.log("Initial questions seeded successfully.");
}

// Event Listeners - Inicialização após o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar referências DOM
    startBtn = document.getElementById('start-btn');
    nameInput = document.getElementById('name-input');
    
    // Event Listeners principais
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            if (nameInput.value.trim() !== '' && allQuestions.length > 0) {
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.classList.remove('btn-disabled');
                }
            } else {
                if (startBtn) {
                    startBtn.disabled = true;
                    startBtn.classList.add('btn-disabled');
                }
            }
        });
    }

    if (startBtn) startBtn.addEventListener('click', startQuiz);
    
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.addEventListener('click', showNextQuestion);
    
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            showView('quiz-container');
            const resultScreen = document.getElementById('result-screen');
            const startScreen = document.getElementById('start-screen');
            if (resultScreen) resultScreen.classList.add('hidden');
            if (startScreen) startScreen.classList.remove('hidden');
            if (nameInput) {
                nameInput.value = '';
            }
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.classList.add('btn-disabled');
            }
        });
    }
    
    const reviewBtn = document.getElementById('review-btn');
    if (reviewBtn) reviewBtn.addEventListener('click', showReview);
    
    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            const reviewModal = document.getElementById('review-modal');
            if (reviewModal) reviewModal.classList.add('hidden');
        });
    }

    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.addEventListener('click', (e) => {
            e.preventDefault();
            showView('admin-login-screen');
        });
    }

    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLogin);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (unsubscribeAdminResults) unsubscribeAdminResults();
            if (unsubscribeAdminQuestions) unsubscribeAdminQuestions();
            if (adminLoginForm) adminLoginForm.reset();
            const loginError = document.getElementById('login-error');
            if (loginError) loginError.innerText = '';
            showView('quiz-container');
        });
    }

    const backToQuizBtn = document.getElementById('back-to-quiz-btn');
    if (backToQuizBtn) {
        backToQuizBtn.addEventListener('click', () => {
            const adminLoginForm = document.getElementById('admin-login-form');
            const loginError = document.getElementById('login-error');
            if (adminLoginForm) adminLoginForm.reset();
            if (loginError) loginError.innerText = '';
            showView('quiz-container');
        });
    }

    // Event listeners para as abas
    const tabResults = document.getElementById('tab-results');
    const tabQuestions = document.getElementById('tab-questions');
    if (tabResults) tabResults.addEventListener('click', () => switchAdminTab('results'));
    if (tabQuestions) tabQuestions.addEventListener('click', () => switchAdminTab('questions'));

    // Event listener para adicionar pergunta
    const addQuestionBtn = document.getElementById('add-question-btn');
    if (addQuestionBtn) addQuestionBtn.addEventListener('click', () => openQuestionModal());

    // Event listener para cancelar modal de pergunta
    const cancelQuestionModalBtn = document.getElementById('cancel-question-modal-btn');
    if (cancelQuestionModalBtn) {
        cancelQuestionModalBtn.addEventListener('click', () => {
            const questionModal = document.getElementById('question-modal');
            if (questionModal) questionModal.classList.add('hidden');
        });
    }

    // Event listener para salvar pergunta
    const questionForm = document.getElementById('question-form');
    if (questionForm) {
        questionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const questionIdInput = document.getElementById('question-id');
            const questionTextInput = document.getElementById('question-text-input');
            const questionCategoryInput = document.getElementById('question-category-input');
            const optionsInputContainer = document.getElementById('options-input-container');
            const questionExplanationInput = document.getElementById('question-explanation-input');
            const questionModal = document.getElementById('question-modal');
            
            const id = questionIdInput ? questionIdInput.value : '';
            const questionData = {
                question: questionTextInput ? questionTextInput.value : '',
                category: questionCategoryInput ? questionCategoryInput.value : '',
                options: optionsInputContainer ? Array.from(optionsInputContainer.querySelectorAll('input[type="text"]')).map(input => input.value) : [],
                answer: optionsInputContainer ? parseInt(optionsInputContainer.querySelector('input[type="radio"]:checked').value) : 0,
                explanation: questionExplanationInput ? questionExplanationInput.value : '',
                active: true
            };
            
            try {
                const questionsCol = collection(db, "artifacts", appId, "public", "data", "questions");
                if(id) {
                    await updateDoc(doc(questionsCol, id), questionData);
                } else {
                    questionData.createdAt = serverTimestamp();
                    await addDoc(questionsCol, questionData);
                }
                if (questionModal) questionModal.classList.add('hidden');
            } catch (error) {
                console.error("Error saving question:", error);
                alert("Erro ao salvar a pergunta.");
            }
        });
    }

    // Event listener para ações nas perguntas
    const questionsList = document.getElementById('questions-list');
    if (questionsList) {
        questionsList.addEventListener('click', async (e) => {
            const target = e.target;
            const id = target.dataset.id;
            if (!id) return;

            const questionRef = doc(db, "artifacts", appId, "public", "data", "questions", id);

            if (target.classList.contains('edit-question-btn')) {
                const questionToEdit = allQuestions.find(q => q.id === id);
                if (questionToEdit) openQuestionModal(questionToEdit);
            } else if (target.classList.contains('toggle-status-btn')) {
                const currentQuestion = allQuestions.find(q => q.id === id);
                if(currentQuestion) {
                    await updateDoc(questionRef, { active: !currentQuestion.active });
                }
            } else if (target.classList.contains('delete-question-btn')) {
                questionIdToDelete = id;
                const deleteConfirmModal = document.getElementById('delete-confirm-modal');
                if (deleteConfirmModal) deleteConfirmModal.classList.remove('hidden');
            }
        });
    }

    // Event listeners para modal de confirmação de exclusão
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            questionIdToDelete = null;
            const deleteConfirmModal = document.getElementById('delete-confirm-modal');
            if (deleteConfirmModal) deleteConfirmModal.classList.add('hidden');
        });
    }

    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (questionIdToDelete) {
                await deleteDoc(doc(db, "artifacts", appId, "public", "data", "questions", questionIdToDelete));
                questionIdToDelete = null;
                const deleteConfirmModal = document.getElementById('delete-confirm-modal');
                if (deleteConfirmModal) deleteConfirmModal.classList.add('hidden');
            }
        });
    }
});