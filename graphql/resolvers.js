const Invoice = require('../models/invoice');
const Receipt = require('../models/receipt');
const Product = require('../models/product');
const Customer = require('../models/customer');
const User = require('../models/user');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const soap = require('../utils/soapCall');

const productSave = (el) => {
    return new Promise(async (resolve, reject) => {
        if(el._id){
            let newProduct;
            try{
                newProduct = await Product.findById(el._id)
            }
            catch{
                const error = new Error('Produkt nie został odnaleziony.');
                error.statusCode = 404;
                throw error;
            }

            newProduct.quantity = newProduct.quantity - el.quantity;
            await newProduct.save()                       
            resolve({
                product: el._id,
                quantity: el.quantity,
                price_net: el.price_net,
                price_gross: el.price_gross,
                vat: el.vat,
                total_price_net: el.total_price_net,
                total_price_gross: el.total_price_gross,
            })
        }else{
            const productNameIsTaken = await Product.find().where('name', el.name)
            
            if(productNameIsTaken.length > 0){
                const error = new Error('Produkt o takiej nazwie już istnieje.');
                error.statusCode = 409;
                reject(error);
            }

            const product = new Product({
                name: el.name,
                quantity: -el.quantity,
                price_net: el.price_net,
                price_gross: el.price_gross,
                vat: el.vat,
            })
            product.save()
            .then(res => {
                resolve({
                    product: product._id,
                    quantity: el.quantity,
                    price_net: el.price_net,
                    price_gross: el.price_gross,
                    vat: el.vat,
                    total_price_net: el.total_price_net,
                    total_price_gross: el.total_price_gross,
                })
            })
        }})    
    }

const productCalc = (el) => {
    return new Promise(async (resolve,reject)=>{
        const product = await Product.findById(el.product);
        product.quantity += el.quantity;
        await product.save()
        resolve() 
    })
}

