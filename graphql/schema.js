const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    input CustomerInputData{
        customer_id: ID
        name: String!
        nip: Int!
        city: String!
        street: String!
    }
    input ProductInputData{
        product_id: ID
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
        total_price: Float
    }
    type invoice{
        _id: ID!
        invoice_nr: String!
        date: String!
        total_price: Float!
        customer: customer!
        order: [product!]!
    }
    type returnData{
        message: String!
    }

    type RootQuery{
        getInvoices: [invoice!]!
        getInvoice(id: String!): invoice!
        getCustomers: [customer!]!
        getCustomer(id: String!): customer!
        getProducts: [product!]!
        getProduct(id: String!): product!
    }

    type RootMutation{
        addInvoice(invoiceInput: InvoiceInputData): returnData!
        editInvoice(id: String!): returnData!
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