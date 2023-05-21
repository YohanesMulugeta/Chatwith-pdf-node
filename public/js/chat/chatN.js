import makeRequest from '../reusables/fetch.js';
import showError from '../reusables/showError.js';

export let currentChat;
const messagesInputContainer = document.querySelector('.chat-container');

// socket.onopen = () => {
//   // console.log('pussy');
//   // socket.send('what are yohanes mulugetas skils?');

//   setTimeout(() => {
//     console.log('pussy');
//     socket.send('what are yohanes mulugetas skils?');
//   }, 5000);
// };

// socket.onmessage = (msg) => {
//   console.log(msg.data);
// };

// console.log(location.hostname);

// copy btn

class Chat {
  promptInput = document.getElementById('user-input');
  generateBtn = document.querySelector('.btn-ask');
  // chatTitle = document.querySelector('.chat-title');
  state = { docName: '', chatTitle: '', history: [] };

  constructor({ chatTitle, docName, _id, chatHistory }) {
    this.state.chatTitle = chatTitle;
    this.state.docName = docName;
    // this.chatTitle.textContent = chatTitle;
    this.state.history = chatHistory ? chatHistory : [];
    this.state.chatId = _id;
    this.url = `ws://localhost:8000/api/v1/pdf/chat/${_id}`;
    this.socket = new WebSocket(`ws://localhost:8000/api/v1/pdf/chat/${_id}`);

    this.setCurrentChat(this);

    this.init();
  }

  // initialize
  init() {
    this.socket.onmessage = this.addBotMessageN;
    resetMessageInputContainer();
    this.chatContainer = document.querySelector('.messages-container');
    this.generateBtn.addEventListener('click', this.handleGenerateBtn);
    this.promptInput.addEventListener('keyup', this.handleEnterKey);
    this.chatContainer.addEventListener('click', this.handleCopy);
    this.populateHistory();
  }

  // --------------- populate history to chat container
  populateHistory() {
    if (this.state.history.length === 0) {
      this.addBotMessage(
        `Hello, I am here to help assist you with any question related to the document: ${this.state?.chatTitle}`
      );
    } else {
      this.state.history.forEach((hist) => {
        this.addUserMessage(hist[0].trim().replace(/question:/i, ''));
        this.addBotMessage(hist[1].trim().replace(/answer:/i, ''));
      });
    }
  }

  // ------------- passer to the send qustion function from the input
  handleGenerateBtn = (e) => {
    e.preventDefault();
    const value = this.promptInput.value;
    this.promptInput.value = '';
    this.sendQuestion(value);
  };

  handleEnterKey = (e) => {
    if (e.key === 'Enter') {
      this.sendQuestion(this.promptInput.value);
      this.promptInput.value = '';
    }
  };

