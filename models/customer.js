const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const customerDetails = new Schema({
    userId : { 
        type : String,
        unique : true,
        required : true
    },
    password : {
        type : String,
        required : true
    },
    customer_type : String
})
module.exports = mongoose.model('customerdetails',customerDetails);