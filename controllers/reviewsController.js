const Review = require('../models/reviewModel');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

//POST/tour/id/reviews =>will post a review with the logged in user coming from req.user in the protect method
//nested routes will automatically use the create reviews here in the post request
exports.checkIfAuthor = async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  console.log(review);
  if (req.user.id !== review.user.id && req.user.role !== 'admin')
    return next(new AppError(`You cannot edit someone's else review.`, 403));
  next();
};
exports.getAllReviews = factory.getAll(Review);
exports.setToursUsersId = async (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  // if (!req.body.user) cause if we did that we can allow anyone who has id of any user to post reviews even if he is not him
  req.body.user = req.user.id; //from the protect middleware we but the user as a prop in the req
  next();
};

exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
