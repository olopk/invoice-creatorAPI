const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    input Customer{
        name: String!
        nip: Int!
        city: String!
        street: String!
    }
    input Order{
        name: String!
        unit_price: Float!
        total_price: Float!
        quantity: Int!
    }
    input InvoiceInputData {
        invoice_nr: String!
        date: String!
        total_price: Float!
        customer: Customer!
        order: [Order!]!
    }
    type retObj{
        message: String!
    }

    type RootQuery{
        getInvoices: String!
    }

    type RootMutation{
        addInvoice(invoiceInput: InvoiceInputData): retObj!
    }

    schema{
        query: RootQuery
        mutation: RootMutation
    } 
`);