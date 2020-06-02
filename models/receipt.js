const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const moment = require('moment-timezone');
const WarsawTimezone = moment.tz(Date.now(), 'Europe/Warsaw')

const receiptSchema = new Schema({
    receipt_nr: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: WarsawTimezone,
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: false
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
            price_net:{
                type: Number,
                required: true
            },
            total_price_net:{
                type: Number,
                required: true
            },
            price_gross:{
                type: Number,
                required: true
            },
            total_price_gross:{
                type: Number,
                required: true
            },
            vat:{
                type: Number,
                required: true
            }
        }
    ],
    total_price:{
        type: Number,
        required: true
    },
    pay_method:{
        type: String,
        required: true
    }
})

module.exports = mongoose.model('Receipt', receiptSchema)