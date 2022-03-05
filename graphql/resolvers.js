const Invoice = require("../models/invoice");
const Receipt = require("../models/receipt");
const Product = require("../models/product");
const Customer = require("../models/customer");
const User = require("../models/user");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

const soap = require("../utils/soapCall");

const checkAuth = (logged) => {
  if (!logged) {
    const error = new Error("Brak autoryzacji.");
    error.statusCode = 401;
    throw error;
  }
};

const checkIfEmpty = (params) => {
  let isEmpty = false;
  for (let el of params) {
    el === null || validator.isEmpty(el.toString()) ? (isEmpty = true) : null;
  }
  return isEmpty;
};

const productSave = (el) => {
  return new Promise(async (resolve, reject) => {
    if (el._id) {
      let newProduct;
      try {
        newProduct = await Product.findById(el._id);
      } catch {
        const error = new Error("Produkt nie został odnaleziony.");
        error.statusCode = 404;
        throw error;
      }

      newProduct.quantity = newProduct.quantity - el.quantity;
      await newProduct.save();
      resolve({
        product: el._id,
        quantity: el.quantity,
        price_net: el.price_net,
        price_gross: el.price_gross,
        vat: el.vat,
        total_price_net: el.total_price_net,
        total_price_gross: el.total_price_gross,
      });
    } else {
      const productNameIsTaken = await Product.find().where("name", el.name);

      if (productNameIsTaken.length > 0) {
        const error = new Error("Produkt o takiej nazwie już istnieje.");
        error.statusCode = 409;
        reject(error);
      } else {
        const product = new Product({
          name: el.name,
          quantity: -el.quantity,
          price_net: el.price_net,
          price_gross: el.price_gross,
          vat: el.vat,
        });
        product.save().then((res) => {
          resolve({
            product: product._id,
            quantity: el.quantity,
            price_net: el.price_net,
            price_gross: el.price_gross,
            vat: el.vat,
            total_price_net: el.total_price_net,
            total_price_gross: el.total_price_gross,
          });
        });
      }
    }
  });
};

const productCalc = (el) => {
  return new Promise(async (resolve, reject) => {
    const product = await Product.findById(el.product);
    product.quantity += el.quantity;
    await product.save();
    resolve();
  });
};

const customerSave = async (
  { _id, name, nip, city, street, phonenr, selldate, info },
  isInvoice
) => {
  return new Promise(async (resolve, reject) => {
    if (_id) {
      let customer = await Customer.findById(_id);

      customer.nip = nip ? nip : "nie dotyczy";
      customer.name = name;
      customer.city = city;
      customer.street = street;
      customer.phonenr = phonenr ? phonenr : null;
      customer.selldate = selldate ? selldate : null;
      customer.info = info;
      customer.hasInvoice = isInvoice ? true : customer.hasInvoice;
      await customer.save();
      resolve(_id);
    } else if (!name) {
      const clientUnknown = await Customer.findOne({ name: "Klient nieznany" });
      if (clientUnknown) {
        resolve(clientUnknown._id);
      } else {
        const customer = new Customer({
          name: "Klient nieznany",
          hasInvoice: false,
        });
        await customer.save();
        resolve(customer._id);
      }
    } else {
      // const nipIsTaken = nip ? await Customer.find().where('nip', nip) : []
      const nipIsTaken = nip
        ? await Customer.find({
            $and: [{ nip: nip }, { nip: { $ne: "nie dotyczy" } }],
          })
        : [];
      const nameIsTaken = await Customer.find().where("name", name);

      nipIsTaken.length !== 0 ? reject("NIP") : null;
      nameIsTaken.length !== 0 ? reject("Client") : null;

      if (nipIsTaken.length === 0 && nameIsTaken.length === 0) {
        const customer = new Customer({
          name: name,
          nip: nip ? nip : null,
          city: city,
          street: street,
          phonenr: phonenr ? phonenr : null,
          selldate: selldate ? selldate : null,
          info: info,
          hasInvoice: isInvoice ? true : false,
        });
        await customer.save();
        resolve(customer._id);
      }
    }
  });
};

