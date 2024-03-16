const mongoose = require('mongoose');

const LoginAttemptSchema =new mongoose.Schema({
  ip: String,
  attempts: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }, // Add updatedAt field
});

const LoginAttempt = mongoose.model('LoginAttempt', LoginAttemptSchema);
module.exports = LoginAttempt;
