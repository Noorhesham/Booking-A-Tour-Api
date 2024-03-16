const { Schema, Mongoose, model } = require('mongoose');
const likesSchema = new Schema(
  {
    like: { type: Number, },
    createdAt: { type: Date, default: Date.now() },
    review: {
      type: Schema.ObjectId,
      ref: 'Review',
      required: [true, 'like must belong to a review'],
    },
    user: {
      type: Schema.ObjectId,
      ref: 'User',
      required: [true, 'like must belong to a user'],
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
const Like = model('Like', likesSchema);
module.exports = Like;