module.exports = {
  signIn: async function ({ signInInput }) {
    const errors = [];
    const { name, surname, email, password } = signInInput;
    // First validation..

    checkIfEmpty([name, surname, email, password])
      ? errors.push({ message: "Wszystkie pola są wymagane." })
      : null;

    if (errors.length > 0) {
      const error = new Error("Niewłaściwe dane wejściowe.");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }

    const emailExists = await User.exists({ email: email });

    if (emailExists) {
      const error = new Error(
        "Email znajduje się w bazie, przejdź do strony logowania."
      );
      error.data = 442;
      throw error;
    }

    const newUser = new User({
      name: name,
      surname: surname,
      email: email,
      password: password,
    });

    await newUser.save();

    return {
      message: "Użytkownik został założony, przejdz do strony logowania",
    };
  },
  logIn: async function ({ email, password }) {
    const errors = [];

    checkIfEmpty([email, password])
      ? errors.push({ message: "Wszystkie pola są wymagane." })
      : null;

    if (errors.length > 0) {
      const error = new Error("Niewłaściwe dane wejściowe.");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }

    const user = await User.findOne({ email: email });

    if (!user) {
      const error = new Error(
        "Użytkownik o danym adresie email nie istnieje, załóż konto."
      );
      error.data = errors;
      error.statusCode = 404;
      throw error;
    }
    if (user.password !== password) {
      const error = new Error("Hasło jest niepoprawne");
      error.data = errors;
      error.statusCode = 401;
      throw error;
    }
    //TODO JWT
    const token = jwt.sign(
      {
        userId: user._id,
        name: user.name,
      },
      "UltrasecretOptyk",
      { expiresIn: "360m" }
    );

    return { token: token, tokenExpiry: "360" };
  },
  getUser: async function (args, req) {
    if (!req.userData || !req.userData.userId) {
      const error = new Error("Brak autoryzacji");
      error.statusCode = 401;
      throw error;
    }
    return { _id: req.userData.userId, name: req.userData.name };
  },
  getInvoices: async function (args, req) {
    checkAuth(req.logged);

    const allInvoices = await Invoice.find()
      .populate("customer")
      .populate("order.product");
    const newAllInvoices = allInvoices
      .map((invoice) => invoice._doc)
      .map((el) => {
        return {
          ...el,
          date: el.date.toISOString(),
          pay_date: el.pay_date ? el.pay_date.toISOString() : null,
        };
      });
    return newAllInvoices;
  },
  getReceipts: async function (args, req) {
    checkAuth(req.logged);
    const allReceipts = await Receipt.find()
      .populate("customer")
      .populate("order.product");
    const newAllReceipts = allReceipts
      .map((receipt) => receipt._doc)
      .map((el) => {
        return {
          ...el,
          date: el.date.toISOString(),
        };
      });
    return newAllReceipts;
  },
  getInvoice: async function ({ id }, req) {
    checkAuth(req.logged);
    let singleInvoice;
    try {
      const newSingleInvoice = await Invoice.findById(id)
        .populate("customer")
        .populate("order.product");
      singleInvoice = newSingleInvoice._doc;
      singleInvoice.date = singleInvoice.date.toISOString();
    } catch {
      const error = new Error("Faktura nie została odnaleziona.");
      error.statusCode = 404;
      throw error;
    }

    return singleInvoice;
  },
  addInvoice: async function ({ invoiceInput }, req) {
    checkAuth(req.logged);
    const orderData = invoiceInput.order;
    const customerData = invoiceInput.customer;
    const errors = [];

    checkIfEmpty([
      invoiceInput.invoice_nr,
      invoiceInput.date,
      invoiceInput.pay_method,
      invoiceInput.total_price,
    ])
      ? errors.push({
          message:
            "Numer faktury, metoda płatności, data i kwota całkowita - są wymagane",
        })
      : null;
    checkIfEmpty([
      customerData.name,
      customerData.nip,
      customerData.city,
      customerData.street,
    ])
      ? errors.push({ message: "Niepełne dane klienta." })
      : null;

    orderData.forEach((element) => {
      const {
        name,
        price_net,
        price_gross,
        total_price_net,
        total_price_gross,
        quantity,
      } = element;
      checkIfEmpty([
        name,
        price_net,
        price_gross,
        total_price_net,
        total_price_gross,
        quantity,
      ])
        ? errors.push({
            message:
              "Nazwa, cena netto brutto i całkowita oraz ilość - są wymagane .",
          })
        : null;
    });
    if (errors.length > 0) {
      const error = new Error("Nieprawidłowe dane wejściowe.");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }
    //Then we check if the invoice_nr isnt already used.

    const invoiceNrIsTaken = await Invoice.findOne({
      invoice_nr: invoiceInput.invoice_nr,
    });

    if (invoiceNrIsTaken) {
      const error = new Error(
        "Ten numer faktury znajduje się już w bazie danych."
      );
      error.statusCode = 409;
      throw error;
    }

    // then we need to check if we need to add new customer, or just pick it up from the db.
    let customerId;
    try {
      customerId = await customerSave(customerData, true);
    } catch (err) {
      const error = new Error(
        `Klient ${
          err === "Client" ? "takiej nazwie" : "takim NIPie"
        } znajduje się już w bazie danych`
      );
      error.statusCode = 409;
      throw error;
    }

    // next, we need to check if all products in order are already in DB, if not, we have to add them.
    let order = await Promise.all(
      orderData.map(async (el) => await productSave(el))
    );

    // Finally we are ready to preapre the Invoice document.
    const invoice = new Invoice({
      invoice_nr: invoiceInput.invoice_nr,
      invoice_comment: invoiceInput.invoice_comment,
      date: invoiceInput.date,
      customer: customerId,
      order: order,
      total_price: invoiceInput.total_price,
      pay_method: invoiceInput.pay_method,
      pay_date: invoiceInput.pay_date ? invoiceInput.pay_date : null,
    });

    await invoice.save();
    return { message: "Faktura została dodana poprawnie." };
  },
  editInvoice: async function ({ id, invoiceInput }, req) {
    checkAuth(req.logged);
    //First we check if the invoice _id exists.
    let invoice;
    try {
      invoice = await Invoice.findById(id);
    } catch {
      const error = new Error("Faktura o podanym ID nie istnieje.");
      error.statusCode = 404;
      throw error;
    }

    const orderData = invoiceInput.order;
    const customerData = invoiceInput.customer;
    const errors = [];

    checkIfEmpty([
      invoiceInput.invoice_nr,
      invoiceInput.date,
      invoiceInput.pay_method,
      invoiceInput.total_price,
    ])
      ? errors.push({
          message:
            "Numer faktury, metoda płatności, data i kwota całkowita - są wymagane",
        })
      : null;
    checkIfEmpty([
      customerData.name,
      customerData.nip,
      customerData.city,
      customerData.street,
    ])
      ? errors.push({ message: "Niepełne dane klienta." })
      : null;

    orderData.forEach((element) => {
      const {
        name,
        price_net,
        price_gross,
        total_price_net,
        total_price_gross,
        quantity,
      } = element;
      checkIfEmpty([
        name,
        price_net,
        price_gross,
        total_price_net,
        total_price_gross,
        quantity,
      ])
        ? errors.push({
            message:
              "Nazwa, cena netto brutto i całkowita oraz ilość - są wymagane .",
          })
        : null;
    });

    if (errors.length > 0) {
      const error = new Error("Nieprawidłowe dane wejściowe.");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }
    //Then we check if the invoice_nr is equal to the previous one if not
    //then we check if it isnt already used in other document.
    if (invoiceInput.invoice_nr != invoice.invoice_nr) {
      const invoiceArr = await Invoice.findOne({
        invoice_nr: invoiceInput.invoice_nr,
      });

      if (invoiceArr) {
        const error = new Error(
          "Numer faktury znajduje się już w bazie danych."
        );
        error.statusCode = 409;
        throw error;
      }
    }

    // then we need to check if we need to add new customer, or just pick it up from the db.
    let customerId;
    try {
      customerId = await customerSave(customerData, true);
    } catch (err) {
      const error = new Error(
        `Klient ${
          err === "Client" ? "takiej nazwie" : "takim NIPie"
        } znajduje się już w bazie danych`
      );
      error.statusCode = 409;
      throw error;
    }

    //Now we splice all orders from the array but before that
    //we recalculate all the existing products in warehouse
    await Promise.all(invoice.order.map(async (el) => await productCalc(el)));

    invoice.order = await Promise.all(
      orderData.map(async (el) => await productSave(el))
    );
    invoice.invoice_nr = invoiceInput.invoice_nr;
    invoice.invoice_comment = invoiceInput.invoice_comment;
    invoice.customer = customerId;
    invoice.date = invoiceInput.date;
    invoice.total_price = invoiceInput.total_price;
    invoice.pay_method = invoiceInput.pay_method;
    invoice.pay_date = invoiceInput.pay_date ? invoiceInput.pay_date : null;

    await invoice.save();
    return { message: "Faktura została zaktualizowana poprawnie" };
  },
  delInvoice: async function ({ id }, req) {
    checkAuth(req.logged);
    const errors = [];
    if (validator.isEmpty(id)) {
      errors.push({ message: "ID Faktury jest wymagane." });
    }
    if (errors.length > 0) {
      const error = new Error("Nieprawdiłowe dane wejściowe");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      const error = new Error("Faktura nie została odnaleziona.");
      error.statusCode = 404;
      throw error;
    }
    // console.log(invoice)
    //we recalculate all the existing products in warehouse
    await Promise.all(invoice.order.map(async (el) => await productCalc(el)));

    await Invoice.findByIdAndDelete(id);

    return { message: "Faktura została usunięta." };
  },
  addReceipt: async function ({ receiptInput }, req) {
    checkAuth(req.logged);
    const orderData = receiptInput.order;
    const customerData = receiptInput.customer;
    const errors = [];

    checkIfEmpty([
      receiptInput.receipt_nr,
      receiptInput.date,
      receiptInput.pay_method,
      receiptInput.total_price,
    ])
      ? errors.push({
          message:
            "Numer dokumentu, data, cena i metoda płatności - są wymagane",
        })
      : null;

    orderData.forEach((element) => {
      const {
        name,
        price_net,
        price_gross,
        total_price_net,
        total_price_gross,
        quantity,
      } = element;
      checkIfEmpty([
        name,
        price_net,
        price_gross,
        total_price_net,
        total_price_gross,
        quantity,
      ])
        ? errors.push({
            message:
              "Nazwa, cena netto brutto i całkowita oraz ilość - są wymagane .",
          })
        : null;
    });

    if (errors.length > 0) {
      const error = new Error("Nieprawidłowe dane wejściowe");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }
    //Then we check if the receipt_nr isnt already used.

    const receiptArr = await Receipt.findOne({
      receipt_nr: receiptInput.receipt_nr,
    });

    if (receiptArr) {
      const error = new Error("Numer paragonu znajduje się już w bazie danych");
      error.statusCode = 409;
      throw error;
    }

    // then we need to check if we need to add new customer, or just pick it up from the db.
    let customerId;
    try {
      customerId = await customerSave(customerData);
    } catch (err) {
      const error = new Error(
        `Klient ${
          err === "Client" ? "takiej nazwie" : "takim NIPie"
        } znajduje się już w bazie danych`
      );
      error.statusCode = 409;
      throw error;
    }

    // next, we need to check if all products in order are already in DB, if not, we have to add them.
    let order = await Promise.all(
      orderData.map(async (el) => await productSave(el))
    );

    // Finally we are ready to preapre the Receipt document.
    const receipt = new Receipt({
      receipt_nr: receiptInput.receipt_nr,
      date: receiptInput.date,
      customer: customerId,
      order: order,
      total_price: receiptInput.total_price,
      pay_method: receiptInput.pay_method,
    });

    await receipt.save();
    return { message: "Paragon został zapisany poprawnie" };
  },
  editReceipt: async function ({ id, receiptInput }, req) {
    checkAuth(req.logged);
    //First we check if the receipt _id exists.
    let receipt;
    try {
      receipt = await Receipt.findById(id);
    } catch {
      const error = new Error("Paragon o wskazanym nr ID nie istnieje.");
      error.statusCode = 404;
      throw error;
    }

    const orderData = receiptInput.order;
    const customerData = receiptInput.customer;
    const errors = [];

    checkIfEmpty([
      receiptInput.receipt_nr,
      receiptInput.date,
      receiptInput.pay_method,
      receiptInput.total_price,
    ])
      ? errors.push({
          message:
            "Numer dokumentu, data, cena i metoda płatności - są wymagane",
        })
      : null;

    orderData.forEach((element) => {
      const {
        name,
        price_net,
        price_gross,
        total_price_net,
        total_price_gross,
        quantity,
      } = element;
      checkIfEmpty([
        name,
        price_net,
        price_gross,
        total_price_net,
        total_price_gross,
        quantity,
      ])
        ? errors.push({
            message:
              "Nazwa, cena netto brutto i całkowita oraz ilość - są wymagane .",
          })
        : null;
    });

    if (errors.length > 0) {
      const error = new Error("Nieprawidłowe dane wejściowe");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }
    //Then we check if the receipt_nr is equal to the previous one if not
    //then we check if it isnt already used in other document.
    if (receiptInput.receipt_nr != receipt.receipt_nr) {
      const receiptArr = await Receipt.findOne({
        receipt_nr: receiptInput.receipt_nr,
      });

      if (receiptArr) {
        const error = new Error(
          "Numer paragonu znajduje się już w bazie danych"
        );
        error.statusCode = 409;
        throw error;
      }
    }

    // then we need to check if we need to add new customer, or just pick it up from the db.

    try {
      await customerSave(customerData);
    } catch (err) {
      const error = new Error(
        `Klient ${
          err === "Client" ? "takiej nazwie" : "takim NIPie"
        } znajduje się już w bazie danych`
      );
      error.statusCode = 409;
      throw error;
    }

    //Now we splice all orders from the array but before that
    //we recalculate all the existing products in warehouse
    await Promise.all(receipt.order.map(async (el) => await productCalc(el)));

    receipt.order = await Promise.all(
      orderData.map(async (el) => await productSave(el))
    );
    receipt.receipt_nr = receiptInput.receipt_nr;
    receipt.date = receiptInput.date;
    receipt.total_price = receiptInput.total_price;
    receipt.pay_method = receiptInput.pay_method;

    await receipt.save();
    return { message: "Paragon został zaktualizowany poprawnie" };
  },
  delReceipt: async function ({ id }, req) {
    checkAuth(req.logged);
    const errors = [];
    if (validator.isEmpty(id)) {
      errors.push({ message: "ID paragonu jest wymagane" });
    }
    if (errors.length > 0) {
      const error = new Error("Nieprawidłowe dane wejściowe");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }
    const receipt = await Receipt.findById(id);
    if (!receipt) {
      const error = new Error("Paragon nie został znaleziony");
      error.statusCode = 404;
      throw error;
    }
    // console.log(receipt)
    //we recalculate all the existing products in warehouse
    await Promise.all(receipt.order.map(async (el) => await productCalc(el)));

    await Receipt.findByIdAndDelete(id);

    return { message: "Paragon został usunięty." };
  },
  getCustomers: async function (args, req) {
    checkAuth(req.logged);
    const allCustomers = await Customer.find();
    const newAllCustomers = allCustomers
      .map((el) => el._doc)
      .map((el) => {
        return {
          ...el,
          selldate: el.selldate.toISOString(),
        };
      });
    return newAllCustomers;
  },
  getCustomer: async function ({ id }, req) {
    checkAuth(req.logged);
    let singleCustomer;
    try {
      singleCustomer = await Customer.findById(id);
    } catch {
      const error = new Error("Klient nie został odnaleziony.");
      error.statusCode = 404;
      throw error;
    }
    return singleCustomer;
  },
  fetchCustomerData: async function ({ nip }, req) {
    checkAuth(req.logged);
    let customerData;
    try {
      customerData = await soap.soapCall(nip);
    } catch {
      const error = new Error("Usługa chwilowo nie jest dostępna.");
      error.statusCode = 404;
      throw error;
    }
    return customerData;
  },
  addCustomer: async function ({ customerInput }, req) {
    checkAuth(req.logged);
    const { name, nip, city, street, selldate, phonenr, info } = customerInput;
    const errors = [];
    if (validator.isEmpty(customerInput.name)) {
      errors.push({ message: "Klient musi posiadać nazwę" });
    }
    if (errors.length > 0) {
      const error = new Error("Nieprawidłowe dane wejściowe");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }

    const nipIsTaken = nip
      ? await Customer.findOne({
          $and: [{ nip: nip }, { nip: { $ne: "nie dotyczy" } }],
        })
      : null;
    // const nipIsTaken = nip ? await Customer.findOne({nip: nip}) : null
    const nameIsTaken = await Customer.findOne({ name: name });

    if (nipIsTaken || nameIsTaken) {
      const error = new Error(
        `${
          nipIsTaken
            ? "Klient o takim NIPie już istnieje"
            : "Klient o takiej nazwie już istnieje"
        }`
      );
      error.statusCode = 409;
      throw error;
    }

    const customer = new Customer({
      name: name,
      nip: nip,
      city: city,
      street: street,
      phonenr: phonenr,
      selldate: selldate,
      info: info,
      hasInvoice: nip ? true : false,
    });
    await customer.save();
    return { message: "Klient został dodany poprawnie" };
  },
  editCustomer: async function ({ id, customerInput }, req) {
    checkAuth(req.logged);
    const { name, nip, city, street, info, phonenr, selldate, hasInvoice } =
      customerInput;
    const errors = [];
    if (validator.isEmpty(id)) {
      errors.push({ message: "ID klienta jest wymagane." });
    }
    if (
      validator.isEmpty(name) ||
      (validator.isEmpty(nip) && hasInvoice) ||
      (validator.isEmpty(street) && hasInvoice) ||
      (validator.isEmpty(city) && hasInvoice)
    ) {
      errors.push({ message: "Dane klienta są niekompletne." });
    }
    if (errors.length > 0) {
      const error = new Error("Nieprawidłowe dane wejściowe");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }

    let customer = await Customer.findById(id);
    if (!customer) {
      const error = new Error("Klient nie został odnaleziony");
      error.statusCode = 404;
      throw error;
    }

    if (customer.nip != nip) {
      const nipExists = nip
        ? await Customer.findOne({
            $and: [{ nip: nip }, { nip: { $ne: "nie dotyczy" } }],
          })
        : null;
      // const nipExists = await Customer.findOne({nip: nip})
      if (nipExists) {
        const error = new Error("Klient o takim NIPie już istnieje");
        error.statusCode = 409;
        throw error;
      }
    }

    customer.name = name;
    customer.nip = nip;
    customer.city = city;
    customer.street = street;
    customer.phonenr = phonenr;
    customer.selldate = selldate;
    customer.info = info;

    await customer.save();

    return { message: "Klient został zaktualizowany poprawnie" };
  },
  delCustomer: async function ({ id }, req) {
    checkAuth(req.logged);
    const errors = [];
    if (validator.isEmpty(id)) {
      errors.push({ message: "ID klienta jest wymagane." });
    }
    if (errors.length > 0) {
      const error = new Error("Nieprawidłowe dane wejściowe");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }
    const customer = await Customer.exists({ _id: id });
    if (!customer) {
      const error = new Error("Klient nie został odnaleziony.");
      error.code = 404;
      throw error;
    }
    const customerInvoices = await Invoice.find().where("customer", id);
    if (customerInvoices.length > 0) {
      const invoiceNr = customerInvoices[0].invoice_nr;
      const error = new Error(
        `Nie można usunąć klienta, ponieważ jest powiązany z fakturą nr: ${invoiceNr}.`
      );
      error.statusCode = 444;
      throw error;
    }
    const customerReceipts = await Receipt.find().where("customer", id);
    if (customerReceipts.length > 0) {
      const receiptNr = customerReceipts[0].receipt_nr;
      const error = new Error(
        `Nie można usunąć klienta, ponieważ jest powiązany z paragonem nr: ${receiptNr}.`
      );
      error.statusCode = 444;
      throw error;
    }
    await Customer.findByIdAndDelete(id);

    return { message: "Klient został usunięty." };
  },
  getProducts: async function (args, req) {
    checkAuth(req.logged);
    const allProducts = await Product.find();
    return allProducts;
  },
  getProduct: async function ({ id }, req) {
    checkAuth(req.logged);
    let singleProduct;
    try {
      singleProduct = await Product.findById(id);
    } catch {
      const error = new Error("Produkt nie został odnaleziony.");
      error.statusCode = 404;
      throw error;
    }
    return singleProduct;
  },
  addProduct: async function ({ productInput }, req) {
    checkAuth(req.logged);
    const errors = [];
    const { name, brand, model, quantity, vat, price_net, price_gross } =
      productInput;

    checkIfEmpty([name, quantity, vat, price_gross, price_net])
      ? errors.push({ message: "Dane produktu są niekompletne." })
      : null;
    if (errors.length > 0) {
      const error = new Error("Dane wejściowe są niekompletne.");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }

    const nameIsTaken = await Product.findOne({ name: name });

    if (nameIsTaken) {
      const error = new Error("Product o takiej nazwie już istnieje");
      error.statusCode = 409;
      throw error;
    }

    const product = new Product({
      name: name,
      brand: brand,
      model: model,
      quantity: quantity,
      price_net: price_net,
      price_gross: price_gross,
      vat: vat,
    });

    await product.save();
    return { message: "Produkt został dodany poprawnie" };
  },
  editProduct: async function ({ id, productInput }, req) {
    checkAuth(req.logged);
    const errors = [];
    if (validator.isEmpty(id)) {
      errors.push({ message: "ID produktu jest wymagane." });
    }
    const { name, brand, model, quantity, vat, price_net, price_gross } =
      productInput;

    checkIfEmpty([name, quantity, vat, price_gross, price_net])
      ? errors.push({ message: "Dane produktu są niekompletne." })
      : null;

    if (errors.length > 0) {
      const error = new Error("Nieprawidłowe dane wejściowe");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }

    let product;
    try {
      product = await Product.findById(id);
    } catch {
      const error = new Error("Produkt nie został odnaleziony.");
      error.statusCode = 404;
      throw error;
    }

    product.name = name;
    product.quantity = quantity;
    product.price_net = price_net;
    product.price_gross = price_gross;
    product.vat = vat;
    product.brand = brand;
    product.model = model;

    await product.save();

    return { message: "Produkt został zaktualizowany poprawnie" };
  },
  delProduct: async function ({ id }, req) {
    checkAuth(req.logged);
    const errors = [];
    if (validator.isEmpty(id)) {
      errors.push({ message: "ID produktu jest wymagane" });
    }
    if (errors.length > 0) {
      const error = new Error("Nieprawidłowe dane wejściowe.");
      error.data = errors;
      error.statusCode = 422;
      throw error;
    }
    const product = await Product.exists({ _id: id });
    if (!product) {
      const error = new Error("Produkt nie został odnaleziony.");
      error.statusCode = 404;
      throw error;
    }
    const productInvoices = await Invoice.find().where("order.product", id);
    if (productInvoices.length > 0) {
      const invoiceNr = productInvoices[0].invoice_nr;
      const error = new Error(
        `Nie można usunąć produktu, ponieważ jest powiązany z fakturą nr: ${invoiceNr}.`
      );
      error.statusCode = 444;
      error.code = 444;
      throw error;
    }
    const productReceipts = await Receipt.find().where("order.product", id);
    if (productReceipts.length > 0) {
      const receiptNr = productReceipts[0].receipt_nr;
      const error = new Error(
        `Nie można usunąć produktu, ponieważ jest powiązany z paragonem nr: ${receiptNr}.`
      );
      error.statusCode = 444;
      error.code = 444;
      throw error;
    }
    await Product.findByIdAndDelete(id);

    return { message: "Produkt został usunięty." };
  },
};
