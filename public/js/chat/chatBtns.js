import { removeProgress, showProgress } from '../reusables/showProgressBtn.js';
import showError from '../reusables/showError.js';
import makeRequest from '../reusables/fetch.js';
import { showAlert } from '../reusables/alert.js';
import { uploadPdf } from '../uploadN.js';
import Chat, { resetMessageInputContainer, currentChat } from './chatN.js';

const sidebar = document.querySelector('.upload-chat-btn-container');

const baseUrl = '/api/v1/pdf/';
let handler;

const chatToolsHtml = `
      <div class="chat-tools">
        <buton class="btn-add-document btn btn-tool">
          <i class="bi bi-journal-plus"></i>
          <input id="add-file" type="file" hidden="" accept=".pdf,.txt">
        </buton>
        <buton class="btn-reset-chat btn btn-tool">
          <i class="bi bi-arrow-counterclockwise"></i>
        </buton>
        <buton class="btn-download-chat btn btn-tool">
          <i class="bi bi-download"></i>
        </buton>
      </div>`;

async function handleDeleteChat(e) {
  const targetBtn = e.target.closest('.btn-delete-chat');
  const { chatid } = targetBtn.closest('.chat-btn-delete-container').dataset;
  try {
    let time = 3;
    targetBtn.classList.remove('btn-delete-chat');
    const handleInterval = () => {
      targetBtn.innerHTML = `<i class="bi bi-arrow-90deg-left">${time}</i>`;
      time--;
    };

    handleInterval();
    const intervalId = setInterval(handleInterval, 1000);
    const timeoutId = setTimeout(deleteChat, time * 1100, targetBtn, chatid, intervalId);

    // binding the intercal id an dtarget btn to the undo handler
    const bindOpt = { intervalId, targetBtn, timeoutId };
    const handler = handleUndo.bind(bindOpt);
    bindOpt.handler = handler;

    targetBtn.addEventListener('click', handler);
  } catch (err) {
    showError(err, targetBtn, `<i class='bi bi-archive'></i> `);
  }
}

export async function handleChatBtns(e) {
  const chatBtn = e.target.closest('.btn-chat');
  const innerHTMLBtn = chatBtn?.innerHTML;
  const deleteChatBtn = e.target.closest('.btn-delete-chat');
  const chatTools = e.target.closest('.chat-tools');

  try {
    if (!chatBtn && !deleteChatBtn && !chatTools) return;
    if (deleteChatBtn) return handleDeleteChat(e);
    if (chatTools) return handleChatTools(e);

    // making previous chatbtn available
    resetPrevActiveBtn();

    showProgress(chatBtn);

    // Disabling current active chat btn
    chatBtn.classList.add('active-chat-btn');

    const chatId = getChatId(chatBtn);
    const { data } = await makeRequest({ url: `${baseUrl}chat/${chatId}` });

    chatBtn
      .closest('.chat-btn-delete-container')
      .insertAdjacentHTML('beforeend', chatToolsHtml);

    const chat = new Chat({ ...data, chatTitle: data.name });

    // setCurrentChat(chat);

    handleSidebarExpandHide();

    removeProgress(chatBtn, innerHTMLBtn);
    showAlert('success', 'Successful on loading your data');
    // setCurrentChat(chat);
    chatBtn.setAttribute('disabled', true);
  } catch (err) {
    showError(err, chatBtn, innerHTMLBtn);
  }
}

function handleUndo(e) {
  // garbage collection
  this.targetBtn.removeEventListener('click', this.handler);
  this.targetBtn.innerHTML = `<i class='bi bi-archive'></i>`;
  clearInterval(this.intervalId);
  clearTimeout(this.timeoutId);

  // adding the class list after the event has bubbled already
  setTimeout(() => {
    this.targetBtn.classList.add('btn-delete-chat');
  }, 1000);
}

