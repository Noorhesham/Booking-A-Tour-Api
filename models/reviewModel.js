const { Schema, Mongoose, model } = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new Schema(
  {
    review: { type: String, required: [true, 'review cannot be empty'] },
    createdAt: { type: Date, default: Date.now() },
    rating: { type: Number, min: 1, max: 5 },
    tour: {
      type: Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'review must belong to a tour'],
    },
    user: {
      type: Schema.ObjectId,
      ref: 'User',
      required: [true, 'review must belong to a user'],
    },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
reviewSchema.pre(/^find/, function (next) {
  //   this.populate({ path: 'tour', select: 'name ' }).populate({
  //     path: 'user',
  //     select: 'name photo',
  //   });
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});
//we call this method on the schema before we actually create the document from the model
//this here points to the review
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  console.log(stats); //the id is equal to the tourId and the rating is equal of number of the reviews on that tour
  // the avgRating is equal to the avg rating
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};
reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); //the user and the tour of each review compined must be unique
reviewSchema.post('save', function (next) {
  //this points to current review
  this.constructor.calcAverageRatings(this.tour);
});
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne(); //getting the document from the query and save the document
  console.log(this.r, this.r.constructor);
  next();
});
reviewSchema.post(/^findOneAnd/, async function () {
  this.r.constructor.calcAverageRatings(this.r.tour);
  console.log(this.r, this.r.constructor);
});

const Review = model('Review', reviewSchema);
module.exports = Review;
