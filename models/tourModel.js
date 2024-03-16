const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'tour must have a price'],
      unique: true,
      trim: true,
      maxlength: [40, 'a tour name is too long '],
      minlength: [10, 'a tour name is too short '],
      // validate: [validator.isAlpha, 'tour name should only contain characters'],
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'rating must be above 0'],
      max: [5, '5 is max'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: { type: Number, default: 0 },
    price: { type: Number, required: [true, 'tour must have a price'] },
    discountPrice: {
      type: Number,
      valudate: {
        validator: function (val) {
          return val < this.price;
        },
        message: 'discount must be below ',
      },
    },
    duration: { type: Number, required: [true, 'tour must have a duration'] },
    maxGroupSize: {
      type: Number,
      required: [true, 'tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'tour must have a difficuilty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy meduim difficult',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'tour must have a description'],
    },
    description: { type: String, trim: true },
    imageCover: {
      type: String,
      required: [true, 'tour must have a cover image'],
    },
    images: [String],
    createdAt: { type: Date, default: Date.now(), select: false },
    startDates: [Date],
    slug: String,
    secretTour: { type: Boolean, default: false },
    startLocation: {
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: { type: String, default: 'Point', enum: ['Point'] },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    // reviews: [{ type: mongoose.Schema.ObjectId, ref: 'Review' }],
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// tourSchema.index({ price :1});
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

//runs before save and create commands !insertMany
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});
//Embedding users (Draw Backs)
// tourSchema.pre('save', async function (next) {
//   //Implementing the Embedding for getting the tour guides inside the same Tour document
//   this.guides = await Promise.all(
//     this.guides.map(async (id) => await User.findById(id))
//   );
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v',
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`query took ${Date.now() - this.start} milliseconds`);
  next();
});

//AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function (next) {
  if (!(this.pipeline().length > 0 && '$geoNear' in this.pipeline()[0])) {
    //making sure that the geoNear is not in the pipline before adding the match
    //to filter the secret tours cause geoNear must be the first filed in the pipeline
    this.pipeline().unshift({
      $match: { secretTour: { $ne: true } },
    });
  }
  next();
});

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});
tourSchema.virtual('reviews', {
  //make a virtual field called reviews and make it point/refrence the reviews model the foreignField=>tour the current is the id
  ref: 'Review',
  foreignField: 'tour', //name of field in the other model (review model)
  localField: '_id',
});
const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
