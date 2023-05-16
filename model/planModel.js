const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan must have a name'],
    unique: true,
    lowercase: true,
  },
  price: { type: Number, required: [true, 'Plan must have a price'] },
  //   pricePerY: { type: Number, required: [true, 'Plan must have a price'] },
  tokenLimit: { type: Number, required: [true, 'Plan must have a Token limit'] },
  maxMultipleChats: {
    type: Number,
    min: 0,
    required: [true, 'Subscription Must have max allowed chats with multiple pdfs'],
  },
  maxDocPerChat: {
    type: Number,
    default: 1,
    min: 0,
  },
  maxChats: {
    type: Number,
    min: 1,
    required: [true, 'A plan must have maxChats'],
  },
  questionsPerDay: {},
  uploadsPerDay: {},
  maxChats: {},
  description: {
    type: String,
    // required: [true, 'Plan must have description']
  },
});

planSchema.pre(/^find/, function (next) {
  this.sort('-price');

  next();
});

const Plan = mongoose.model('plan', planSchema);

module.exports = Plan;
