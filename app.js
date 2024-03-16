//requiring our middlewares
const express = require('express');
const morgan = require('morgan');
const tourRouter = require('./routers/toursRouter');
const userRouter = require('./routers/users');
const reviewRouter = require('./routers/reviewsRouter');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const MongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

//creates an instance of the Express application.
const app = express();

//middlewares applied to all routes

app.use(helmet());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//Limiting the Requests
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 100,
  message: 'too many requests from this IP',
});

app.use('/api', limiter);

//app.use means adding a middleware
//reqcognize the incoming request object as JSON
//You DO NOT NEED express.json()  for GET Requests or DELETE Requests.
//middleware to deal with the (incoming) data (object) in the body of the request.
app.use(express.json({ limit: '10kb' }));

//Cleaning the body data (data sanitization aginest NoSql query injection)
app.use(MongoSanitize());
//Cleaning the body data (data sanitization aginest XSS )
app.use(xss());
//Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'price',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
    ],
  })
);

//A built-in middleware function is provided by Express called express. static() that allows you to serve static files from a directory.
//This middleware function takes one argument, which is the name of the directory where your static files are stored.
app.use(express.static(`${__dirname}/public`));

// app.use((req, res, next) => {
//   console.log(req.headers);
//   next();
// });

//applying some operations on a specific route instead of specifying an operation with route and fn everytime
app.use('/api/v1/tours', tourRouter); //using certain middlewares on the app after we called the express.json middleware on the app
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
//if not req is not handled by the other routers we will get to this line of code that catches the undefined routers

app.all('*', (err, req, res, next) => {
  next(new AppError(`cant find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);
module.exports = app;
