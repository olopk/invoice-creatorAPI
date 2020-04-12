const jwt = require('jsonwebtoken');

module.exports = (req, res, next) =>{
    const authHeader = req.get('Authorization');
    if(!authHeader){
        req.logged = false;
        next()
    }else{
        const token = authHeader.split(' ')[1];
        let decodedToken;
        try{
            decodedToken = jwt.verify(token, 'UltrasecretOptyk')
        }catch(err){
            err.statusCode = 500;
            throw err
        }
        if(!decodedToken){
            const error = new Error('Brak autotyzacji.')
            error.statusCode = 401;
            throw error
        }
        console.log(decodedToken)
        req.userData = {
            userId: decodedToken.userId,
            name: decodedToken.name
        }
        req.logged = true;
        next()
    }
}