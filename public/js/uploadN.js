import showError from './reusables/showError.js';
import { showProgress, removeProgress } from './reusables/showProgressBtn.js';
import { showAlert } from './reusables/alert.js';
import makeRequest from './reusables/fetch.js';
import Chat from './chat/chatN.js';
import { handleLeftColHide, handleSidebarExpandHide } from './chat/chatBtns.js';

const loader = document.querySelector('.loader-upload')?.querySelector('.loader');
const input = document.querySelector('input[type="file"]');

export function setChatTitle(title) {
  // document.querySelector('.chat-title')?.textContent = title;
}

export default async function fetchAndDisplay(fileContainer, isFile = false) {
  input.setAttribute('disabled', true);
  const file = isFile ? fileContainer : fileContainer.dataTransfer.items[0].getAsFile();
  const fileReader = new FileReader();

  fileReader.onload = async function () {
    try {
      // progress indicators
      loader.style.display = 'block';
      const { type } = file;
      if (type !== 'application/pdf' && type !== 'text/plain')
        throw new Error(`This file format ${type} is not supported.`);

      const text =
        type === 'application/pdf'
          ? await extractTextFromPdf(file)
          : await extractTextFromTxt(file);

      // return console.log(file.type);
      //   console.log(file);
      //   dataTobeSent.text = text;
      const dataTobeSent = {
        text,
        originalName: file.name,
      };

      const data = await makeRequest({
        dataTobeSent,
        method: 'post',
        url: `/api/v1/pdf/processpdf`,
      });

      // {chatId, chatTitle,docName} = data

      //   Creating new chat instance and removing the already existed one
      new Chat(data);

      // Progress Indicators
      showAlert('success', 'Successful on uploading your document!');
      // handleSidebarExpandHide();
      handleLeftColHide();
      loader.style.display = 'none';
      input.removeAttribute('disabled');
      setTimeout(() => {
        // samplePdf.innerHTML = 'Yohanes Mulugeta';
        setChatTitle(data.chatTitle);
      }, 1000);
    } catch (err) {
      input.removeAttribute('disabled');
      const message = err.response?.data?.message || err.message;
      showAlert('danger', message);

      loader.style.display = 'none';
    }
  };
  fileReader.readAsArrayBuffer(file);
}

// /////////////////// //
//      HELPERS        //
// ////////////////// //

// --------------- from pdf
async function extractTextFromPdf(file) {
  const typedArray = new Uint8Array(await file.arrayBuffer());
  const pdfDocument = await pdfjsLib.getDocument({ data: typedArray }).promise;

  const textContent = [];

  if (pdfDocument.numPages > 50) throw new Error('Please dont use large pdfs. Thank you');

  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    textContent.push(await page.getTextContent());
  }

  const text = textContent.map((content) => {
    return content.items.map((item) => item.str).join('');
  });
  return text.join('');
}

// ------------ form txt
async function extractTextFromTxt(file) {
  const text = await file.text();
  return text;
}
/////////////////l//////////////////////
