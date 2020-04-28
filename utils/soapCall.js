const soapRequest = require('easy-soap-request');

//import userkey for soapcall
const { soapUserKey } = require('../connect');

let createXml = (action, body, xmlns) =>{
    return (`
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07" ${xmlns}>
            <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
                <wsa:To>https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc</wsa:To>
                <wsa:Action>${action}</wsa:Action>
            </soap:Header>
            <soap:Body>
                ${body}
            </soap:Body>
        </soap:Envelope>
    `)
}
const url = 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';
let sampleHeaders = {'Content-Type': 'application/soap+xml;charset=UTF-8'};

//login to SOAP first.
let soapAction = 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj';
let soapBody = `
    <ns:Zaloguj>
        <ns:pKluczUzytkownika>${soapUserKey}</ns:pKluczUzytkownika>
    </ns:Zaloguj>
`
exports.soapCall = async (nip) => {
    return new Promise(async (resolve, reject)=>{
        let xml = createXml(soapAction, soapBody, '')
  
        const { response } = await soapRequest({ url: url, headers: sampleHeaders, xml: xml, timeout: 1000 }); // Optional timeout parameter(milliseconds)
        const { body } = response;
        
        const start = body.indexOf('<ZalogujResult>') + 15;
        const end = body.indexOf('</ZalogujResult>')

        const token = body.slice(start, end);

        if(token){
            const soapAction2 = 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty'
            const soapBody2 = `
                <ns:DaneSzukajPodmioty>
                    <ns:pParametryWyszukiwania>
                        <dat:Nip>${nip}</dat:Nip>
                    </ns:pParametryWyszukiwania>
                </ns:DaneSzukajPodmioty>
            `
            const soapXmlns = 'xmlns:dat="http://CIS/BIR/PUBL/2014/07/DataContract"'
            
            const xml = createXml(soapAction2, soapBody2, soapXmlns)
            
            sampleHeaders = {...sampleHeaders,'sid': token}

            const secondCall = await soapRequest({ url: url, headers: sampleHeaders, xml: xml, timeout: 1000 }); // Optional timeout parameter(milliseconds)
            const data = secondCall.response.body;

            const nameStart = data.indexOf(';Nazwa') + 10;
            const nameEnd = data.indexOf(';/Nazwa') -3

            const name = data.slice(nameStart, nameEnd);

            const cityStart = data.indexOf(';Miejscowosc') + 16;
            const cityEnd = data.indexOf(';/Miejscowosc') -3

            const city = data.slice(cityStart, cityEnd);

            const postalStart = data.indexOf(';KodPocztowy') + 16;
            const postalEnd = data.indexOf(';/KodPocztowy') -3
            
            const postal = data.slice(postalStart, postalEnd);

            const streetStart = data.indexOf(';Ulica') + 14;
            const streetEnd = data.indexOf(';/Ulica') -3
            const street = data.slice(streetStart, streetEnd);

            const nrStart = data.indexOf(';NrNieruchomosci') + 20;
            const nrEnd = data.indexOf(';/NrNieruchomosci') -3

            const nr = data.slice(nrStart, nrEnd);

            resolve({
                name: name,
                city: city+', '+postal,
                street: !data.includes('Ulica /') ? street+' '+nr : nr
            })
        }
    })
};