const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const moment = require('moment-timezone');
const WarsawTimezone = moment.tz(Date.now(), 'Europe/Warsaw')

const customerSchema = new Schema({
    name: {
        type: String,
        required: false
    },
    nip: {
        type: String,
        required: false
    },
    city: {
        type: String,
        required: false
    },
    street: {
        type: String,
        required: false
    },
    phonenr: {
        type: String,
        required: false
    },
    selldate: {
        type: Date,
        default: WarsawTimezone,
        required: false
    },
    info: {
        type: String,
        required: false
    },
    hasInvoice:{
        type: Boolean,
        required: true
    }
})

module.exports = mongoose.model('Customer', customerSchema);