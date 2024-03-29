const Invoice = require("../models/invoice");
const Product = require("../models/product");
const Customer = require("../models/customer");

const productSave = (el) => {
  return new Promise((resolve, reject) => {
    if (!el.name || !el.quantity || !el.unit_price) {
      const error = new Error(
        "product name, quantity and unit_price is required"
      );
      error.statusCode = 404;
      throw error;
    }
    if (el.product_id) {
      //TODO we need to find the product and minus its quantity.
      resolve({
        product: el.product_id,
        quantity: el.quantity,
        unit_price: el.unit_price,
        total_price: el.total_price,
      });
    } else {
      const product = new Product({
        name: el.name,
        quantity: -el.quantity,
        price: el.unit_price,
      });
      product.save().then((res) => {
        resolve({
          product: product._id,
          quantity: el.quantity,
          unit_price: el.unit_price,
          total_price: el.total_price,
        });
      });
    }
  });
};

exports.addInvoice = (req, res, next) => {
  let customerId;
  Invoice.find()
    .where("invoice_nr", req.body.invoice_nr)
    //first we need to check if the invoice number isnt used already.
    .then((invoiceArr) => {
      if (invoiceArr.length != 0) {
        const error = new Error("Invoice number is already used");
        error.statusCode = 409;
        throw error;
      }

      // then we need to check if we need to add new customer, or just pick it up from the db.
      let customerData = req.body.customer;

      if (
        !customerData.name ||
        !customerData.nip ||
        !customerData.city ||
        !customerData.street
      ) {
        const error = new Error(
          "Customer name,nip,city and street are required!"
        );
        error.statusCode = 404;
        throw error;
      }

      if (customerData.customer_id) {
        return (customerId = customerData.customer_id);
      } else {
        const customer = new Customer({
          name: customerData.name,
          nip: customerData.nip,
          city: customerData.city,
          street: customerData.street,
        });
        customerId = customer._id;
        return customer.save();
      }
    })
    .then(async (res) => {
      let orderList = req.body.order;
      // next, we need to check if all products in order are already in DB, if not, we have to add them.
      let order = await Promise.all(
        orderList.map(async (el) => await productSave(el))
      );
      return order;
    })
    .then((order) => {
      // Finally we are ready to preapre the Invoice document.
      const invoice = new Invoice({
        invoice_nr: req.body.invoice_nr,
        invoice_comment: req.body.invoice_comment,
        date: req.body.date,
        customer: customerId,
        order: order,
        total_price: req.body.total_price,
      });
      return invoice.save();
    })
    .then((result) => {
      res.status(201).json({
        message: "Invoice saved successfully",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
        // err.message = 'Internal server error. Contact your administrator.'
      }
      res.status(err.statusCode).json({
        message: err.message,
      });
    });
};

// TODO
// exports.modInvoice = (req, res, next) => {}

// TODO
// exports.delInvoice = (req, res, next) => {}

exports.getInvoices = (req, res, next) => {
  Invoice.find()
    .populate("customer")
    .populate("order.product")
    .then((invoices) => {
      res.status(200).json([...invoices]);
    });
};
