const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const moment = require('moment-timezone');
const WarsawTimezone = moment.tz(Date.now(), 'Europe/Warsaw')

const invoiceSchema = new Schema({
    invoice_nr: {
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
    },
    pay_date:{
        type: Date,
        default: WarsawTimezone,
        required: false
    }
})

module.exports = mongoose.model('Invoice', invoiceSchema)