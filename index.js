const express = require('express')
const mongoose = require('mongoose');
const router = express.Router();
const app = express();
const {hash,compare} = require('bcrypt');
const {sign ,verify} = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
require("dotenv").config();
const customerInfo = require('./models/customer.js');
const productInfo = require('./models/product.js');
const orderInfo = require('./models/cart.js');
const multer = require('multer');
const fs = require('fs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(cors());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' +file.originalname )
    }
})
  
const upload = multer({ storage: storage }).single('image');


router.post('/signin',async (req,res)=>{
    const {userId , password} = req.body;
    let userExist = await customerInfo.findOne({userId : userId});
    if(!userExist){
        res.json({
            status : 'failed',
            message : 'Invalid userName'
        })
    }else{
        if(await compare(password,userExist.password)){
            const token = sign({userId},process.env.JWT_SECRET_KEY);
            res.json({
                status : 'success',
                message : 'authenticated successfully',
                token
            })
        }else{
            res.json({
                status : 'failed',
                message : 'Incorrect password'
            })
        }
    }
})

router.post('/signup', async (req,res)=>{
    const {userId , password , customer_type} = req.body;
    let userExist  = await customerInfo.findOne({userId : userId});
    if(userExist){
        res.json({
            status : 'failed',
            message : 'user already exist'
        })
    }else{
        const hashedpassword  = await hash(password,10);
        const newUser = {
            userId : userId,
            password : hashedpassword,
            customer_type : customer_type
        }
        customerInfo.create(newUser, (err)=>{
            if(err){
                res.json({
                    status : 'failed',
                    message : 'try again'
                })
            }else{
                res.json({
                    status : 'success',
                    message : 'user registered successfully'
                })
            }
        })
    }
})

router.post('/stockupdate', (req,res)=>{
    let token = req.headers['authorization'];
    upload(req,res,async (err)=>{
        if(err){
            res.json({
                status : 'failed',
                message : 'image error'
            })
        }else{
            const newStock = {...req.body};
            newStock.image = {
                data : fs.readFileSync(process.cwd()+"/uploads/"+req.file.filename),
                contentType : "image/png"
            }
            if(!token){
                res.json({
                    status : 'failed',
                    message : 'unauthorized'
                })
            }else{
                let {userId} = verify(token,process.env.JWT_SECRET_KEY);
                let userExist = await customerInfo.find({userId : userId});
                if(userExist.customer_type === 'customer'){
                    res.json({
                        status : 'failed',
                        message : 'not an admin'
                    })
                }else{
                    let productExist = await productInfo.findOne({product_type : newStock.product_type, product_name:newStock.product_name});
                    if(!productExist){
                        productInfo.create(newStock, (err,docs)=>{
                            if(err){
                                res.json({
                                    status : 'failed',
                                    message : err
                                })
                            }else{
                                res.json({
                                    status : 'success',
                                    message : 'successfully updated',
                                    data: docs
                                })
                            }
                        })
                    }else{
                        newStock.available_quantity += productExist.available_quantity;
                        productInfo.findOneAndUpdate({product_type : newStock.product_type, product_name:newStock.product_name},newStock,{returnDocument: 'after'},(err,docs)=>{
                            if(err){
                                res.json({
                                    status : 'failed',
                                    message : err
                                })
                            }else{
                                res.json({
                                    status : 'success',
                                    message : 'successfully updated',
                                    data : docs
                                })
                            }
                        })
                    }
        
                }
            }

        }
    })
})

router.get('/products/:product_type', async(req,res)=>{
    let rangeFrom = req.query.from;
    let rangeTo = req.query.to;
    let products = await productInfo.find({product_type : req.params.product_type});
    if(!products){
        res.json({
            status : 'failed',
            message : 'no Product'
        })
    }else{
        let btwRange = products.filter((item)=>{
            if(item.product_price>=rangeFrom && item.product_price<=rangeTo){
                return item;
            }
        })
        res.json({
            status : 'success',
            message : 'successfully sorted',
            data : btwRange
        })
    }
})

router.post("/order", async (req,res)=>{
    let token = req.headers['authorization'];
    const orderList = req.body.orderList;
    const total = req.body.total;
    if(!token){
        res.json({
            status : 'failed',
            message : 'unauthorized'
        })
    }else{
        let {userId} = verify(token, process.env.JWT_SECRET_KEY);
        let userExist = await orderInfo.findOne({userId : userId});
        if(!userExist){
            let newOrder = {
                userId : userId,
                order : [
                    {
                        date : new Date(),
                        product_list : orderList,
                        total : total
                    }
                ]
            }
            orderInfo.create(newOrder,(err,docs)=>{
                if(err){
                    res.json({
                        status : 'failed',
                        message : err
                    })
                }else{
                    res.json({
                        status : 'success',
                        message : 'successfully updated',
                        data : docs
                    })
                }
            })
        }else{
            let appendOrder = {
                date : new Date(),
                product_list : orderList,
                total : total
            }
            orderInfo.findOneAndUpdate({userId : userId},{
                $push : {
                    order : appendOrder
                }
            },(err,docs)=>{
                if(err){
                    res.json({
                        status : 'failed',
                        message : err
                    })
                }else{
                    res.json({
                        status : 'success',
                        message : 'successfully updated',
                        data : docs
                    })
                }
            })
        }
    }
})

router.get('/history',async(req,res)=>{
    let token = req.headers['authorization'];
    if(!token){
        res.json({
            status : 'failed',
            message : 'unauthorized'
        })
    }else{
        let {userId} = verify(token, process.env.JWT_SECRET_KEY);
        let userExist = await orderInfo.findOne({userId : userId});
        if(!userExist){
            res.json({
                status : 'failed',
                message : 'no history to show'
            })
        }else{
            res.json({
                status : 'success',
                message : 'purchase History',
                data : userExist.order
            })
        }
    }
})

app.use('/',router);
mongoose.connect(process.env.MONGO_URL,()=>(console.log('database connected successfully..')));
app.listen(process.env.PORT,()=>(console.log(`port running on ${process.env.PORT}`)));
