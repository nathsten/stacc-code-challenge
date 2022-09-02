const express = require('express');
const bodyParser = require('body-parser');
const { readFileSync } = require('fs');
const nodeFetch = require('node-fetch');
const PEP = JSON.parse(readFileSync('pep.json'));
const { sortByName, sortByEmail, sortByDoB, sortByOcupation } = require('./util/sort');
const { PEPScan, orgScan } = require('./util/scan');
const PORT = 5050;

const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use('/search', express.static('public/search'));
app.use('/', express.static('public/home'));
app.use('/vue', express.static('public/vue'));

app.listen(PORT, e => e ? console.log(`Something went wrong...\n${e}`) : console.log(`Server running on http://127.0.0.1:5050/`));

app.post('/KYC', async (req, res) => {

    const { category } = req.body;

    switch(category){
        case "name":
            try{
                const { firstName, lastName } = req.body;
                const fullName = `${firstName ? firstName + ' ' : ''}${lastName ? lastName + ' ' : ''}`;
                const getPEP = await nodeFetch(`https://code-challenge.stacc.dev/api/pep?name=${fullName}`);
                const PEP = await getPEP.json();
                // Most likely this will only return one person, if several I'm too lazy to handle...
                // Just be spesific in searching...
                const isSanctionated = await PEPScan(PEP.hits[0]);
                res.send({status: "OK", person: PEP.hits[0], isSanctionated});
                return;
            }
            catch(err){
                res.send({status: "Invalid name"});
                console.log(err);
                return;
            }

        case "orgNr":
            try{
                // Sort out and return by email.
                const { orgNr } = req.body;
                const getOrgInfo = await nodeFetch(`https://code-challenge.stacc.dev/api/enheter?orgNr=${orgNr}`);
                const OrgInfo = await getOrgInfo.json();
                const getOrgRols = await nodeFetch(`https://code-challenge.stacc.dev/api/roller?orgNr=${orgNr}`);
                const [ OrgRols ] = await getOrgRols.json();
                const { sanctioned, sanctions, isBankrupt, person } = await orgScan(OrgRols, OrgInfo, nodeFetch);
                res.send({status: "OK", OrgInfo, sanctioned, sanctions, isBankrupt, person});
                return;
            }
            catch(err){
                res.send({status: "Invalid orgNr"});
                console.log(err)
                return;
            }
        default: 
            res.send({status: "Invalid category."});
            return;
    }

    // const { firstName, lastName } = req.body;
    // const getPEP = await nodeFetch(`https://code-challenge.stacc.dev/api/pep?name=${firstName}%20${lastName}`);
    // const resPEP = await getPEP.json(); 
    // res.send(resPEP);
});

app.post('/KYCSearch', async (req, res) => {

    const { category } = req.body;

    switch(category){

        case "name":
            try{
                // Sort and return by name.

                const { name } = req.body;

                const PEPs = await sortByName(PEP, name);
                res.send({status: "OK", PEPs});
                return;
            }
            catch(err){
                res.send({status: "Invalid name"});
                console.log(err);
                return;
            }

        case "email":
            try{
                // Sort out and return by email.
                const { email } = req.body;

                const PEPs = await sortByEmail(PEP, email);
                res.send({status: "OK", PEPs});
                return;
            }
            catch{
                res.send({status: "Invalid email"});
                return;
            }

        case "DoB":
            try{
                // Sort and return by date of brith.
                const { DoB, month } = req.body;
                
                const PEPs = await sortByDoB(PEP, DoB, month);
                res.send({status: "OK", PEPs});
                return;
            }
            catch{
                res.send({status: "Invalid date of birth format."});
                return;
            }

        case "Ocupation":
            {
                // Sort and return by ocupation.
                const { ocupation } = req.body;

                const PEPs = await sortByOcupation(PEP, ocupation);
                res.send({status: "OK", PEPs});
                return;
            }

        default: 
            res.send({status: "Invalid category."});
            return;
        
    }

});