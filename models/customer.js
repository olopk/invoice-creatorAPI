const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const customerSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    nip: {
        type: Number,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    street: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('Customer', customerSchema);