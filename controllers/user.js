const User = require('../models/user');

exports.addUser = (req, res, next) => {
    User
    .find()
    .where('email', req.body.email)
    .then(userArr => {
        if(userArr.length != 0){
            const error = new Error('Email is already taken');
            error.statusCode = 409;
            throw error;
        }

        const user = new User({
            name: req.body.name,
            surname: req.body.surname,
            email: req.body.email,
            password: req.body.password
        })
    
        return user.save()
    })
    .then(result => {
        res.status(201).json({ message: 'User created successfully'})
    })
    .catch(err => {
        // console.log(err)
        if(!err.statusCode){
            err.statusCode = 500;
            err.message = "Internal server error";
        }
        res.json({
            error: err.message,
            status: err.statusCode
        })
    })  
};

// exports.getUser = (req,res,next) => {
//     User
//     .find()
//     .where('name', req.body.name)
//     .then(data => {
//         if(data.length == 1){
//             res.status(200).json({
//                 message: 'we have it',
//                 data: data
//             })
//         }else{
//             res.status(204).json({
//                 message: 'sorry, no results'
//             })
//         }
//     })
//     .catch(err=>{
//         res.status(500).json({
//             err: err
//         })
//     })
// }

// exports.modUser

// exports.lostUserPass
