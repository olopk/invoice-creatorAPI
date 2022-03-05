const { buildSchema } = require("graphql");

module.exports = buildSchema(`
    input SignInInputData{
        name: String!
        surname: String!
        email: String!
        password: String!
    }
    input CustomerInputData{
        _id: ID
        name: String
        nip: String
        city: String
        street: String
        phonenr: String
        selldate: String
        info: String
        hasInvoice: Boolean
    }
    input ProductInputData{
        _id: ID
        name: String!
        brand: String
        unit: String
        model: String
        quantity: Int!
        price_net: Float!
        price_gross: Float!
        total_price_net: Float
        total_price_gross: Float
        vat: Int!
    }
    input InvoiceInputData {
        invoice_nr: String!
        invoice_comment: String
        date: String!
        total_price: Float!
        pay_method: String!
        pay_date: String
        customer: CustomerInputData!
        order: [ProductInputData!]!
    }
    input ReceiptInputData {
        receipt_nr: String!
        date: String!
        total_price: Float!
        pay_method: String!
        customer: CustomerInputData
        order: [ProductInputData!]!
    }
    type userData{
        _id: ID
        name: String
        token: String
        tokenExpiry: Int
    }
    type customer{
        _id: ID!
        name: String
        nip: String
        city: String
        street: String
        phonenr: String
        selldate: String
        info: String
        hasInvoice: Boolean
    }
    type product{
        _id: ID!
        name: String!
        brand: String
        model: String
        quantity: Int
        price_net: Float!
        price_gross: Float!
        vat: Int!
    }
    type orderItem{
        _id: ID!
        product: product!
        quantity: Int!
        price_net: Float!
        price_gross: Float!
        vat: Int!
        total_price_net: Float!
        total_price_gross: Float!
    }
    type invoice{
        _id: ID!
        invoice_nr: String!
        invoice_comment: String
        date: String!
        total_price: Float!
        pay_method: String!
        pay_date: String
        customer: customer!
        order: [orderItem!]!
    }
    type receipt{
        _id: ID!
        receipt_nr: String!
        date: String!
        total_price: Float!
        pay_method: String!
        customer: customer
        order: [orderItem!]!
    }
    type customerFetchedData{
        name: String!
        city: String!
        street: String!
    }
    type returnData{
        message: String!
    }

    type RootQuery{
        logIn(email: String!, password: String!): userData!
        getUser: userData!
        getInvoices: [invoice!]!
        getInvoice(id: String!): invoice!
        getReceipts: [receipt!]!
        getReceipt(id: String!): receipt!
        getCustomers: [customer!]!
        getCustomer(id: String!): customer!
        getProducts: [product!]!
        getProduct(id: String!): product!
        fetchCustomerData(nip: String!): customerFetchedData!
    }

    type RootMutation{
        signIn(signInInput: SignInInputData!): returnData!

        addInvoice(invoiceInput: InvoiceInputData): returnData!
        editInvoice(id: String!, invoiceInput: InvoiceInputData): returnData!
        delInvoice(id: String!): returnData!

        addReceipt(receiptInput: ReceiptInputData): returnData!
        editReceipt(id: String!, receiptInput: ReceiptInputData): returnData!
        delReceipt(id: String!): returnData!

        addCustomer(customerInput: CustomerInputData): returnData!
        editCustomer(id: String!, customerInput: CustomerInputData!): returnData!
        delCustomer(id: String!): returnData!

        addProduct(productInput: ProductInputData!): returnData!
        editProduct(id: String!, productInput: ProductInputData!): returnData!
        delProduct(id: String!): returnData!
    }

    schema{
        query: RootQuery
        mutation: RootMutation
    } 
`);