// --------- Delete chat
async function deleteChat(btn, chatid, intervalId) {
  clearInterval(intervalId);
  showProgress(btn);

  // DELETE FROM VECTOR DATABASE
  await makeRequest({ method: 'delete', url: `/api/v1/pdf/chat/${chatid}` });

  const container = btn.closest('.chat-btn-delete-container');
  if (container.querySelector('.active-chat-btn')) currentChat.collectGarbage();

  container.classList.add('success-deletion');
  container.innerHTML = `<i class="bi bi-check-circle-fill"></i>`;

  setTimeout(() => {
    container.remove();
  }, 1500);
}

// ------------- render new chat btn
export function renderBtn(chat) {
  resetPrevActiveBtn();

  getSidebar().insertAdjacentHTML(
    'afterbegin',
    `<div class="chat-btn-delete-container" data-chatid=${chat.chatId} data-chattitle=${chat.chatTitle}>
      <div class="btn-chat-delete">
        <button class="btn-sample-pdf btn btn-primary btn-chat active-chat-btn" disabled="true">
          <i class="bi bi-file-earmark-pdf"></i><p>${chat.chatTitle}</p>
        </button>
        <button class="btn-danger btn btn-delete-chat">
          <i class="bi bi-archive"></i>
        </button>
      </div>
      ${chatToolsHtml}
    </div>`
  );
}

export async function handleChatTools(e) {
  if (e.target.closest('#add-file')) return;
  try {
    const addDocumentInput = document.getElementById('add-file');
    if (e.target.closest('.btn-reset-chat')) return handleResetChat(e);
    if (e.target.closest('.btn-download-chat'))
      return currentChat.handleDownloadConversation();

    addDocumentInput.value = '';
    addDocumentInput?.removeEventListener('change', inputChangeHandler);
    addDocumentInput?.addEventListener('change', inputChangeHandler);

    if (e.target.closest('.btn-add-document')) {
      addDocumentInput.click();
      console.log('clicked');
    }
  } catch (err) {}
}

function inputChangeHandler(e) {
  const chatId = getChatId(e.target);

  // e.target.setAttribute('disabled', true);
  addDocument(chatId, e.target);
}

async function addDocument(chatId, inputField) {
  const url = `${baseUrl}adddocument/${chatId}`;

  await uploadPdf({ file: inputField.files[0], endPoint: url, inputField });
}

async function handleResetChat(e) {
  const btnReset = e.target.closest('.btn-reset-chat');
  const chatLoader = document.querySelector('.chat-loader');
  try {
    const chatId = getChatId(e.target);
    btnReset.setAttribute('disabled', true);

    chatLoader?.classList.remove('hidden');

    await makeRequest({ method: 'patch', url: `${baseUrl}chat/${chatId}` });
    resetMessageInputContainer();

    showAlert('success', 'Chat history cleared successfully');
  } catch (err) {
    showAlert(
      'danger',
      err.response?.data?.message || err.message || 'Something went wrong '
    );
  }
  chatLoader?.classList.add('hidden');
  btnReset.removeAttribute('disabled');
}

// ///////////// //
//    HELEPERS  //
//  ////////// //

// helpers
function getChatId(el) {
  return el.closest('.chat-btn-delete-container').dataset.chatid;
}

function resetPrevActiveBtn() {
  const prevActiveBtn = document.querySelector('.active-chat-btn');
  prevActiveBtn
    ?.closest('.chat-btn-delete-container')
    ?.querySelector('.chat-tools')
    ?.remove();

  prevActiveBtn?.classList.remove('active-chat-btn');
  prevActiveBtn?.removeAttribute('disabled');
}

function getSidebar() {
  return document.querySelector('.chat-btn-container');
}

export function handleLeftColHide(e) {
  if (e) if (!e.target.closest('.btn-chat') && !e.target.closest('.close-btn')) return;

  sidebar.classList.add('mobile-hidden');
}

export function handleSidebarExpandHide() {
  sidebar.classList.toggle('mobile-hidden');
}
