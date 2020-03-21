const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    service: {
        type: Boolean,
        required: true
    },    
    unit_price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: false
    }
})

module.exports = mongoose.model('Product', productSchema)