const soapRequest = require('easy-soap-request');

// const fs = require('fs');

// example data
const url = 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';
const sampleHeaders = {
  'user-agent': 'sampleTest',
  'Content-Type': 'application/soap+xml;charset=UTF-8',
  'soapAction': 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj',
};
// const xml = fs.readFileSync('test/zipCodeEnvelope.xml', 'utf-8');

const xml = `
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07">
    <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
        <wsa:To>https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc</wsa:To>
        <wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj</wsa:Action>
    </soap:Header>
    <soap:Body>
        <ns:Zaloguj>
            <ns:pKluczUzytkownika>fefb7584d2164650b73e</ns:pKluczUzytkownika>
        </ns:Zaloguj>
    </soap:Body>
</soap:Envelope>
`

// usage of module

exports.soapCall = async () => {
  
  const { response } = await soapRequest({ url: url, headers: sampleHeaders, xml: xml, timeout: 1000 }); // Optional timeout parameter(milliseconds)
  const { body } = response;
  
  const start = body.indexOf('<ZalogujResult>') + 15;
  const end = body.indexOf('</ZalogujResult>')

  const token = body.slice(start, end);

  console.log(body.slice(start, end))

  if(token){

    // const url = 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';
    const sampleHeaders2 = {
        'user-agent': 'sampleTest',
        'Content-Type': 'application/soap+xml;charset=UTF-8',
        'soapAction': 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty',
        'sid': token
    };
    // const xml = fs.readFileSync('test/zipCodeEnvelope.xml', 'utf-8');

    const xml2 = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07" xmlns:dat="http://CIS/BIR/PUBL/2014/07/DataContract">
            <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
            <wsa:To>https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc</wsa:To>
            <wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty</wsa:Action>
            </soap:Header>
                <soap:Body>
                <ns:DaneSzukajPodmioty>
                    <ns:pParametryWyszukiwania>
                        <dat:Nip>8430002804</dat:Nip>
                    </ns:pParametryWyszukiwania>
                </ns:DaneSzukajPodmioty>
            </soap:Body>
        </soap:Envelope>
    `
    
    
    const secondCall = await soapRequest({ url: url, headers: sampleHeaders2, xml: xml2, timeout: 1000 }); // Optional timeout parameter(milliseconds)
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

    console.log({
        name: name,
        city: city+', '+postal,
        street: street+' '+nr
    })
    

    return{
        name: name,
        city: city+', '+postal,
        street: street
    }
    
    
  }

 
};