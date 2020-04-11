const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    input SignInInputData{
        name: String!
        surname: String!
        email: String!
        password: String!
    }
    input CustomerInputData{
        _id: ID
        name: String!
        nip: Int!
        city: String!
        street: String!
    }
    input ProductInputData{
        _id: ID
        name: String!
        brand: String
        unit: String
        model: String
        price: Float!
        quantity: Int!
        total_price: Float
    }
    input InvoiceInputData {
        invoice_nr: String!
        date: String!
        total_price: Float!
        customer: CustomerInputData!
        order: [ProductInputData!]!
    }
    type userData{
        _id: ID!
        name: String!
        token: String!
        tokenExpiry: Int!
    }
    type customer{
        _id: ID!
        name: String!
        nip: Int!
        city: String!
        street: String!
    }
    type product{
        _id: ID!
        name: String!
        brand: String
        model: String
        price: Float!
        quantity: Int
    }
    type orderItem{
        _id: ID!
        product: product!
        quantity: Int!
        price: Float!
        total_price: Float!
    }
    type invoice{
        _id: ID!
        invoice_nr: String!
        date: String!
        total_price: Float!
        customer: customer!
        order: [orderItem!]!
    }
    type returnData{
        message: String!
    }

    type RootQuery{
        logIn(email: String!, password: String!): userData!
        getInvoices: [invoice!]!
        getInvoice(id: String!): invoice!
        getCustomers: [customer!]!
        getCustomer(id: String!): customer!
        getProducts: [product!]!
        getProduct(id: String!): product!
    }

    type RootMutation{
        signIn(signInInput: SignInInputData!): returnData!
        addInvoice(invoiceInput: InvoiceInputData): returnData!
        editInvoice(id: String!, invoiceInput: InvoiceInputData): returnData!
        delInvoice(id: String!): returnData!

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