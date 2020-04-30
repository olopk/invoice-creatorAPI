const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    brand:{
        type: String,
        required: false
    },
    model:{
        type: String,
        required: false
    },   
    quantity: {
        type: Number,
        required: true
    },
    price_net: {
        type: Number,
        required: true
    },
    price_gross: {
        type: Number,
        required: true
    },
    vat: {
        type: Number,
        required: true
    },
})

module.exports = mongoose.model('Product', productSchema)