module.exports = {
    signIn: async function({signInInput}){
        const errors = [];
        // First validation..
        if(validator.isEmpty(signInInput.name)
         || validator.isEmpty(signInInput.surname)
         || validator.isEmpty(signInInput.email)
         || validator.isEmpty(signInInput.password)){
             errors.push({message: 'Wszystkie pola są wymagane.'})
         }

        if(errors.length > 0) {
            const error = new Error('Niewłaściwe dane wejściowe.');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }

        const emailExists = await User.exists({email: signInInput.email})

        if(emailExists){
            const error = new Error('Email znajduje się w bazie, przejdź do strony logowania.')
            error.data = 442
            throw error;
        }

        const newUser = new User({
            name: signInInput.name,
            surname: signInInput.surname,
            email: signInInput.email,
            password: signInInput.password
        })

        await newUser.save()

        return{message: 'Użytkownik został założony, przejdz do strony logowania'}
    },
    logIn: async function({email, password}){
        const errors = [];
        // First validation..
        if(validator.isEmpty(email)
         || validator.isEmpty(password)){
             errors.push({message: 'Wszystkie pola są wymagane.'})
         }

        if(errors.length > 0) {
            const error = new Error('Niewłaściwe dane wejściowe.');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }

        const user = await User.findOne({email: email});

        if(!user){
            const error = new Error('Użytkownik o danym adresie email nie istnieje, załóż konto.');
            error.data = errors;
            error.statusCode = 404;
            throw error;
        }
        if(user.password !== password){
            const error = new Error('Hasło jest niepoprawne');
            error.data = errors;
            error.statusCode = 401;
            throw error;
        }
        //TODO JWT
        const token = jwt.sign({
            userId: user._id,
            name: user.name
        },"UltrasecretOptyk",{expiresIn: '360m'})

        return{token: token, tokenExpiry: '360'}
    },
    getUser: async function(args, req){
        if(!req.userData || !req.userData.userId){
            const error = new Error('Brak autoryzacji')
            error.statusCode = 401;
            throw error
        }
        return{_id: req.userData.userId, name: req.userData.name}
    },
    getInvoices: async function(args, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        const allInvoices = await Invoice.find().populate('customer').populate('order.product')
        const newAllInvoices = allInvoices.map(invoice => invoice._doc).map(el => {
            return{
                ...el,
                date: el.date.toISOString()
            }
        })
        return newAllInvoices
    },
    getReceipts: async function(args, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        const allReceipts = await Receipt.find().populate('customer').populate('order.product')
        const newAllReceipts = allReceipts.map(receipt => receipt._doc).map(el => {
            return{
                ...el,
                date: el.date.toISOString()
            }
        })
        return newAllReceipts
    },
    getInvoice: async function({id}, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        let singleInvoice;
        try{
            const newSingleInvoice = await Invoice.findById(id).populate('customer').populate('order.product');
            singleInvoice = newSingleInvoice._doc;
            singleInvoice.date  = singleInvoice.date.toISOString()
        }
        catch{
            const error = new Error('Faktura nie została odnaleziona.');
            error.statusCode = 404;
            throw error;
        }
        
        return singleInvoice
    },
    addInvoice: async function({invoiceInput}, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        const orderData = invoiceInput.order;
        const customerData = invoiceInput.customer;
        const errors = [];
        // First we make a cumbersome validation..
        if(validator.isEmpty(invoiceInput.invoice_nr)
         || validator.isEmpty(invoiceInput.date)
         || validator.isEmpty(invoiceInput.pay_method)
         || validator.isEmpty(invoiceInput.total_price.toString())){
             errors.push({message: 'Numer faktury, metoda płatności, data i kwota całkowita - są wymagane'})
         }

         if(validator.isEmpty(customerData.name)
         || validator.isEmpty(customerData.nip.toString())
         || validator.isEmpty(customerData.city)
         || validator.isEmpty(customerData.street)){
             errors.push({message: 'Niepełne dane klienta.'})
         }

        orderData.forEach(element => {
            if(validator.isEmpty(element.name)
            || validator.isEmpty(element.price_net.toString())
            || validator.isEmpty(element.price_gross.toString())
            || validator.isEmpty(element.total_price_net.toString())
            || validator.isEmpty(element.total_price_gross.toString())    
            || validator.isEmpty(element.quantity.toString())){
                errors.push({message: 'Nazwa, cena netto brutto i całkowita oraz ilość - są wymagane .'})
            }
        });
        if(errors.length > 0) {
            const error = new Error('Nieprawidłowe dane wejściowe.');
            error.data = errors;
            error.statusCode = 422;
            throw error;
          }
        //Then we check if the invoice_nr isnt already used.      
     
        const invoiceNrIsTaken = await Invoice.find().where('invoice_nr', invoiceInput.invoice_nr)

        if(invoiceNrIsTaken.length !== 0){
            const error = new Error('Ten numer faktury znajduje się już w bazie danych.')
            error.statusCode = 409
            throw error;
        }

        // then we need to check if we need to add new customer, or just pick it up from the db.
        let customerId;

        if(customerData._id){
            customerId = customerData._id;
            
            let customer = await Customer.findById(customerId);
            
            customer.name = customerData.name,
            customer.city = customerData.city,
            customer.street = customerData.street,
            customer.info = customerData.info
            await customer.save()
        }else{
            const nipIsTaken = await Customer.find().where('nip', customerData.nip);
            if(nipIsTaken.length !== 0 ){
                const error = new Error('Klient o takim NIPie znajduje się już w bazie danych');
                error.statusCode = 409
                throw error              
            }

            const customer = new Customer({
                name: customerData.name,
                nip: customerData.nip,
                city: customerData.city,
                street: customerData.street,
                info: customerData.info
            })
            customerId = customer._id;
            await customer.save()
        }

        // next, we need to check if all products in order are already in DB, if not, we have to add them.
        let order = await Promise.all(orderData.map( async el => await productSave(el)))

        // Finally we are ready to preapre the Invoice document.
        const invoice = new Invoice({
            invoice_nr: invoiceInput.invoice_nr,
            date: invoiceInput.date,
            customer: customerId,
            order: order,
            total_price: invoiceInput.total_price,
            pay_method: invoiceInput.pay_method
        })   
        
        await invoice.save()  
        return {message: 'Faktura została dodana poprawnie.'}
    },
    editInvoice: async function({id, invoiceInput}, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        //First we check if the invoice _id exists.
        let invoice;
        try{
            invoice = await Invoice.findById(id);
        }catch{
            const error = new Error('Faktura o podanym ID nie istnieje.')
            error.statusCode = 404
            throw error;
        }   

        const orderData = invoiceInput.order;
        const customerData = invoiceInput.customer;
        const errors = [];
        // First we make a cumbersome validation..
        if(validator.isEmpty(invoiceInput.invoice_nr)
         || validator.isEmpty(invoiceInput.date)
         || validator.isEmpty(invoiceInput.pay_method)
         || validator.isEmpty(invoiceInput.total_price.toString())){
             errors.push({message: 'Numer faktury, data, metoda płatności i cena końcowa - są wymagane'})
         }

         if(validator.isEmpty(customerData.name)
         || validator.isEmpty(customerData.nip)
         || validator.isEmpty(customerData.city)
         || validator.isEmpty(customerData.street)){
             errors.push({message: 'Dane klienta są niekompletne.'})
         }

        orderData.forEach(element => {
            if(validator.isEmpty(element.name)
            || validator.isEmpty(element.price_net.toString())
            || validator.isEmpty(element.price_gross.toString())
            || validator.isEmpty(element.total_price_net.toString())
            || validator.isEmpty(element.total_price_gross.toString())    
            || validator.isEmpty(element.quantity.toString())){
                errors.push({message: 'Nazwa, cena netto brutto i całkowita oraz ilość - są wymagane .'})
            }
        });

        if(errors.length > 0) {
            const error = new Error('Nieprawidłowe dane wejściowe.');
            error.data = errors;
            error.statusCode = 422;
            throw error;
          }
        //Then we check if the invoice_nr is equal to the previous one if not
        //then we check if it isnt already used in other document.      
        if(invoiceInput.invoice_nr != invoice.invoice_nr){
            const invoiceArr = await Invoice.find().where('invoice_nr', invoiceInput.invoice_nr)
    
            if(invoiceArr.length != 0){
                const error = new Error('Numer faktury znajduje się już w bazie danych.')
                error.statusCode = 409
                throw error;
            }
        }  

        // then we need to check if we need to add new customer, or just pick it up from the db.

        if(customerData._id){
            invoice.customer = customerData._id;
        }else{
            const customer = new Customer({
                name: customerData.name,
                nip: customerData.nip,
                city: customerData.city,
                street: customerData.street,
                info: customerData.info
            })
            await customer.save()
            customerId = customer._id;
        }

        //Now we splice all orders from the array but before that
        //we recalculate all the existing products in warehouse
        await Promise.all(invoice.order.map(async el => await productCalc(el)))

        invoice.order = await Promise.all(orderData.map( async el => await productSave(el)))
        invoice.invoice_nr = invoiceInput.invoice_nr; 
        invoice.date = invoiceInput.date;
        invoice.total_price = invoiceInput.total_price;
        invoice.pay_method = invoiceInput.pay_method;
        
        await invoice.save()  
        return {message: 'Faktura została zaktualizowana poprawnie'}
    },
    delInvoice: async function({id}, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        const errors = []
        if(validator.isEmpty(id)){
            errors.push({message: 'ID Faktury jest wymagane.'})
        }
        if(errors.length > 0) {
            const error = new Error('Nieprawdiłowe dane wejściowe');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }
        const invoice = await Invoice.findById(id);
        if(!invoice){
            const error = new Error('Faktura nie została odnaleziona.');
            error.statusCode = 404;
            throw error;
        };
        // console.log(invoice)
        //we recalculate all the existing products in warehouse
        await Promise.all(invoice.order.map(async el => await productCalc(el)))

        await Invoice.findByIdAndDelete(id)

        return{message: 'Faktura została usunięta.'}
    },
    addReceipt: async function({receiptInput}, req){
        // if(!req.logged){
        //     const error = new Error('Brak autoryzacji.')
        //     error.statusCode = 401;
        //     throw error;
        // }

        const orderData = receiptInput.order;
        const customerData = receiptInput.customer;
        const errors = [];
        // First we make a cumbersome validation..
        if(validator.isEmpty(receiptInput.receipt_nr)
         || validator.isEmpty(receiptInput.date)
         || validator.isEmpty(receiptInput.pay_method)
         || validator.isEmpty(receiptInput.total_price.toString())){
             errors.push({message: 'Numer dokumentu, data, cena i metoda płatności - są wymagane'})
         }

        orderData.forEach(element => {
            if(validator.isEmpty(element.name)
            || validator.isEmpty(element.price_net.toString())
            || validator.isEmpty(element.price_gross.toString())
            || validator.isEmpty(element.total_price_net.toString())
            || validator.isEmpty(element.total_price_gross.toString())    
            || validator.isEmpty(element.quantity.toString())){
                errors.push({message: 'Nazwa, cena netto brutto i całkowita oraz ilość - są wymagane .'})
            }
        });
        if(errors.length > 0) {
            const error = new Error('Nieprawidłowe dane wejściowe');
            error.data = errors;
            error.statusCode = 422;
            throw error;
          }
        //Then we check if the receipt_nr isnt already used.      
     
        const receiptArr = await Receipt.find().where('receipt_nr', receiptInput.receipt_nr)

        if(receiptArr.length != 0){
            const error = new Error('Numer paragonu znajduje się już w bazie danych')
            error.statusCode = 409
            throw error;
        }

        // then we need to check if we need to add new customer, or just pick it up from the db.
        let customerId;

        if(customerData){
            if(customerData.customer_id){
                customerId = customerData.customer_id;
            }else{
                const customer = new Customer({
                    name: customerData.name,
                    city: customerData.city,
                    street: customerData.street,
                    info: customerData.info
                })
                customerId = customer._id;
                await customer.save()
            }
        }

        // next, we need to check if all products in order are already in DB, if not, we have to add them.
        let order = await Promise.all(orderData.map( async el => await productSave(el)))

        // Finally we are ready to preapre the Receipt document.
        const receipt = new Receipt({
            receipt_nr: receiptInput.receipt_nr,
            date: receiptInput.date,
            customer: customerId,
            order: order,
            total_price: receiptInput.total_price,
            pay_method: receiptInput.pay_method
        })   
        
        await receipt.save()  
        return {message: 'Paragon został zapisany poprawnie'}
    },
    editReceipt: async function({id, receiptInput}, req){
        // if(!req.logged){
        //     const error = new Error('Brak autoryzacji.')
        //     error.statusCode = 401;
        //     throw error;
        // }
        //First we check if the receipt _id exists.
        let receipt;
        try{
            receipt = await Receipt.findById(id);
        }catch{
            const error = new Error('Paragon o wskazanym nr ID nie istnieje.')
            error.statusCode = 404
            throw error;
        }   

        const orderData = receiptInput.order;
        const customerData = receiptInput.customer;
        const errors = [];
        // First we make a cumbersome validation..
        if(validator.isEmpty(receiptInput.receipt_nr)
         || validator.isEmpty(receiptInput.date)
         || validator.isEmpty(receiptInput.pay_method)
         || validator.isEmpty(receiptInput.total_price.toString())){
             errors.push({message: 'Numer dokumentu, data, cena i metoda płatności - są wymagane'})
         }

        orderData.forEach(element => {
            if(validator.isEmpty(element.name)
            || validator.isEmpty(element.price_net.toString())
            || validator.isEmpty(element.price_gross.toString())
            || validator.isEmpty(element.total_price_net.toString())
            || validator.isEmpty(element.total_price_gross.toString())    
            || validator.isEmpty(element.quantity.toString())){
                errors.push({message: 'Nazwa, cena netto brutto i całkowita oraz ilość - są wymagane .'})
            }
        });
        if(errors.length > 0) {
            const error = new Error('Nieprawidłowe dane wejściowe');
            error.data = errors;
            error.statusCode = 422;
            throw error;
          }
        //Then we check if the receipt_nr is equal to the previous one if not
        //then we check if it isnt already used in other document.      
        if(receiptInput.receipt_nr != receipt.receipt_nr){
            const receiptArr = await Receipt.find().where('receipt_nr', receiptInput.receipt_nr)
    
            if(receiptArr.length != 0){
                const error = new Error('Numer paragonu znajduje się już w bazie danych')
                error.statusCode = 409
                throw error;
            }
        }  

        // then we need to check if we need to add new customer, or just pick it up from the db.

        if(customerData){
            if(customerData._id){
                receipt.customer = customerData._id;
            }else{
                const customer = new Customer({
                    name: customerData.name,
                    nip: customerData.nip,
                    city: customerData.city,
                    street: customerData.street,
                    info: customerData.info
                })
                await customer.save()
                customerId = customer._id;
            }
        }

        //Now we splice all orders from the array but before that
        //we recalculate all the existing products in warehouse
        await Promise.all(receipt.order.map(async el => await productCalc(el)))

        receipt.order = await Promise.all(orderData.map( async el => await productSave(el)))
        receipt.receipt_nr = receiptInput.receipt_nr; 
        receipt.date = receiptInput.date;
        receipt.total_price = receiptInput.total_price;
        receipt.pay_method = receiptInput.pay_method;
        
        await receipt.save()  
        return {message: 'Paragon został zaktualizowany poprawnie'}
    },
    delReceipt: async function({id}, req){
        // if(!req.logged){
        //     const error = new Error('Brak autoryzacji.')
        //     error.statusCode = 401;
        //     throw error;
        // }
        const errors = []
        if(validator.isEmpty(id)){
            errors.push({message: 'ID paragonu jest wymagane'})
        }
        if(errors.length > 0) {
            const error = new Error('Nieprawidłowe dane wejściowe');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }
        const receipt = await Receipt.findById(id);
        if(!receipt){
            const error = new Error('Paragon nie został znaleziony');
            error.statusCode = 404;
            throw error;
        };
        // console.log(receipt)
        //we recalculate all the existing products in warehouse
        await Promise.all(receipt.order.map(async el => await productCalc(el)))

        await Receipt.findByIdAndDelete(id)

        return{message: 'Paragon został usunięty.'}
    },
    getCustomers: async function(args, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        const allCustomers = await Customer.find();
        return allCustomers
    },
    getCustomer: async function({id}, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        let singleCustomer;
        try{
            singleCustomer = await Customer.findById(id);
        }
        catch{
            const error = new Error('Klient nie został odnaleziony.');
            error.statusCode = 404;
            throw error;
        }
        return singleCustomer
    },
    fetchCustomerData: async function({nip}, req){
        // if(!req.logged){
        //     const error = new Error('Brak autoryzacji.')
        //     error.statusCode = 401;
        //     throw error;
        // }
        let customerData;
        try{
            customerData = await soap.soapCall(nip)
        }
        catch{
            const error = new Error('Usługa chwilowo nie jest dostępna.');
            error.statusCode = 404;
            throw error;
        }
        return customerData
    },
    addCustomer: async function({customerInput}, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        const errors = []
        if(validator.isEmpty(customerInput.name)
        || validator.isEmpty(customerInput.nip.toString())
        || validator.isEmpty(customerInput.city)
        || validator.isEmpty(customerInput.street)){
            errors.push({message: 'Dane klienta są niekompletne'})
        }
        if(errors.length > 0) {
            const error = new Error('Nieprawidłowe dane wejściowe');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }

        const customer = new Customer({
            name: customerInput.name,
            nip: customerInput.nip,
            city: customerInput.city,
            info: customerInput.info,
            street: customerInput.street
        })
        await customer.save()
        return{message: 'Klient został zapisany poprawnie'}
    },
    editCustomer: async function({id, customerInput}, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        const errors = []
        if(validator.isEmpty(id)){
            errors.push({message: 'ID klienta jest wymagane.'})
        }
        if(validator.isEmpty(customerInput.name)
        || validator.isEmpty(customerInput.nip.toString())
        || validator.isEmpty(customerInput.street)
        || validator.isEmpty(customerInput.city)){
            errors.push({message: 'Dane klienta są niekompletne.'})
        }
        if(errors.length > 0) {
            const error = new Error('Nieprawidłowe dane wejściowe');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }

        let customer = await Customer.findById(id);
        if(!customer){
            const error = new Error('Klient nie został odnaleziony');
            error.statusCode = 404;
            throw error;
        }

        customer.name = customerInput.name;
        customer.nip = customerInput.nip;
        customer.city = customerInput.city;
        customer.street = customerInput.street;
        customer.info = customerInput.info;

        await customer.save();

        return{message: 'Klient został zaktualizowany poprawnie'}
    },
    delCustomer: async function({id}, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        const errors = []
        if(validator.isEmpty(id)){
            errors.push({message: 'ID klienta jest wymagane.'})
        }
        if(errors.length > 0) {
            const error = new Error('Nieprawidłowe dane wejściowe');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }
        const customer = await Customer.exists({_id: id});
        if(!customer){
            const error = new Error('Klient nie został odnaleziony.');
            error.code = 404;
            throw error;
        };
        const customerInvoices = await Invoice.find().where('customer', id)
        if(customerInvoices.length > 0){
            const invoiceNr = customerInvoices[0].invoice_nr;
            const error = new Error(`Nie można usunąć klienta, ponieważ jest powiązany z fakturą nr: ${invoiceNr}.`);
            error.statusCode = 444;
            throw error;
        }
        await Customer.findByIdAndDelete(id)

        return{message: 'Klient został usunięty.'}
    },
    getProducts: async function(args, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        const allProducts = await Product.find();
        return allProducts
    },
    getProduct: async function({id}, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        let singleProduct;
        try{
            singleProduct = await Product.findById(id);
        }
        catch{
            const error = new Error('Produkt nie został odnaleziony.');
            error.statusCode = 404;
            throw error;
        }
        return singleProduct
    },
    addProduct: async function({productInput}, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        const errors = []
        if(validator.isEmpty(productInput.name)
        || validator.isEmpty(productInput.quantity.toString())
        || validator.isEmpty(productInput.vat.toString())
        || validator.isEmpty(productInput.price_net.toString())
        || validator.isEmpty(productInput.price_gross.toString())){
            errors.push({message: 'Dane produktu są niekompletne.'})
        }
        if(errors.length > 0) {
            const error = new Error('Dane wejściowe są niekompletne.');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }
       
        const product = new Product({
            name: productInput.name,
            brand: productInput.brand,
            model: productInput.model,
            quantity: productInput.quantity,
            price_net: el.price_net,
            price_gross: el.price_gross,
            vat: el.vat,
        })

        await product.save()
        return{message: 'Produkt został zapisany poprawnie'}
    },
    editProduct: async function({id, productInput}, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        const errors = []
        if(validator.isEmpty(id)){
            errors.push({message: 'ID produktu jest wymagane.'})
        }
        if(validator.isEmpty(productInput.name)
        || validator.isEmpty(productInput.quantity.toString())
        || validator.isEmpty(productInput.vat.toString())
        || validator.isEmpty(productInput.price_net.toString())
        || validator.isEmpty(productInput.price_gross.toString())){
            errors.push({message: 'Dane produktu są niekompletne.'})
        }
        if(errors.length > 0) {
            const error = new Error('Nieprawidłowe dane wejściowe');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }

        let product;
        try{
            product = await Product.findById(id);
        }catch{
            const error = new Error('Produkt nie został odnaleziony.');
            error.statusCode = 404;
            throw error;
        }

        product.name = productInput.name;
        product.quantity = productInput.quantity;
        product.price_net = productInput.price_net;
        product.price_gross = productInput.price_gross;
        product.vat = productInput.vat;
        product.brand = productInput.brand ? productInput.brand : product.brand;
        product.model = productInput.model ? productInput.model : product.model;

        await product.save();

        return{message: 'Produkt został zaktualizowany poprawnie'}
    },
    delProduct: async function({id}, req){
        if(!req.logged){
            const error = new Error('Brak autoryzacji.')
            error.statusCode = 401;
            throw error;
        }
        const errors = []
        if(validator.isEmpty(id)){
            errors.push({message: 'ID produktu jest wymagane'})
        }
        if(errors.length > 0) {
            const error = new Error('Nieprawidłowe dane wejściowe.');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }
        const product = await Product.exists({_id: id});
        if(!product){
            const error = new Error('Produkt nie został odnaleziony.');
            error.statusCode = 404;
            throw error;
        };
        const productInvoices = await Invoice.find().where('order.product', id)
        if(productInvoices.length > 0){
            const invoiceNr = productInvoices[0].invoice_nr;
            const error = new Error(`Nie można usunąć produktu, ponieważ jest powiązany z fakturą nr: ${invoiceNr}.`);
            error.statusCode = 444;
            error.code = 444;
            throw error;
        }
        await Product.findByIdAndDelete(id)

        return{message: 'Produkt został usunięty.'}
    },
}