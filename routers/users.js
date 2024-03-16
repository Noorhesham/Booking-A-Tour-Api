const express = require('express');
const router = express.Router();
const userController = require('../controllers/usersController');
const authController = require('../controllers/authController');
const { default: rateLimit } = require('express-rate-limit');
const AppError = require('../utils/appError');
const { getAllUsers, createUser, getUser, updateUser, deleteUser } =
  userController;

router.post('/signup', authController.signup);
router.post(
  '/login',
  rateLimit({
    windowMs: 1 * 60 * 1000, // 10 minutes
    max: 5, // Max 3 attempts during the windowMs period
    handler: (req, res, next) =>
      next(new AppError('Max login attempts reached. Try again later.', 403)),
  }),
  authController.login
);

router.post('/forgotPassword', authController.forgotPassword); //recieve email
router.patch('/resetPassword/:token', authController.resetPassword); //token + new password

router.use(authController.protect); //runs in sequence so it will run for all the routes under it
router.patch('/updateMyPassword', authController.updatePassword); //token + new password
router.patch('/updateMe', authController.protect, userController.updateMe);
router.get('/me', userController.getMe, userController.getUser);
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));
router.route(`/`).get(getAllUsers).post(createUser);
router.route(`/:id`).get(getUser).patch(updateUser).delete(deleteUser);

module.exports = router;
