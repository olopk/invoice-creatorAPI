const Customer = require('../models/customer');

exports.addCustomer = (req,res,next) =>{
   Customer
    .find()
    .where('name', req.body.name)
    .then(result => {
        if(result.length != 0){
            const error = new Error('Customer already exists!')
            error.statusCode = 409;
            throw error;
        }
        const customer = new Customer({
            name: req.body.name,
            nip: req.body.nip,
            city: req.body.city,
            street: req.body.street
        });

        return customer.save()
    })
    .then(result => {
        res.status(201).json({
            message: 'Customer saved successfully'
        })
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500;
            err.message = "Internal server error";
        }
        res.json({
            error: err.message,
            status: err.statusCode
        })
    })
}

exports.delCustomer = (req,res,next) =>{
    //  .findOneAndRemove({'name': req.body.name})
    Customer
        .find()
        .where('name', req.body.name)
        .then(customer => {
            if(customer.length == 0){
                const error = new Error('No customer found!');
                error.statusCode = 404;
                throw error;
            }else{
                return Customer.findOneAndDelete({'name': req.body.name})
            }
        })
        .then(result => {
            res.status(200).json({message: 'customer removed successfully'})
        })
        .catch(err => {
            if(!err.statusCode){
                err.statusCode = 500;
                err.message = "Internal server error";
            }
            res.json({
                error: err.message,
                status: err.statusCode
            })
        })
 }

 exports.modCustomer = (req, res, next) =>{
     Customer
        .find()
        .where('name', req.body.name)
        .then(customerArr => {
            if(customerArr.length == 0){
                const error = new Error('No customer found');
                error.statusCode = 404;
                throw error;
            }
            const customer = customerArr[0];

            customer.name = req.body.name;
            customer.nip = req.body.nip;
            customer.city = req.body.city;
            customer.street = req.body.street;

            return customer.save()
        })
        .then(result => {
            res.status(200).json({
                message: 'Customer saved successfully'
            })
        })
        .catch(err => {
            if(!err.statusCode){
                err.statusCode = 500;
                err.message = "Internal server error";
            }
            res.json({
                error: err.message,
                status: err.statusCode
            })
        })
 }