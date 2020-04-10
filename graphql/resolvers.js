const Invoice = require('../models/invoice');
const Product = require('../models/product');
const Customer = require('../models/customer');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const productSave = (el) => {
    return new Promise(async (resolve, reject) => {
        if(el._id){
            let newProduct;
            try{
                newProduct = await Product.findById(el._id)
            }
            catch{
                const error = new Error('Product not found.');
                error.statusCode = 404;
                throw error;
            }

            newProduct.quantity = newProduct.quantity - el.quantity;
            await newProduct.save()                       
            resolve({
                product: el._id,
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
        const allInvoices = await Invoice.find().populate('customer').populate('order.product')
        const newAllInvoices = allInvoices.map(invoice => invoice._doc).map(el => {
            return{
                ...el,
                date: el.date.toISOString()
            }
        })
        return newAllInvoices
    },
    getInvoice: async function({id}, req){
        let singleInvoice;
        try{
            const newSingleInvoice = await Invoice.findById(id).populate('customer').populate('order.product');
            singleInvoice = newSingleInvoice._doc;
            singleInvoice.date  = singleInvoice.date.toISOString()
        }
        catch{
            const error = new Error('Invoice not found.');
            error.statusCode = 404;
            throw error;
        }
        
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
            error.statusCode = 422;
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
    editInvoice: async function({id, invoiceInput}, req){
        //First we check if the invoice _id exists.
        let invoice;
        try{
            invoice = await Invoice.findById(id);
        }catch{
            const error = new Error('Invoice with given ID doesnt exists.')
            error.statusCode = 404
            throw error;
        }   

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
            error.statusCode = 422;
            throw error;
          }
        //Then we check if the invoice_nr is equal to the previous one if not
        //then we check if it isnt already used in other document.      
        if(invoiceInput.invoice_nr != invoice.invoice_nr){
            const invoiceArr = await Invoice.find().where('invoice_nr', invoiceInput.invoice_nr)
    
            if(invoiceArr.length != 0){
                const error = new Error('Invoice number is already used')
                error.statusCode = 409
                throw error;
            }
        }  

        // then we need to check if we need to add new customer, or just pick it up from the db.

        if(customerData._id){
            invoice.customer = customerData._id;
        }else{
            const customer = new Customer({
                name: customerData.name,
                nip: customerData.nip,
                city: customerData.city,
                street: customerData.street
            })
            await customer.save()
            customerId = customer._id;
        }

        //Now we splice all orders from the array but before that
        //we recalculate all the existing products in warehouse
        
        const productCalc = (el) => {
            return new Promise(async (resolve,reject)=>{
                const product = await Product.findById(el.product);
                product.quantity += el.quantity;
                await product.save()
                resolve() 
            })
        }
        await Promise.all(invoice.order.map(async el => await productCalc(el)))

        invoice.order = await Promise.all(orderData.map( async el => await productSave(el)))
        invoice.invoice_nr = invoiceInput.invoice_nr; 
        invoice.date = invoiceInput.date;
        invoice.total_price = invoiceInput.total_price;
        
        await invoice.save()  
        return {message: 'Invoice updated successfully'}
    },
    getCustomers: async function(args, req){
        const allCustomers = await Customer.find();
        return allCustomers
    },
    getCustomer: async function({id}, req){
        let singleCustomer;
        try{
            singleCustomer = await Customer.findById(id);
        }
        catch{
            const error = new Error('Customer not found.');
            error.statusCode = 404;
            throw error;
        }
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
            error.statusCode = 422;
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
    editCustomer: async function({id, customerInput}, req){
        const errors = []
        if(validator.isEmpty(id)){
            errors.push({message: 'Customer ID is required.'})
        }
        if(validator.isEmpty(customerInput.name)
        || validator.isEmpty(customerInput.nip.toString())
        || validator.isEmpty(customerInput.street)
        || validator.isEmpty(customerInput.city)){
            errors.push({message: 'Customer data is incomplete.'})
        }
        if(errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }

        let customer = await Customer.findById(id);
        if(!customer){
            const error = new Error('Customer not found.');
            error.statusCode = 404;
            throw error;
        }

        customer.name = customerInput.name;
        customer.nip = customerInput.nip;
        customer.city = customerInput.city;
        customer.street = customerInput.street;

        await customer.save();

        return{message: 'Customer updated successfully'}
    },
    delCustomer: async function({id}, req){
        const errors = []
        if(validator.isEmpty(id)){
            errors.push({message: 'Customer ID is required.'})
        }
        if(errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }
        const customer = await Customer.exists({_id: id});
        if(!customer){
            const error = new Error('Customer not found.');
            error.code = 404;
            throw error;
        };
        const customerInvoices = await Invoice.find().where('customer', id)
        if(customerInvoices.length > 0){
            const invoiceNr = customerInvoices[0].invoice_nr;
            const error = new Error(`Nie można usunąć klienta, ponieważ jest powiązany z fakturą nr: ${invoiceNr}.`);
            error.statusCode = 444;
            throw error;
        }
        await Customer.findByIdAndDelete(id)

        return{message: 'Klient został usunięty.'}
    },
    getProducts: async function(args, req){
        const allProducts = await Product.find();
        return allProducts
    },
    getProduct: async function({id}, req){
        let singleProduct;
        try{
            singleProduct = await Product.findById(id);
        }
        catch{
            const error = new Error('Product not found.');
            error.statusCode = 404;
            throw error;
        }
        return singleProduct
    },
    addProduct: async function({productInput}, req){
        const errors = []
        if(validator.isEmpty(productInput.name)
        || validator.isEmpty(productInput.quantity.toString())
        || validator.isEmpty(productInput.price.toString())){
            errors.push({message: 'Product data is incomplete.'})
        }
        if(errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }

        const product = new Product({
            name: productInput.name,
            brand: productInput.brand,
            model: productInput.model,
            price: productInput.price,
            quantity: productInput.quantity
        })

        await product.save()
        return{message: 'Product saved successfully'}
    },
    editProduct: async function({id, productInput}, req){
        const errors = []
        if(validator.isEmpty(id)){
            errors.push({message: 'Product ID is required.'})
        }
        if(validator.isEmpty(productInput.name)
        || validator.isEmpty(productInput.quantity.toString())
        || validator.isEmpty(productInput.price.toString())){
            errors.push({message: 'Product data is incomplete.'})
        }
        if(errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }

        let product;
        try{
            product = await Product.findById(id);
        }catch{
            const error = new Error('Product not found.');
            error.statusCode = 404;
            throw error;
        }

        product.name = productInput.name;
        product.quantity = productInput.quantity;
        product.price = productInput.price;
        product.brand = productInput.brand ? productInput.brand : product.brand;
        product.model = productInput.model ? productInput.model : product.model;

        await product.save();

        return{message: 'Product updated successfully'}
    },
    delProduct: async function({id}, req){
        const errors = []
        if(validator.isEmpty(id)){
            errors.push({message: 'Product ID is required.'})
        }
        if(errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }
        const product = await Product.exists({_id: id});
        if(!product){
            const error = new Error('Product not found.');
            error.statusCode = 404;
            throw error;
        };
        const productInvoices = await Invoice.find().where('order.product', id)
        if(productInvoices.length > 0){
            const invoiceNr = productInvoices[0].invoice_nr;
            const error = new Error(`Nie można usunąć produktu, ponieważ jest powiązany z fakturą nr: ${invoiceNr}.`);
            error.statusCode = 444;
            error.code = 444;
            throw error;
        }
        await Product.findByIdAndDelete(id)

        return{message: 'Produkt został usunięty.'}
    },
    
}