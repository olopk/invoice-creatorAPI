const path = require('../utils/path');
const express = require('express');

const router = express.Router();

router.get('/user', (req, res, next)=>{
    res.status(333)
    res.send('uzytkownik zalogowany')
})

module.exports = router;