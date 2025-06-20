        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, collection, addDoc, serverTimestamp, query, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
        const appId = firebaseConfig.projectId;
        
        onAuthStateChanged(auth, user => {
            if (!user) {
                signInAnonymously(auth).catch(error => console.error("Anonymous sign-in error:", error));
            }
        });

        const fullQuizData = [
            { category: "legislacao", question: "Qual é a idade mínima para iniciar o processo de obtenção da primeira habilitação?", options: ["16 anos", "18 anos", "21 anos", "Não há idade mínima"], answer: 1, explanation: "Conforme o CTB, é necessário ter 18 anos completos para ser penalmente imputável e iniciar o processo de habilitação." },
            { category: "legislacao", question: "De acordo com o CTB, a Permissão para Dirigir (PPD) terá validade de:", options: ["2 anos", "1 ano", "6 meses", "5 anos"], answer: 1, explanation: "A PPD tem validade de 1 ano, período no qual o condutor não pode cometer infração grave, gravíssima ou ser reincidente em média." },
            { category: "legislacao", question: "Transitar com o veículo em velocidade superior à máxima permitida para o local em mais de 50% é uma infração:", options: ["Média", "Grave", "Gravíssima (x3) com suspensão", "Leve"], answer: 2, explanation: "É uma infração gravíssima com multa multiplicada por três e suspensão imediata do direito de dirigir." },
            { category: "legislacao", question: "Uma linha amarela contínua no centro da pista indica:", options: ["Ultrapassagem permitida", "Ultrapassagem proibida para ambos os sentidos", "Via de mão única", "Ciclofaixa"], answer: 1, explanation: "Linha amarela contínua separa fluxos opostos e proíbe a ultrapassagem para ambos os lados." },
            { category: "legislacao", question: "A placa R-1 (PARE) exige que o condutor:", options: ["Reduza a velocidade", "Dê a preferência", "Pare o veículo antes da via", "Buzine"], answer: 2, explanation: "A placa R-1 indica parada obrigatória e incondicional do veículo." },
            { category: "legislacao", question: "Para conduzir transporte escolar, a categoria mínima exigida é:", options: ["B", "C", "D", "E"], answer: 2, explanation: "O Art. 138 do CTB exige categoria 'D' ou superior para o transporte de escolares." },
            { category: "legislacao", question: "O órgão máximo normativo do Sistema Nacional de Trânsito é o:", options: ["DETRAN", "DENATRAN", "CONTRAN", "CETRAN"], answer: 2, explanation: "O CONTRAN (Conselho Nacional de Trânsito) é o órgão máximo normativo e consultivo do SNT." },
            { category: "legislacao", question: "Deixar de prestar socorro à vítima de acidente, quando solicitado, é infração:", options: ["Leve", "Média", "Grave", "Gravíssima"], answer: 2, explanation: "O Art. 177 do CTB classifica como infração grave a recusa em prestar socorro quando solicitado pela autoridade." },
            { category: "legislacao", question: "Estacionar em pontes, viadutos e túneis é infração:", options: ["Leve", "Média", "Grave com remoção", "Gravíssima"], answer: 2, explanation: "É uma infração grave, com multa e medida administrativa de remoção do veículo." },
            { category: "legislacao", question: "As vias rurais abertas à circulação classificam-se em:", options: ["Arteriais e coletoras", "Locais e de trânsito rápido", "Rodovias e estradas", "Expressas e vicinais"], answer: 2, explanation: "O Art. 60 do CTB classifica as vias rurais em rodovias (pavimentadas) e estradas (não pavimentadas)." },
            { category: "legislacao", question: "Dirigir veículo de categoria diferente da sua CNH é infração:", options: ["Grave", "Gravíssima", "Gravíssima (x2) com retenção", "Média"], answer: 2, explanation: "É infração gravíssima com multa multiplicada por dois e retenção do veículo até apresentação de condutor habilitado." },
            { category: "legislacao", question: "Usar o pisca-alerta com o veículo em movimento, exceto em emergência, é infração:", options: ["Leve", "Média", "Grave", "Não é infração"], answer: 1, explanation: "O uso indevido do pisca-alerta é uma infração de natureza média, conforme o Art. 251 do CTB." },
            { category: "legislacao", question: "A renovação da CNH para condutores com mais de 70 anos ocorre a cada:", options: ["10 anos", "5 anos", "3 anos", "1 ano"], answer: 2, explanation: "A Lei nº 14.071/2020 estabelece a renovação a cada 3 anos para condutores com 70 anos ou mais." },
            { category: "direcao", question: "A perda de contato dos pneus com o solo pela água é chamada de:", options: ["Derrapagem", "Força centrífuga", "Aquaplanagem", "Subesterço"], answer: 2, explanation: "Aquaplanagem (ou hidroplanagem) é quando o pneu perde contato com a pista devido a uma camada de água." },
            { category: "direcao", question: "A distância que o veículo percorre desde que o perigo é visto até a pisada no freio é a de:", options: ["Frenagem", "Parada", "Seguimento", "Reação"], answer: 3, explanation: "Esta é a definição da distância de reação, que precede a distância de frenagem." },
            { category: "direcao", question: "Sob neblina intensa, o condutor deve usar:", options: ["Farol alto", "Pisca-alerta", "Farol baixo", "Apenas a luz de posição"], answer: 2, explanation: "O farol baixo é o correto para neblina, pois ilumina o chão. O farol alto reflete nas partículas de água e piora a visão." },
            { category: "direcao", question: "A 'regra dos dois segundos' serve para manter a distância de:", options: ["Frenagem", "Parada", "Seguimento", "Reação"], answer: 2, explanation: "É um método prático para calcular uma distância de seguimento segura em relação ao veículo da frente." },
            { category: "direcao", question: "Em um cruzamento não sinalizado, a preferência é de quem vem:", options: ["Da esquerda", "Da direita", "Mais rápido", "Na via mais larga"], answer: 1, explanation: "A regra geral do Art. 29 do CTB é que a preferência é de quem se aproxima pela direita do condutor." },
            { category: "direcao", question: "Ao ser ultrapassado, o condutor deve:", options: ["Acelerar", "Ir para o acostamento", "Manter-se em sua faixa sem acelerar", "Frear bruscamente"], answer: 2, explanation: "A conduta correta é facilitar a ultrapassagem, mantendo-se na faixa e não aumentando a velocidade." },
            { category: "direcao", question: "Ofuscamento pelo farol de outro veículo é uma condição adversa de:", options: ["Tempo", "Via", "Trânsito", "Luz"], answer: 3, explanation: "Ofuscamento é uma condição adversa de luz (ou iluminação)." },
            { category: "direcao", question: "O principal motivo de colisões frontais é:", options: ["Falta de freio", "Pneus carecas", "Ultrapassagens indevidas", "Distração com o rádio"], answer: 2, explanation: "A grande maioria das colisões frontais, as mais perigosas, ocorrem durante manobras de ultrapassagem mal executadas." },
            { category: "direcao", question: "Para evitar acidentes com o veículo de trás, o condutor deve:", options: ["Frear sempre de repente", "Não usar a seta", "Sinalizar suas intenções com antecedência", "Mudar de faixa a todo momento"], answer: 2, explanation: "A comunicação clara através da sinalização (setas, luz de freio) é essencial para que o condutor de trás possa antecipar suas ações." },
            { category: "direcao", question: "O elemento básico da direção defensiva que envolve a capacidade de manusear os controles do veículo é a:", options: ["Previsão", "Decisão", "Atenção", "Habilidade"], answer: 3, explanation: "Habilidade é a perícia no controle do veículo, essencial para executar manobras de forma segura." },
            { category: "direcao", question: "Dirigir cansado ou com sono é perigoso porque:", options: ["Aumenta o consumo de combustível", "Reduz o tempo de reação e a concentração", "Danifica a suspensão do veículo", "É uma infração gravíssima"], answer: 1, explanation: "A fadiga afeta diretamente as capacidades cognitivas e motoras do condutor, tornando seus reflexos mais lentos e diminuindo a atenção." },
            { category: "direcao", question: "Em uma curva, a força que tende a jogar o veículo para fora é a:", options: ["Força centrípeta", "Força da gravidade", "Força centrífuga", "Força de atrito"], answer: 2, explanation: "A força centrífuga é a força inercial que age sobre um corpo em um sistema em rotação, empurrando-o para fora da curva." },
            { category: "socorros", question: "A primeira atitude em um local de acidente é:", options: ["Remover as vítimas", "Verificar os documentos", "Sinalizar o local para evitar novos acidentes", "Ligar para a família"], answer: 2, explanation: "Garantir a segurança do local é a prioridade número um para evitar que novas tragédias ocorram." },
            { category: "socorros", question: "Ao socorrer um motociclista acidentado, NÃO se deve:", options: ["Conversar com ele", "Verificar sua respiração", "Remover seu capacete", "Acionar o socorro"], answer: 2, explanation: "Nunca se deve remover o capacete, pois isso pode agravar uma lesão na coluna cervical. Apenas profissionais de resgate devem fazê-lo." },
            { category: "meio_ambiente", question: "O equipamento que reduz os gases poluentes do escapamento é o:", options: ["Silenciador", "Abafador", "Catalisador", "Coletor de admissão"], answer: 2, explanation: "O catalisador é o responsável por converter grande parte dos gases tóxicos em substâncias menos nocivas." },
            { category: "meio_ambiente", question: "Atirar objetos pela janela do veículo é:", options: ["Permitido se for lixo orgânico", "Uma infração média e falta de cidadania", "Uma infração leve", "Permitido em estradas rurais"], answer: 1, explanation: "Além de ser um ato de desrespeito ao meio ambiente e à cidadania, é uma infração de trânsito de natureza média." },
            { category: "mecanica", question: "A profundidade mínima legal dos sulcos de um pneu é de:", options: ["1.0 mm", "1.6 mm", "2.0 mm", "Não há limite"], answer: 1, explanation: "Abaixo de 1.6 mm, o pneu é considerado 'careca', comprometendo a segurança, e o veículo está em situação irregular." }
        ];

        const mainContainer = document.getElementById('main-container');
        const quizContainer = document.getElementById('quiz-container');
        const startScreen = document.getElementById('start-screen');
        const quizScreen = document.getElementById('quiz-screen');
        const resultScreen = document.getElementById('result-screen');
        const adminLoginScreen = document.getElementById('admin-login-screen');
        const adminPanelScreen = document.getElementById('admin-panel-screen');
        const reviewModal = document.getElementById('review-modal');
        const startBtn = document.getElementById('start-btn');
        const nextBtn = document.getElementById('next-btn');
        const restartBtn = document.getElementById('restart-btn');
        const reviewBtn = document.getElementById('review-btn');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const adminLink = document.getElementById('admin-link');
        const adminLoginForm = document.getElementById('admin-login-form');
        const logoutBtn = document.getElementById('logout-btn');
        const backToQuizBtn = document.getElementById('back-to-quiz-btn');
        const nameInput = document.getElementById('name-input');
        const loginError = document.getElementById('login-error');
        const adminResultsBody = document.getElementById('admin-results-body');
        const adminLoading = document.getElementById('admin-loading');
        const questionCounter = document.getElementById('question-counter');
        const scoreCounter = document.getElementById('score-counter');
        const timerDisplay = document.getElementById('timer');
        const finalDurationDisplay = document.getElementById('final-duration');
        const progressBar = document.getElementById('progress-bar');
        const questionText = document.getElementById('question-text');
        const optionsContainer = document.getElementById('options-container');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        const reviewContent = document.getElementById('review-content');
        const confettiContainer = document.getElementById('confetti-container');
        const resultCircle = document.getElementById('result-circle');
        const resultPercentage = document.getElementById('result-percentage');
        
        let sessionQuizData = [];
        let currentQuestionIndex = 0;
        let score = 0;
        let userAnswers = [];
        let studentName = "";
        let unsubscribeAdminListener = null;
        let quizStartTime = null;
        let timerInterval = null;

        const correctSynth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 } }).toDestination();
        const incorrectSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 1 } }).toDestination();
        const passSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 } }).toDestination();

        function showView(viewId) {
            [quizContainer, adminLoginScreen, adminPanelScreen].forEach(el => el.classList.add('hidden'));
            document.getElementById(viewId).classList.remove('hidden');
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

        function startTimer() {
            if(timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                const now = new Date();
                const elapsedTime = now - quizStartTime;
                timerDisplay.innerText = `Tempo: ${formatDuration(elapsedTime)}`;
            }, 1000);
        }

        function generateRandomQuiz() {
            const questionsByCat = {
                legislacao: fullQuizData.filter(q => q.category === 'legislacao'),
                direcao: fullQuizData.filter(q => q.category === 'direcao'),
                socorros: fullQuizData.filter(q => q.category === 'socorros'),
                meio_ambiente: fullQuizData.filter(q => q.category === 'meio_ambiente'),
                mecanica: fullQuizData.filter(q => q.category === 'mecanica'),
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

        function startQuiz() {
            studentName = nameInput.value.trim();
            if (!studentName) return;
            
            Tone.start();
            quizStartTime = new Date();
            startTimer();
            sessionQuizData = generateRandomQuiz();
            currentQuestionIndex = 0;
            score = 0;
            userAnswers = [];
            startScreen.classList.add('hidden');
            resultScreen.classList.add('hidden');
            quizScreen.classList.remove('hidden');
            nextBtn.classList.add('hidden');
            showQuestion();
        }

        function showQuestion() {
            resetState();
            const question = sessionQuizData[currentQuestionIndex];
            const questionNumber = currentQuestionIndex + 1;
            
            questionText.innerText = question.question;
            questionCounter.innerText = `Questão ${questionNumber} de ${sessionQuizData.length}`;
            scoreCounter.innerText = `Acertos: ${score}`;
            progressBar.style.width = `${(questionNumber / sessionQuizData.length) * 100}%`;

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

        function resetState() {
            nextBtn.classList.add('hidden');
            confettiContainer.innerHTML = '';
            while (optionsContainer.firstChild) {
                optionsContainer.removeChild(optionsContainer.firstChild);
            }
        }

        function selectAnswer(e) {
            const selectedBtn = e.currentTarget;
            const selectedAnswerIndex = parseInt(selectedBtn.dataset.index);
            const question = sessionQuizData[currentQuestionIndex];
            const isCorrect = selectedAnswerIndex === question.answer;

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
                scoreCounter.classList.add('score-pop');
                setTimeout(() => scoreCounter.classList.remove('score-pop'), 300);
            } else {
                incorrectSynth.triggerAttackRelease("C3", "8n", Tone.now());
            }
            
            selectedBtn.classList.add(isCorrect ? 'correct' : 'incorrect');

            Array.from(optionsContainer.children).forEach(button => {
                const buttonIndex = parseInt(button.dataset.index);
                if (buttonIndex === question.answer) button.classList.add('correct');
                button.disabled = true;
            });
            
            scoreCounter.innerText = `Acertos: ${score}`;
            nextBtn.classList.remove('hidden');
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
            quizScreen.classList.add('hidden');
            resultScreen.classList.remove('hidden');
            clearInterval(timerInterval);
            
            const quizEndTime = new Date();
            const duration = quizEndTime - quizStartTime;
            
            const totalQuestions = sessionQuizData.length;
            const percentage = Math.round((score / totalQuestions) * 100);
            
            resultPercentage.innerText = `${percentage}%`;
            resultCircle.style.background = `conic-gradient(var(--accent) ${percentage * 3.6}deg, rgba(255, 255, 255, 0.1) 0deg)`;

            const resultText = `Você acertou ${score} de ${totalQuestions} questões!`;
            finalDurationDisplay.innerText = `Tempo de prova: ${formatDuration(duration)}`;

            if (score >= 21) {
                resultTitle.innerText = "Parabéns, APROVADO!";
                resultMessage.innerText = `${studentName}, ${resultText} Rumo à CNH!`;
                launchConfetti();
                passSynth.triggerAttackRelease(["C4", "E4", "G4"], "8n", Tone.now());
            } else {
                resultTitle.innerText = "Continue Estudando!";
                resultMessage.innerText = `${studentName}, ${resultText} A prática leva à perfeição, não desista!`;
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
            const colors = ['#ff9800', '#ec8800', '#ffa424', '#ffffff'];
            for (let i = 0; i < 100; i++) {
                const confetti = document.createElement('div');
                confetti.classList.add('confetti');
                confetti.style.left = `${Math.random() * 100}vw`;
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = `${Math.random() * 3}s`;
                confetti.style.transform = `scale(${Math.random() * 1.5 + 0.5})`
                confettiContainer.appendChild(confetti);
            }
        }

        function showReview() {
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

            if (user === 'nova' && pass === 'vialocal') {
                showView('admin-panel-screen');
                setupAdminListener();
            } else {
                loginError.innerText = 'Usuário ou senha inválidos.';
            }
        }
        
        function setupAdminListener() {
            if (unsubscribeAdminListener) unsubscribeAdminListener();
            
            adminResultsBody.innerHTML = '';
            adminLoading.classList.remove('hidden');
            adminLoading.innerText = "Carregando resultados...";
            
            const q = query(collection(db, "artifacts", appId, "public", "data", "quizResults"));
            
            unsubscribeAdminListener = onSnapshot(q, (querySnapshot) => {
                if (querySnapshot.empty) {
                     adminLoading.innerText = "Nenhum resultado encontrado.";
                     adminResultsBody.innerHTML = '';
                     return;
                }

                const results = [];
                querySnapshot.forEach(doc => results.push(doc.data()));
                results.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

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
                adminLoading.classList.add('hidden');
            }, (error) => {
                console.error("Error with onSnapshot listener: ", error);
                adminLoading.innerText = "Erro ao carregar os resultados.";
            });
        }
        
        nameInput.addEventListener('input', () => {
            if (nameInput.value.trim() !== '') {
                startBtn.disabled = false;
                startBtn.classList.remove('btn-disabled');
            } else {
                startBtn.disabled = true;
                startBtn.classList.add('btn-disabled');
            }
        });

        startBtn.addEventListener('click', startQuiz);
        nextBtn.addEventListener('click', showNextQuestion);
        restartBtn.addEventListener('click', () => {
            showView('quiz-container');
            resultScreen.classList.add('hidden');
            startScreen.classList.remove('hidden');
            nameInput.value = '';
            startBtn.disabled = true;
            startBtn.classList.add('btn-disabled');
        });
        reviewBtn.addEventListener('click', showReview);
        closeModalBtn.addEventListener('click', () => reviewModal.classList.add('hidden'));

        adminLink.addEventListener('click', (e) => {
            e.preventDefault();
            showView('admin-login-screen');
        });

        adminLoginForm.addEventListener('submit', handleAdminLogin);

        logoutBtn.addEventListener('click', () => {
            if (unsubscribeAdminListener) {
                unsubscribeAdminListener();
                unsubscribeAdminListener = null;
            }
            adminLoginForm.reset();
            loginError.innerText = '';
            showView('quiz-container');
        });

        backToQuizBtn.addEventListener('click', () => {
            adminLoginForm.reset();
            loginError.innerText = '';
            showView('quiz-container');
        });