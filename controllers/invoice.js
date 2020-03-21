const Invoice = require('../models/invoice');

const Product = require('../models/product');
const Customer = require('../models/customer');

exports.addInvoice = (req, res, next) => {
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
        let customerId;
        if(req.body.customer.customer_id){
            customerId = req.body.customer.customer_id;
        }else{
            const customer = new Customer({
                name: req.body.customer.name,
                nip: req.body.customer.nip,
                city: req.body.customer.city,
                street: req.body.customer.street
            })
            customer.save()
            .then(()=> {
                customerId = customer._id;
            })
            .catch(err => {
                console.log('lipa z customerem')
            });

        }

        // next, we need to check if all products in order are already in DB, if not, we have to add them.
        let order = req.body.order.map(el => {
            if(el.product_id){
                return {
                    product: el.product_id,
                    quantity: el.quantity,
                    unit_price: el.unit_price,
                    total_price: el.total_price
                }
            }else{
                const product = new Product({
                    name: el.name,
                    quantity: -el.quantity,
                    price: el.price,
                })
                product
                .save()
                .then(res => {
                    return res
                })
                .catch(err => {
                    const error = new Error('Something is wrong with the Product save operation.')
                    throw error;
                }
                );

                return {
                    product: product._id,
                    quantity: el.quantity,
                    unit_price: el.unit_price,
                    total_price: el.total_price
                }
            }
        })

        // Finally we are ready to preapre the Inoice document.
        const invoice = new Invoice({
            invoice_nr: req.body.invoice_nr,
            date: req.body.date,
            customer: customerId,
            order: order,
            total_price: req.body.total_price
        })

        invoice.save()            
        .then(result => {
            res.status(200).json({
                message: 'Invoice saved successfully'
            })
            return result;
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({
                error: err.message
            })
        })
    })
    .then()
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500;
            err.message = "Internal server error";
        }
        res.status(500).json({
            error: err.message
        })
    })
}