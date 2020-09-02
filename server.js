require('dotenv').config({path: __dirname + '/.env'})
// import crucial packages.
const express = require('express');
const mongoose = require('mongoose');
// package for parsing the incoming user data.
const bodyParser = require('body-parser');
// graphql
const graphqlHttp = require('express-graphql');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');

//Auth middleware
const Auth = require('./middlewares/Auth')

var moment = require('moment-timezone');
moment().tz("Europe/Warsaw").format();


// routes import
const authRoutes = require('./routes/auth');
// const invoiceRoutes = require('./routes/invoice');

//import mongodb db credentials.
// const { mongocredentials } = require('./connect');


// call the express instance.
const app = express();
let port = process.env.PORT || 8080;

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use('/graphql', Auth, graphqlHttp({
  schema: graphqlSchema,
  rootValue: graphqlResolver,
  graphiql: false,
  customFormatErrorFn(err) {
    if (!err.originalError) {
      return { message: err.message, code: 500 };
    }
    const data = err.originalError.data;
    const message = err.originalError.message || 'An error occurred.';
    const code = err.originalError.statusCode || 500;

    return { message: message, code: code, data: data };
  }
}))

app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const message = error.message;
  res.status(status).json({ status: "error", message: message });
});

// start the server
mongoose
  .connect(process.env.MONGODB)
  .then(result => {
      app.listen(port, function() {
        console.log('app started');
      });
  })
  .catch(err => { console.log(err);});