const Invoice = require('../models/invoice');
const Product = require('../models/product');
const Customer = require('../models/customer');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');


const productSave = (el) => {
    return new Promise(async (resolve, reject) => {
        if(el.product_id){
            //TODO we need to find the product and minus its quantity.
            const newProduct = await Product.findById(el.product_id);
            newProduct.quantity = newProduct.quantity - el.quantity;
            await newProduct.save()            
            
            resolve({
                product: el.product_id,
                quantity: el.quantity,
                price: el.price,
                total_price: el.total_price
            })
        }else{
            const product = new Product({
                name: el.name,
                quantity: -el.quantity,
                price: el.price,
            })
            product.save()
            .then(res => {
                resolve({
                    product: product._id,
                    quantity: el.quantity,
                    price: el.price,
                    total_price: el.total_price
                })
            })
        }})    
    }


module.exports = {
    getInvoices: async function(args, req){
        const allInvoices = await Invoice.find().populate('customer').populate('order.product');
        return allInvoices
    },
    getInvoice: async function({id}, req){
        const singleInvoice = await Invoice.findById(id).populate('customer').populate('order.product');
        return singleInvoice
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
            || validator.isEmpty(element.price.toString())
            || validator.isEmpty(element.total_price.toString())
            || validator.isEmpty(element.quantity.toString())){
                errors.push({message: 'name, price, total price and quantity is required for each product.'})
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
    },
    getCustomers: async function(args, req){
        const allCustomers = await Customer.find();
        return allCustomers
    },
    getCustomer: async function({id}, req){
        const singleCustomer = await Customer.findById(id);
        return singleCustomer
    },
    addCustomer: async function({customerInput}, req){
        const errors = []
        if(validator.isEmpty(customerInput.name)
        || validator.isEmpty(customerInput.nip.toString())
        || validator.isEmpty(customerInput.city)
        || validator.isEmpty(customerInput.street)){
            errors.push({message: 'Customer data is incomplete.'})
        }
        if(errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.code = 422;
            throw error;
        }

        const customer = new Customer({
            name: customerInput.name,
            nip: customerInput.nip,
            city: customerInput.city,
            street: customerInput.street
        })
        await customer.save()
        return{message: 'Customer saved successfully'}
    },
    getProducts: async function(args, req){
        const allProducts = await Product.find();
        return allProducts
    },
    getProduct: async function({id}, req){
        const singleProduct = await Product.findById(id);
        return singleProduct
    },
    addProduct: async function({productInput}, req){
        const errors = []
        if(validator.isEmpty(productInput.name)
        || validator.isEmpty(productInput.brand)
        || validator.isEmpty(productInput.model)
        || validator.isEmpty(productInput.quantity.toString())
        || validator.isEmpty(productInput.price.toString())){
            errors.push({message: 'Product data is incomplete.'})
        }
        if(errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.code = 422;
            throw error;
        }

        const product = new Product({
            name: el.name,
            brand: el.brand,
            model: el.model,
            price: el.price,
            quantity: el.quantity
        })

        await product.save()
        return{message: 'Product saved successfully'}
    }
}