const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'please tell us your name ..'] },
  email: {
    type: String,
    required: [true, 'please provide your email ..'],
    unique: true,
    lowerCase: true,
    validate: [validator.isEmail, 'please provide a valid email..'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'please provide your password ..'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'please confirm your password ..'],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'passwords are not the same ..',
    },
  },
  passwordChangeAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); //makin sure the password is created new or updated cause
  //i wont encrybt it if i updated somethingelse
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined; //required input =>not required to be persisted in the DB;
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangeAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (candidatePassword) {
  //compare the password that the client entered with the encrypted password stored in the DB and return t or f
  return await bcrypt.compare(candidatePassword, this.password); //auto compare of normal pass to the db encrypted one
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangeAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangeAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changedTimeStamp;
  }
  return false;
};
userSchema.methods.createPasswordResetToken = function () {
  //we create a reset token which is less secure then we save encrypted this token to the DB along with an expire date
  // we return the original reset token to the user and the saved one is on the DB
  const resetToken = crypto.randomBytes(32).toString('hex'); //not encrypted
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex'); //encrypted version in the DB and we send an email with the original version to the user
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  console.log(resetToken, this.passwordResetToken);
  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
