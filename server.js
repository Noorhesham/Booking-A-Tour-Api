const dotenv = require('dotenv');
const app = require('./app');
const Mongoose = require('mongoose');

process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('unchaught exception!shutting down');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
Mongoose.connect(process.env.DATABASE, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
}).then(() => console.log('DB connected succesfully !'));

const port = process.env.PORT;
const server = app.listen(port);

process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
