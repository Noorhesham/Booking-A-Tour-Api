const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchErorr');
const factory = require('./handlerFactory');

const filteredObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(
    (key) => allowedFields.includes(key) && (newObj[key] = obj[key])
  );
  //create a new field in the new object which value is the value of that field in the old object
  //this applies only if that field in allowed in the arr
  return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //1)no password updates to this route
  if (req.body.password || req.body.passwordConfirm)
    return next(new AppError('you cannot update password in this route', 400));
  //2)update user doc
  const updatedData = filteredObj(req.body, 'name', 'email');
  const updatedUser = await User.findByIdAndUpdate(req.user.id, updatedData, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({ status: 'success', data: updatedUser });
});
exports.deleteMe = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.user._id, { active: false });
  res.status(204).json({ status: 'success', data: null });
});

exports.createUser = async (req, res, next) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined ! please signup instead',
  });
};

exports.getMe = async (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
