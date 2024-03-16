const express = require('express');
const reviewController = require('../controllers/reviewsController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true }); //each router has access to his own params
//but we here re route from tours to reviews
router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.protect,
    authController.restrictTo('user'),
    reviewController.setToursUsersId,
    reviewController.createReview
  );
  
router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(
    authController.protect,
    authController.restrictTo('user', 'admin'),reviewController.checkIfAuthor,
    reviewController.deleteReview
  )
  .patch(
    authController.protect,
    authController.restrictTo('user', 'admin'),reviewController.checkIfAuthor,
    reviewController.updateReview
  );

module.exports = router;
