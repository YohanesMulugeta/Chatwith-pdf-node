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
  uloadTokenLimit: {
    type: Number,
    required: [true, 'Plan Must Have an Upload Token limit'],
  },
  conversationTokenLimit: {
    type: Number,
    required: [true, 'Plan Must Have a Conversation Token limit'],
  },
  maxChats: {
    type: Number,
    min: 1,
    required: [true, 'A plan must have maxChats'],
  },
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
