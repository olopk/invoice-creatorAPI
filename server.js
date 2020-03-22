//TEMP
const customerController = require('./controllers/customer');
const productController = require('./controllers/product');
const invoiceController = require('./controllers/invoice');

// import crucial packages.
const express = require('express');
const mongoose = require('mongoose');
// package for parsing the incoming user data.
const bodyParser = require('body-parser');
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


// app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use('/auth', authRoutes);
// app.use('/invoice', invoiceRoutes)

// app.post('/product', productController.addProduct)
// app.post('/delproduct', productController.delProduct)
app.post('/invoice', invoiceController.addInvoice)
app.get('/invoices', invoiceController.getInvoices)
app.get('/products', productController.getProducts)
app.get('/customers', customerController.getCustomers)

// route our app
app.get('/', function(req, res) {
  res.send('hello world!');
});

// start the server
mongoose
  .connect('mongodb+srv://ololek:plo@cluster0-0u5ev.mongodb.net/data?retryWrites=true&w=majority')
  .then(result => {
      app.listen(port, function() {
        console.log('app started');
      });
  })
  .catch(err => { console.log(err);  });