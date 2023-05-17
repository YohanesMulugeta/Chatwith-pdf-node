const express = require('express');

const authController = require('../controllers/authController');
const pdfController = require('../controllers/pdfController');

const router = express.Router();

router.use(authController.protect, pdfController.checkTokenLimit);

router
  .route('/processpdf')
  .post(pdfController.uploadPdf, pdfController.parseDoc, pdfController.processDocument);

router
  .route('/adddocument/:chatId')
  .post(pdfController.uploadPdf, pdfController.parseDoc, pdfController.addPdfIntoChat);

router.route('/edittitle/:chatId').post(pdfController.editChatTitle);
// router.route('/clearchathistory/:chatId').post(pdfController.clearChatHistory);

router
  .route('/chat/:chatId')
  .post(pdfController.chat)
  .get(pdfController.getChat)
  .patch(pdfController.clearChatHistory)
  .delete(pdfController.deleteChat);

module.exports = router;
