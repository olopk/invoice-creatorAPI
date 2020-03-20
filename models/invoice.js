const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const invoiceSchema = new Schema({
    invoice_nr: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    customer: {
        type: mongoose.ObjectId,
        required: true
    }
})

module.exports = mongoose.model('Invoice', invoiceSchema)