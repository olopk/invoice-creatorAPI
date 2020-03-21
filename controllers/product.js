const Product = require('../models/product');

exports.addProduct = (req,res,next) =>{
   Product
    .find()
    .where('name', req.body.name)
    .then(result => {
        if(result.length != 0){
            const error = new Error('Product already exists!')
            error.statusCode = 409;
            throw error;
        }
        const product = new Product({
            name: req.body.name,
            service: req.body.service,
            unit_price: req.body.unit_price,
            quantity: req.body.quantity
        });

        return product.save()
    })
    .then(result => {
        res.status(201).json({
            message: 'product saved successfully'
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

exports.delProduct = (req,res,next) =>{
    //  .findOneAndRemove({'name': req.body.name})
    Product
        .find()
        .where('name', req.body.name)
        .then(product => {
            if(product.length == 0){
                const error = new Error('No product found!');
                error.statusCode = 404;
                throw error;
            }else{
                return Product.findOneAndDelete({'name': req.body.name})
            }
        })
        .then(result => {
            res.status(200).json({message: 'product removed successfully'})
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

 exports.modProduct = (req, res, next) =>{
     Product
        .find()
        .where('name', req.body.name)
        .then(productArr => {
            if(productArr.length == 0){
                const error = new Error('No product found');
                error.statusCode = 404;
                throw error;
            }
            const product = productArr[0];

            product.name = req.body.name;
            product.service = req.body.service;
            product.unit_price = req.body.unit_price;
            product.quantity = req.body.quantity;

            return product.save()
        })
        .then(result => {
            res.status(200).json({
                message: 'Product saved successfully'
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