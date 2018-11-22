var fs = require("fs");
var path = require("path");
var {calcDiff} = require("./index");
const {
    readFileData,
    getTotalBalanceDebit,
    getTotalBalanceCredit,
    sortDebitAcc,
    sortCreditAcc,
    selectAllDebitCards,
    selectDebitCards,
    selectAllCreditCard,
    selectCreditCards,
    findBestMatch,
    calculateBestMatch,
    dataEnricher,
    sortCreditAccAsc,
    sortDebitAccDesc
} = require("../lib/bestPlanHelper");

function bestMatchCalculation(userName){
    let bestMatchCalculation = new Promise(function (resolve,reject){
        try{
            let jsCredit;
            let jsDebit;
            let creditFilePath = path.join(__dirname,`./../data/credit/${userName}.json`);
            let debitFilePath = path.join(__dirname,`./../data/debit/${userName}.json`);

            readFileData(creditFilePath).then(creditData =>{ 
                jsCredit = creditData;
                readFileData(debitFilePath).then(debitData => {
                    jsDebit = debitData;
                    var savings = savingCalculation(jsDebit,jsCredit);
                    console.log("savings",savings);
                    let {totalAvailableBalance} = getTotalBalanceDebit(jsDebit);
                    let {totalCreditDue,totalMinDue} = getTotalBalanceCredit(jsCredit);
                    let sortedDebitAccs = sortDebitAcc(jsDebit);
                    let sortedCreditAccs = sortCreditAcc(jsCredit);

                    let debitAccs = sortedDebitAccs.banks;
                    let creditAccs = sortedCreditAccs.banks;

                    if(totalCreditDue <= totalAvailableBalance)
                    {
                        let debitAccounts = selectDebitCards(debitAccs, totalCreditDue);
                        let creditAccounts = selectAllCreditCard(creditAccs);
                        let {bestPlan} = calculateBestMatch(debitAccounts,creditAccounts);
                        let responseObj = dataEnricher(bestPlan,jsCredit,jsDebit);
                        responseObj["optimizeSaving"] = savings;
                        console.log(savings);
                        resolve(responseObj);
                    }
                    else{
                        let creditAccounts = selectCreditCards(creditAccs, totalAvailableBalance,totalMinDue);
                        let debitAccounts = selectAllDebitCards(debitAccs);
                        let {bestPlan} = calculateBestMatch(debitAccounts,creditAccounts);
                        let responseObj = dataEnricher(bestPlan,jsCredit,jsDebit);
                        responseObj["optimizeSaving"] = savings;
                        console.log(savings);
                        resolve(responseObj);
                    }
                
                })
            })
        }
        catch(err)
        {
            reject(err);
        }
        
    })
    return bestMatchCalculation;
}

let savingCalculation = (jsDebit,jsCredit) => {
    let debitAccs = JSON.parse(JSON.stringify(jsDebit));
    let creditAccs = JSON.parse(JSON.stringify(jsCredit));

    let {totalAvailableBalance} = getTotalBalanceDebit(debitAccs);
    let {totalCreditDue,totalMinDue} = getTotalBalanceCredit(creditAccs);
    let sortedDebitAccs = sortDebitAcc(debitAccs);
    let sortedCreditAccs = sortCreditAcc(creditAccs);
    //console.log(totalAvailableBalance,totalCreditDue,totalMinDue,sortedDebitAccs.banks,sortedCreditAccs.banks);
    let bestPlanSaving = differenceCalc(totalAvailableBalance,totalCreditDue,totalMinDue,sortedDebitAccs.banks,sortedCreditAccs.banks);

    let revsortedDebitAccs = sortDebitAccDesc(jsDebit);
    let revsortedCreditAccs = sortCreditAccAsc(jsCredit);
    let worstPlanSaving = differenceCalc(totalAvailableBalance,totalCreditDue,totalMinDue,revsortedDebitAccs.banks,revsortedCreditAccs.banks);

    return Math.abs(bestPlanSaving - worstPlanSaving);
}

let differenceCalc = (totalAvailableBalance,totalCreditDue,totalMinDue,debitAccs,creditAccs) => {
    if(totalCreditDue <= totalAvailableBalance)
    {
        let debitAccounts = selectDebitCards(debitAccs, totalCreditDue);
        let creditAccounts = selectAllCreditCard(creditAccs);
        debitAccounts.map((debitBank) => {
            debitBank.accounts[0].balance = debitBank.accounts[0].balance - debitBank.accounts[0].usableAmount;
        })

        //console.log(creditAccounts);

        creditAccounts.map((creditBank) =>{
            creditBank.accounts[0].totalBalanceDue = creditBank.accounts[0].totalBalanceDue - creditBank.accounts[0].clearableAmount;
        })
        return calcDiff(debitAccounts,creditAccounts);
    }
    else{
        let creditAccounts = selectCreditCards(creditAccs, totalAvailableBalance,totalMinDue);
        let debitAccounts = selectAllDebitCards(debitAccs);

        //console.log(creditAccounts);

        debitAccounts.map((debitBank) => {
            debitBank.accounts[0].balance = debitBank.accounts[0].balance - debitBank.accounts[0].usableAmount;
        })

        creditAccounts.map((creditBank) =>{
            creditBank.accounts[0].totalBalanceDue = creditBank.accounts[0].totalBalanceDue - creditBank.accounts[0].clearableAmount;
        })

        return calcDiff(debitAccounts,creditAccounts);
    }
}




module.exports = bestMatchCalculation;


