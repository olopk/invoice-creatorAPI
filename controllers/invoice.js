const Invoice = require('../models/invoice');

const Product = require('../models/product');
const Customer = require('../models/customer');

const productSave = (el) => {
    return new Promise((resolve, reject) => {
        if(el.product_id){
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

exports.addInvoice = (req, res, next) => {
    let customerId;
    Invoice
    .find()
    .where('invoice_nr', req.body.invoice_nr)
    //first we need to check if the invoice number isnt used already.
    .then(invoiceArr => {
        if(invoiceArr.length != 0){
            const error = new Error('Invoice number is already used')
            error.statusCode = 409
            throw error;
        }

        // then we need to check if we need to add new customer, or just pick it up from the db.
        
        if(req.body.customer.customer_id){
            return customerId = req.body.customer.customer_id;
        }else{
            const customer = new Customer({
                name: req.body.customer.name,
                nip: req.body.customer.nip,
                city: req.body.customer.city,
                street: req.body.customer.street
            })
            customerId = customer._id;
            return customer.save()
        }
    })
    .then( async res => {
        let orderList = req.body.order;
        // next, we need to check if all products in order are already in DB, if not, we have to add them.
        let order = await Promise.all(orderList.map( async el => await productSave(el)))
        return order
    })
    .then(order => {
        console.log('second custId', order)

        // Finally we are ready to preapre the Invoice document.
        const invoice = new Invoice({
            invoice_nr: req.body.invoice_nr,
            date: req.body.date,
            customer: customerId,
            order: order,
            total_price: req.body.total_price
        })
    
        console.log(invoice)
    
        return invoice.save()            
    })
    .then(result => {
        res.status(200).json({
            message: 'Invoice saved successfully'
        })
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        res.status(500).json({
            error: err.message
        })
    })
}