  addBotMessageN = (event) => {
    const message = JSON.parse(event.data);
    const lastBotMessage = document.querySelector('.last-bot-message');
    if (message.event === 'data') {
      // console.log(message.data);
      lastBotMessage.querySelector('.text-to-be-copy').innerText += message.data;

      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    if (message.event === 'source') {
      message.source.forEach((source, i) => {
        const formatedPageContent = window.markdownit().render(source.pageContent);
        this.renderSourceAccordion(formatedPageContent, lastBotMessage, i);
      });
      this.replaceTypingEffect();
    }

    if (message.event === 'error') {
      return console.log(message.error);
    }
  };

  // ---------------------- SENDS QUESTION TO THE BACK END
  sendQuestion(question) {
    this.addUserMessage(question);
    this.addBotMessage('Loading...', true);

    console.log(this.socket.readyState);
    this.socket.send(question);
  }

  // ---------------- RENDERS USER QUESTION
  addUserMessage(message) {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-message message';
    userDiv.innerHTML = message;
    this.chatContainer.appendChild(userDiv);
    // userDiv.scrollIntoView();
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  //--------------- create new html instance for BOT message
  addBotMessage(resultText, load = false) {
    const formatedText = load
      ? `<div class='text-to-be-copy'></div>
        <div class='d-flex justify-content-start loader-chat-bot'>
          <div class='spinner-grow text-primary loader' role='status'>
        </div>`
      : ` <div class='text-to-be-copy'>${resultText}</div>`;

    document.querySelector('.last-bot-message')?.classList.remove('last-bot-message');
    const botDiv = document.createElement('div');
    botDiv.className = 'bot-message message';
    botDiv.innerHTML = formatedText;

    botDiv.classList.add('last-bot-message');
    this.chatContainer.appendChild(botDiv);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;

    // botDiv.scrollIntoView();
  }

  // --------------------- THSI WILL REPLACE THE LOADING BOT WITH THE ACTULA MESSAGE
  replaceTypingEffect() {
    if (currentChat !== this) return;
    document.querySelector('.loader-chat-bot')?.remove();
    document.querySelector('.last-bot-message')?.insertAdjacentHTML(
      'beforeend',
      ` <button class="btn-copy btn btn-outline-primary">
          <i class="bi bi-clipboard2"></i>
        </button>`
    );

    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    // lastBotMessage.scrollIntoView();
  }

  // -------------------- SOURCE RENDERER
  renderSourceAccordion(source, botMessage, i) {
    const containerId = `c-${Date.now()}`;
    const headingId = `h-${Date.now()}`;
    const contentId = `co-${Date.now()}`;
    botMessage.insertAdjacentHTML(
      'beforeend',
      `<div id='${containerId}' class='accordion'>
            <div class='accordion-item'>
              <h2 id='${headingId}' class='accordion-header'>
                <button class='button accordion-button' type="button" data-bs-toggle="collapse" data-bs-target="#${contentId}" aria-expanded="false" aria-controls="${contentId}">
                  Source ${i + 1}
                </button>
              </h2>
              <div id='${contentId}' class='accordion-collapse collapse' aria-labelledby='${headingId}' data-bs-parent="#${containerId}">
                <div class='accordion-body'>${source}</div>
              </div>
            </div>
          </div>`
    );
  }

  // -------------------- COPY BTN HANDLER
  handleCopy = (e) => {
    const copyBtn = e.target.closest('.btn-copy');
    if (!copyBtn) return;

    const text = this.getBotMess(copyBtn);

    navigator.clipboard.writeText(text);

    copyBtn.innerHTML = '<i class="bi bi-clipboard2-check-fill"></i>';
  };

  // ----------------- CONVERSATION DOWNLOADER
  handleDownloadConversation() {
    const conversations = document.querySelectorAll('.message');

    let formatedConversation = '';

    conversations.forEach((mess) => {
      formatedConversation += mess.classList.contains('bot-message')
        ? `BOT: ${this.getBotMess(mess)} \n \n`
        : `USER: ${mess.innerText} \n`;
    });

    const downloadHiddenEl = document.createElement('a');
    downloadHiddenEl.setAttribute(
      'href',
      'data:text/plain;charset=urf-8,' + encodeURIComponent(formatedConversation)
    );
    downloadHiddenEl.setAttribute('download', this.state.chatId + '.txt');
    downloadHiddenEl.style.display = 'none';
    downloadHiddenEl.click();
    downloadHiddenEl.remove();
  }

  // ---------- CURRENT CHAT SETTER
  setCurrentChat(chat) {
    currentChat?.collectGarbage();
    currentChat = chat;
  }

  // ---------- HELPER TO GET BOT MESSAGE
  getBotMess(el) {
    return el.closest('.bot-message').querySelector('.text-to-be-copy').innerText;
  }

  // ------------ GARBAGE COLLECTOR
  collectGarbage() {
    this.socket.close();
    this.generateBtn.removeEventListener('click', this.handleGenerateBtn);
    this.promptInput.removeEventListener('keyup', this.handleEnterKey);
    this.chatContainer.removeEventListener('click', this.handleCopy);
  }
}

export default Chat;

export function resetMessageInputContainer() {
  document.querySelector('.messages-container').remove();
  messagesInputContainer.insertAdjacentHTML(
    'afterbegin',
    `<div class='messages-container'>
        <div class='d-flex justify-content-center chat-loader hidden'>
          <div class='spinner-grow text-primary loader' role="status"></div> 
        </div>
      </div>`
  );
}

/*; */
