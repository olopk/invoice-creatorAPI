const User = require('../models/user');

exports.addUser = (req, res, next) => {
    const user = new User({
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email,
        password: req.body.password
    })

    user
    .save()
    .then(result => {
        res.status(201).json({ message: 'user created successfully'})
    })
    .catch(err => {
        res.json({error: err})
    })
};

exports.getUser = (req,res,next) => {
    User
    .find()
    .where('name', req.body.name)
    .then(data => {
        if(data.length == 1){
            res.status(200).json({
                message: 'we have it',
                data: data
            })
        }else{
            res.status(204).json({
                message: 'sorry, no results'
            })
        }
    })
    .catch(err=>{
        res.status(500).json({
            err: err
        })
    })
}

// exports.modUser

// exports.lostUserPass
