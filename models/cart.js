const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderDetails = new Schema({
    userId : { 
        type : String,
        required : true,
        unique : true
    },
    order : [{
        date : Date,
        product_list : [
            {
                product_name : String,
                product_price : Number,
                total_price : Number,
                quantity : Number
            }
        ],
        total : Number
    }]
})
module.exports = mongoose.model('orderdetails',orderDetails);