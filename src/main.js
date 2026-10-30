import './style.css';
import sampleQuestions from './questions.json';
import { invoke, isTauri } from '@tauri-apps/api/core';

const app = document.querySelector('#app');
let questions = [];
let position = 0;
let score = 0;
let selected = null;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(text, action, className = 'primary') {
  const node = element('button', text, className);
  node.addEventListener('click', action);
  return node;
}

function shell() {
  app.replaceChildren();
  const header = element('header');
  header.append(element('div', 'M / C', 'brand'), element('span', 'MARATÓN DEL CONOCIMIENTO', 'wordmark'));
  header.append(element('span', isTauri() ? 'Edición de escritorio' : 'Vista de navegador', 'mode'));
  const main = element('main');
  app.append(header, main, element('footer', 'Una pregunta a la vez. Un descubrimiento más.'));
  return main;
}

function home() {
  const main = shell();
  main.append(element('p', 'TU PRÓXIMO RETO EMPIEZA AQUÍ', 'eyebrow'));
  main.append(element('h1', 'La curiosidad\ntiene recompensa.'));
  main.append(element('p', 'Pon a prueba lo que sabes y descubre algo nuevo en cada respuesta.', 'intro'));
  const card = element('section', undefined, 'card welcome');
  card.append(element('span', '01 / CULTURA GENERAL', 'eyebrow'), element('h2', '¿Listo para el maratón?'));
  card.append(element('p', `${sampleQuestions.length} preguntas · 3 o 4 opciones · Una respuesta correcta`));
  card.append(element('p', 'Sin cronómetro. Tómate tu tiempo para pensar.', 'muted'));
  const start = button('Comenzar el reto →', async () => {
    start.disabled = true;
    start.textContent = 'Preparando preguntas…';
    try {
      const data = isTauri() ? await invoke('get_questions') : sampleQuestions;
      if (!Array.isArray(data) || !data.length || data.some(q => !q.text || !Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length)) throw new Error('Banco de preguntas inválido');
      questions = [...data];
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
      position = 0; score = 0; selected = null;
      renderQuestion();
    } catch {
      start.disabled = false; start.textContent = 'Reintentar';
      if (!card.querySelector('[role="alert"]')) {
        const error = element('p', 'No se pudieron cargar las preguntas. Inténtalo de nuevo.');
        error.setAttribute('role', 'alert'); card.append(error);
      }
    }
  });
  card.append(start); main.append(card);
}

function renderQuestion(focus = true) {
  const main = shell();
  const q = questions[position];
  const stats = element('div', undefined, 'stats');
  stats.append(element('span', `Pregunta ${position + 1} de ${questions.length}`), element('span', `${score} aciertos`));
  const progress = element('progress'); progress.max = questions.length; progress.value = position;
  progress.setAttribute('aria-label', 'Preguntas completadas');
  main.append(stats, progress);
  const card = element('section', undefined, 'card');
  card.append(element('p', q.category, 'eyebrow'));
  const title = element('h1', q.text, 'question'); title.tabIndex = -1; card.append(title);
  const choices = element('div', undefined, 'choices');
  q.options.forEach((option, index) => {
    const choice = button(`${String.fromCharCode(65 + index)}.  ${option}`, () => {
      selected = index;
      if (index === q.answer) score++;
      renderQuestion(false);
      document.querySelector('.feedback').focus();
    }, 'choice');
    choice.disabled = selected !== null;
    if (selected !== null && index === q.answer) { choice.classList.add('correct'); choice.textContent += ' ✓ Correcta'; }
    if (selected === index && index !== q.answer) { choice.classList.add('incorrect'); choice.textContent += ' ✕ Tu respuesta'; }
    choices.append(choice);
  });
  card.append(choices);
  if (selected !== null) {
    const feedback = element('div', undefined, 'feedback'); feedback.tabIndex = -1; feedback.setAttribute('role', 'status');
    feedback.append(element('strong', selected === q.answer ? '¡Respuesta correcta!' : 'Una oportunidad para aprender.'), element('p', q.explanation));
    card.append(feedback, button(position === questions.length - 1 ? 'Ver mi resultado →' : 'Siguiente pregunta →', () => {
      position++; selected = null;
      if (position === questions.length) result(); else renderQuestion();
    }));
  } else card.append(element('p', 'Elige una respuesta para continuar.', 'muted'));
  main.append(card);
  if (focus) title.focus();
}

function result() {
  const main = shell();
  const card = element('section', undefined, 'card result');
  card.append(element('p', 'RETO COMPLETADO', 'eyebrow'));
  const title = element('h1', '¡Llegaste a la meta!'); title.tabIndex = -1;
  card.append(title, element('div', `${score} / ${questions.length}`, 'score'), element('h2', 'respuestas correctas'));
  card.append(element('p', score === questions.length ? '¡Maratón perfecto! Tu curiosidad te llevó lejos.' : 'Cada pregunta suma algo nuevo. ¿Vamos por otra vuelta?'));
  card.append(button('Volver al inicio →', home)); main.append(card); title.focus();
}

home();
