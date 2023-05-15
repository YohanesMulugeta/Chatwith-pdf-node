import makeRequest from '../reusables/fetch.js';
import showError from '../reusables/showError.js';

let currentChat;

class Chat {
  promptInput = document.getElementById('user-input');
  generateBtn = document.querySelector('.btn-ask');
  messagesInputContainer = document.querySelector('.chat-container');
  // chatTitle = document.querySelector('.chat-title');
  state = { docName: '', chatTitle: '', history: [] };

  constructor({ chatTitle, docName, _id, chatHistory }) {
    this.state.chatTitle = chatTitle;
    this.state.docName = docName;
    // this.chatTitle.textContent = chatTitle;
    this.state.history = chatHistory ? chatHistory : [];
    this.url = `api/v1/pdf/chat/${_id}`;

    this.setCurrentChat(this);

    this.init();
  }

  init() {
    document.querySelector('.messages-container').remove();
    this.messagesInputContainer.insertAdjacentHTML(
      'afterbegin',
      `<div class='messages-container'></div>`
    );
    this.chatContainer = document.querySelector('.messages-container');
    this.generateBtn.addEventListener('click', this.handleGenerateBtn);
    this.promptInput.addEventListener('keyup', this.handleEnterKey);

    this.populateHistory();
  }

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

  handleGenerateBtn = (e) => {
    e.preventDefault();
    const value = this.promptInput.value;
    this.promptInput.value = '';
    this.sendQuestion(value);
  };

  handleEnterKey = (e) => {
    if (e.key === 'Enter') {
      this.sendQuestion(this.promptInput.value);
    }
  };

  // sendQuestion
  async sendQuestion(question) {
    try {
      this.addUserMessage(question);
      this.addBotMessage('Loading...', true);

      const dataTobeSent = {
        question: question,
        // history: this.state.history,
        docName: this.state.docName,
      };

      const { data } = await makeRequest({ dataTobeSent, url: this.url, method: 'post' });

      this.replaceTypingEffect(data.response.text, data.response.sourceDocuments);
    } catch (err) {
      this.replaceTypingEffect('Something went wrong. Please Try Again!');
      showError(err, this.generateBtn, 'Try Again!');
      setTimeout(() => {
        this.generateBtn.innerHTML = `<i class='bi bi-send'></i>`;
      });
      // location.reload(true);
    }
  }

  addUserMessage(message) {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-message message';
    userDiv.innerHTML = message;
    this.chatContainer.appendChild(userDiv);
    // userDiv.scrollIntoView();
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  //create new html instance for BOT message
  addBotMessage(resultText, load = false) {
    const formatedText = load
      ? `<div class='d-flex justify-content-start loader-chat-bot'>
              <div class='spinner-grow text-primary loader' role='status'></div>
          </div>`
      : window.markdownit().render(resultText);

    document.querySelector('.last-bot-message')?.classList.remove('last-bot-message');
    const botDiv = document.createElement('div');
    botDiv.className = 'bot-message message';
    botDiv.innerHTML = formatedText;

    botDiv.classList.add('last-bot-message');
    this.chatContainer.appendChild(botDiv);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;

    // botDiv.scrollIntoView();
  }

  replaceTypingEffect(botText, sourceDocuments) {
    const lastBotMessage = document.querySelector('.last-bot-message');
    const formatedText = window.markdownit().render(botText);
    lastBotMessage.innerHTML = formatedText;

    if (sourceDocuments)
      sourceDocuments.forEach((source, i) => {
        const formatedPageContent = window.markdownit().render(source.pageContent);
        this.renderSourceAccordion(formatedPageContent, lastBotMessage, i);
      });

    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    // lastBotMessage.scrollIntoView();
  }

  collectGarbage() {
    this.generateBtn.removeEventListener('click', this.handleGenerateBtn);
    this.promptInput.removeEventListener('keyup', this.handleEnterKey);
  }

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

  setCurrentChat(chat) {
    currentChat?.collectGarbage();
    currentChat = chat;
  }
}

export default Chat;
