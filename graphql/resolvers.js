const Invoice = require('../models/invoice');
const Product = require('../models/product');
const Customer = require('../models/customer');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');


const productSave = (el) => {
    return new Promise((resolve, reject) => {
        if(el.product_id){
            //TODO we need to find the product and minus its quantity.
            resolve( {
                product: el.product_id,
                quantity: el.quantity,
                unit_price: el.unit_price,
                total_price: el.total_price
            })
        }else{
            const product = new Product({
                name: el.name,
                quantity: -el.quantity,
                price: el.unit_price,
            })
            product.save()
            .then(res => {
                resolve({
                    product: product._id,
                    quantity: el.quantity,
                    unit_price: el.unit_price,
                    total_price: el.total_price
                })
            })
        }})    
    }


module.exports = {
    getInvoices() {
        Invoice
        .find()
        .populate('customer')
        .populate('order.product')
        .then(invoices =>{
            res.status(200).json([
                ...invoices
            ])
        })
    },
    addInvoice: async function({invoiceInput}, req){
        const orderData = invoiceInput.order;
        const customerData = invoiceInput.customer;
        const errors = [];
        // First we make a cumbersome validation..
        if(validator.isEmpty(invoiceInput.invoice_nr)
         || validator.isEmpty(invoiceInput.date)
         || validator.isEmpty(invoiceInput.total_price.toString())){
             errors.push({message: 'Invoice_nr, date and total_price are required'})
         }

         if(validator.isEmpty(customerData.name)
         || validator.isEmpty(customerData.nip.toString())
         || validator.isEmpty(customerData.city)
         || validator.isEmpty(customerData.street)){
             errors.push({message: 'Customer data is incomplete.'})
         }

        orderData.forEach(element => {
            if(validator.isEmpty(element.name)
            || validator.isEmpty(element.unit_price.toString())
            || validator.isEmpty(element.total_price.toString())
            || validator.isEmpty(element.quantity.toString())){
                errors.push({message: 'name, unit price, total price and quantity is required for each product.'})
            }
        });
        if(errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.code = 422;
            throw error;
          }
        //Then we check if the invoice_nr isnt already used.      
     
        const invoiceArr = await Invoice.find().where('invoice_nr', invoiceInput.invoice_nr)

        if(invoiceArr.length != 0){
            const error = new Error('Invoice number is already used')
            error.statusCode = 409
            throw error;
        }

        // then we need to check if we need to add new customer, or just pick it up from the db.
        let customerId;

        if(customerData.customer_id){
            customerId = customerData.customer_id;
        }else{
            const customer = new Customer({
                name: customerData.name,
                nip: customerData.nip,
                city: customerData.city,
                street: customerData.street
            })
            customerId = customer._id;
            await customer.save()
        }

        // next, we need to check if all products in order are already in DB, if not, we have to add them.
        let order = await Promise.all(orderData.map( async el => await productSave(el)))

        // Finally we are ready to preapre the Invoice document.
        const invoice = new Invoice({
            invoice_nr: invoiceInput.invoice_nr,
            date: invoiceInput.date,
            customer: customerId,
            order: order,
            total_price: invoiceInput.total_price
        })   
        
        await invoice.save()  
        return {message: 'Invoice saved successfully'}
    }
}