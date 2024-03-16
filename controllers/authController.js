const User = require('../models/userModel');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchErorr');
const AppError = require('../utils/appError');
const { promisify } = require('util');
const sendEmail = require('../utils/email');

const generateToken = (id) => {
  //generate a jwt that takes the id of user as payload , secret ,expirey date
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
const sendResponse = (res, user, code) => {
  const token = generateToken(user._id);
  const cookieOptions = {
    expires:
      new Date(Date.now() + process.env.COOKIE_EXPIRES_IN) *
      24 *
      60 *
      60 *
      1000,
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production ') cookieOptions.secure = true;
  user.password = undefined;
  res.cookie('jwt', token, cookieOptions);
  res.status(code).json({ status: 'success', token, data: { user } });
};
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangeAt: req.body.passwordChangeAt,
    role: req.body.role,
  });
  sendResponse(res, newUser, 201);
});

// exports.checkLogin = catchAsync(async (req, res, next) => {
//   const ip = req.ip;
//   const loginAttempt = await LoginAttempt.findOne({ ip });
//   console.log(loginAttempt);

//   if (loginAttempt && loginAttempt.attempts >= 4) {
//     const currentTime = new Date();
//     const lastAttemptTime = loginAttempt.updatedAt || currentTime;

//     // Check if 24 hours have passed since the last login attempt
//     const minutesPassed = Math.abs(currentTime - lastAttemptTime) / 6e4;
//     console.log(minutesPassed);
//     if (minutesPassed >= 4) {
//       // Reset login attempts
//       console.log(loginAttempt.attempts);
//       loginAttempt.attempts = 0;
//       loginAttempt.updatedAt = Date.now();
//       await loginAttempt.save();
//     } else {
//       // Max login attempts reached within 24 hours, block login
//       return next(
//         new AppError(`Max login attempts reached. Try again later.`, 403)
//       );
//     }
//   }
//   // Continue with the login process
//   next();
// });

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // if email && pass exists
  if (!email || !password) {
    return next(new AppError('provide email & password', 400));
  }
  
  // const ip = req.ip;
  // let loginAttempt = await LoginAttempt.findOne({ ip });
  // console.log({ loginAttempt });
  // if (!loginAttempt) {
  //   loginAttempt = new LoginAttempt({ ip });
  // }

  // loginAttempt.attempts += 1;
  // await loginAttempt.save();
  //user exists & pass correct
  //we search our DB for a user that has that email then we add the password prop that we deselected it in the schema again
  const user = await User.findOne({ email }).select('+password'); //not selected by default
  //i find the user using the email and the user had the password encrypted in the DB so
  //i will compare the password the client written with the bcrypt compare fn
  console.log(user);
  if (!user || !(await user.correctPassword(password))) {
    return next(new AppError('incorrect email or password', 401));
  }

  //if everything ok send the jwt back to client
  sendResponse(res, user, 200);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1)get the token from the header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]; //gettin the token from the header
  }

  if (!token) return next(new AppError('You are not logged in ..', 401));
  //2)verification
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); //verify the token
  //3)if user exists
  const user = await User.findById(decoded.id); //get user by token payload (id)
  console.log(user);
  if (!user) return next(new AppError('user no longer exists ', 401));
  //4) if user changed his password
  if (user.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'User recently changed his password ! please login again...',
        401
      )
    );
  }
  req.user = user; //access it in the next middleware
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log(roles.includes(req.user), req.user);
    if (!roles.includes(req.user.role))
      return next(
        new AppError('you do not have permission to perform this action', 403)
      );
    next();
  };
};
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)get user based on email
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('user not found', 404));
  //2)generate random reset token
  const resetToken = user.createPasswordResetToken(); //The original token
  await user.save({ validateBeforeSave: false }); //adding new props of password to the user save to DB
  //3)send it to users email
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;
  //send an email to the user that has url which uncludes the reset token non encrypted one
  const message = `Forgot your password?submit a patch request with your new password and password confirm to ${resetUrl}.\nif you did not forget your password please ignore this email.`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'your password reset token (valid for 10 minutes)',
      message,
    });
    res.status(200).json({
      status: 'sucess',
      message: 'token sent successfully to email address',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return new AppError('error sending email try again later!', 500);
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1)get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex'); //encrypt the token and search the db for that user
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //2)set new password if user exists and token not expired
  if (!user) return next(new AppError('Token is invalid', 400));
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); //do not turn off validators
  sendResponse(res, user, 200);
  //3)updated changedpasswordat for the user
  //4)login the user. send the jwt for the client
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { passwordCurrent, password, passwordConfirm } = req.body;
  //1)get user from collection
  const user = await User.findById(req.user.id).select().select('+password');

  //2)posted password is correct
  if (!(await user.correctPassword(passwordCurrent)))
    return next(new AppError('password is not correct', 401));
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();
  //3)log the user in
  sendResponse(res, user, 200);
});
