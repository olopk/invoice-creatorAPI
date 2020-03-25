// import crucial packages.
const express = require('express');
const mongoose = require('mongoose');
// package for parsing the incoming user data.
const bodyParser = require('body-parser');
// graphql
const graphqlHttp = require('express-graphql');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');


// routes import
const authRoutes = require('./routes/auth');
// const invoiceRoutes = require('./routes/invoice');


// call the express instance.
const app = express();
const port = 8080;


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use('/graphql', graphqlHttp({
  schema: graphqlSchema,
  rootValue: graphqlResolver,
  graphiql: true,
  customFormatErrorFn(err) {
    if (!err.originalError) {
      return err;
    }
    const data = err.originalError.data;
    const message = err.message || 'An error occurred.';
    const code = err.originalError.code || 500;
    return { message: message, status: code, data: data };
  }
}))

app.use(bodyParser.json());
// app.use('/auth', authRoutes);

// start the server
mongoose
  .connect('mongodb+srv://ololek:plo@cluster0-0u5ev.mongodb.net/data?retryWrites=true&w=majority')
  .then(result => {
      app.listen(port, function() {
        console.log('app started');
      });
  })
  .catch(err => { console.log(err);  });