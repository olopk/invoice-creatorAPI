const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const customerSchema = new Schema({
    name: {
        type: String,
        required: false
    },
    nip: {
        type: Number,
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
    info: {
        type: String,
        required: false
    }
})

module.exports = mongoose.model('Customer', customerSchema);