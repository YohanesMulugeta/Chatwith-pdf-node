import { removeProgress, showProgress } from '../reusables/showProgressBtn.js';
import Chat from './chatN.js';
import showError from '../reusables/showError.js';
import makeRequest from '../reusables/fetch.js';
import { showAlert } from '../reusables/alert.js';

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
  try {
    if (!chatBtn && !deleteChatBtn) return;
    if (deleteChatBtn) return handleDeleteChat(e);

    // making previous chatbtn available
    const prevActiveBtn = document.querySelector('.active-chat-btn');

    showProgress(chatBtn);

    prevActiveBtn?.classList.remove('active-chat-btn');
    prevActiveBtn?.removeAttribute('disabled');

    // Disabling current active chat btn
    chatBtn.classList.add('active-chat-btn');

    // console.log(chatBtn);

    const chatId = chatBtn.closest('.chat-btn-delete-container').dataset.chatid;
    const { data } = await makeRequest({ url: `/api/v1/pdf/chat/${chatId}` });

    const chat = new Chat({ ...data, chatTitle: data.name });
    // setCurrentChat(chat);

    removeProgress(chatBtn, innerHTMLBtn);
    showAlert('success', 'Successful on loading your data');
    // setCurrentChat(chat);
    chatBtn.setAttribute('disabled', true);
  } catch (err) {
    showError(err, chatBtn, innerHTMLBtn);
  }
}

// ///////////// //
//    HELEPERS  //
//  ////////// //

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

async function deleteChat(btn, chatid, intervalId) {
  clearInterval(intervalId);
  showProgress(btn);
  console.log(chatid);

  // DELETE FROM VECTOR DATABASE
  await makeRequest({ method: 'delete', url: `/api/v1/pdf/chat/${chatid}` });

  const container = btn.closest('.chat-btn-delete-container');

  container.classList.add('success-deletion');
  container.innerHTML = `<i class="bi bi-check-circle-fill"></i>`;

  setTimeout(() => {
    container.remove();
  }, 1500);
}

export function renderBtn(chat) {
  getSidebar().insertAdjacentHTML(
    'afterbegin',
    `
      <div class='chat-btn-delete-container' data-docname=${chat[0]} data-chattitle=${chat[1].chatTitle}>
        <button class='btn-sample-pdf btn btn-primary btn-chat'>
          <i class='bi bi-file-earmark-pdf'></i> ${chat[1].chatTitle}
        </button>
        <button class='btn-danger btn btn-delete-chat'>
          <i class='bi bi-archive'></i> 
        </button>
      </div>`
  );
}

function getSidebar() {
  return document.querySelector('.chat-btn-container');
}

export function handleLeftColHide(e) {
  if (e) if (!e.target.closest('.btn-chat') && !e.target.closest('.close-btn')) return;

  chatColumnLeft.classList.add('mobile-hidden');
}
