const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderItemSchema = new Schema({
    product: {
        type: mongoose.ObjectId,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    unit_price: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model('OrderItem', orderItemSchema)