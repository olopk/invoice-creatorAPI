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
            err.message = "Token uległ wygaśnięciu, zaloguj się ponownie"
            err.statusCode = 401    
            throw err
        }
        if(!decodedToken){
            const error = new Error('Brak autotyzacji.')
            error.statusCode = 401;
            throw error
        }
        req.userData = {
            userId: decodedToken.userId,
            name: decodedToken.name
        }
        next()
        // req.userData = {
        //     userId: 1234,
        //     name: 'Test'
        // }
        // req.logged = true;
        // next()
    }
}