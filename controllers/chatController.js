const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { PineconeStore } = require('langchain/vectorstores/pinecone');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');

const User = require('../model/userModel');
const makeChain = require('../util/makeChain');
const { pineconeClient } = require('../util/ReadAndFormatPdf');
const AppError = require('../util/AppError');

// ------------------------ WEBSOCKET Chat
exports.chat = async (ws, req) => {
  try {
    const user = await checkLoginStatus(req);

    const { chatId } = req.params;
    const { vectorName: nameSpace, indexName } = await user.chats.id(chatId);
    // OPEN-AI recommendation to replace new lines with space

    await pineconeClient.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
    });

    const pineconeIndex = pineconeClient.Index(
      indexName || process.env.PINECONE_INDEX_NAME
    );

    // vectore store
    const vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings(), {
      pineconeIndex,
      namespace: nameSpace,
    });

    // Get chat history

    // question and answer
    ws.on('message', async (question) => {
      try {
        const userN = await User.findById(user._id).select('+chats.chatHistory');

        // Check users subscription status
        await checkSubscriptionStat(userN, question);

        const chatHistory = userN.chats.id(chatId).chatHistory.slice(-5);

        // Cut the creation of new question from reaching to the user
        let space = 0;
        const streamHandler = {
          handleLLMNewToken(token) {
            if (space < 2 && chatHistory.length > 0) {
              // console.log(token, '/////////');
              if (token === '') space += 1;
              else space = 0;
              return;
            }

            ws.send(JSON.stringify({ data: token, event: 'data' }));
          },
        };

        const chain = makeChain(vectorStore, streamHandler);

        //Ask a question using chat history
        const sanitizedQuestion = question.replace('/n', ' ').trim();

        // call the chain for new questions
        const response = await chain.call({
          question: sanitizedQuestion,
          chat_history: chatHistory,
        });

        // ---------- Sending the source with source event
        ws.send(JSON.stringify({ source: response.sourceDocuments, event: 'source' }));

        await userN.updateConversationTokens(
          (response.text.length + sanitizedQuestion.length) / 4
        );

        // Updating users chat history
        userN.chats
          .id(chatId)
          .chatHistory.push([`Question: ${question}`, `Answer: ${response.text}`]);

        userN.updateChatModifiedDate(chatId);
      } catch (err) {
        // ------ Handle Errors
        ws.send(
          JSON.stringify({
            event: 'error',
            error: err.message,
            statusCode: err.statusCode ? err.statusCode : 500,
          })
        );
      }
    });
  } catch (err) {
    ws.send(
      JSON.stringify({
        event: 'error',
        error: err.message,
        statusCode: err.statusCode ? err.statusCode : 500,
      })
    );
  }
};

// /////////// //
//    HELPERS //
// ////////// //

// Checks login Status
async function checkLoginStatus(req) {
  // ------------------- Check if user is logged in or not
  const token = req.cookies.jwt;

  if (!token)
    throw new AppError(
      'You are not loged in. Please login or register and try again.',
      401
    );
  const { id, iat } = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const user = await User.findById(id).select('+password');

  if (!user)
    throw new AppError(
      'There is no user with this token. Pleaase login and try again.',
      400
    );

  if (user.isPassChangedAfter(iat))
    throw new AppError(
      'You have changed password recently. Please login again to get access.',
      401
    );

  if (
    user.subscriptionUpdatedAt.getTime() / 1000 <=
    (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
  ) {
    user = await user.resetUser();
  }

  return user;
}

// ------------- Check token and subscription stat
async function checkSubscriptionStat(user, question) {
  if (!user.subscription)
    throw new AppError('Please Subscribe to one of our plans to get going.', 400);

  if (user.conversationTokens < question.length / 4)
    throw new AppError(
      'You have finished your conversational tokens, Please upgrade to continue',
      400
    );
}
