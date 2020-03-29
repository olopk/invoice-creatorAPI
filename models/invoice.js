const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const invoiceSchema = new Schema({
    invoice_nr: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    order: [
        {
            product:{
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            price:{
                type: Number,
                required: true
            },
            total_price:{
                type: Number,
                required: true
            }
        }
    ],
    total_price:{
        type: Number,
        required: true
    }
})

module.exports = mongoose.model('Invoice', invoiceSchema)