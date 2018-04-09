var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

// stellar js sdk
var StellarSdk = require('stellar-sdk');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// This code can be run in the browser at https://www.stellar.org/laboratory/
// That site exposes a global StellarSdk object you can use.
// To run this code in the Chrome, open the console tab in the DevTools.
// The hotkey to open the DevTools console is Ctrl+Shift+J or (Cmd+Opt+J on Mac).

// The source account is the account we will be signing and sending from.
var sourceSecretKey = 'SBEIC2LB5YBET63NZZWOYC4SDKF76ZVVQJKXHSKFVVWVLQ6VKXJAD4NX';

// Derive Keypair object and public key (that starts with a G) from the secret
var sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
var sourcePublicKey = sourceKeypair.publicKey();

var receiverPublicKey = 'GAJUTZBH5GTVDBVFAXEBFEHSVQ4D2C3ZXIJPR5I3GYM3ASHRJLGX3EFE';

// Configure StellarSdk to talk to the horizon instance hosted by Stellar.org
// To use the live network, set the hostname to 'horizon.stellar.org'
var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
// var server = new StellarSdk.Server('http://localhost:8000/');

// Uncomment the following line to build transactions for the live network. Be
// sure to also change the horizon hostname.
// StellarSdk.Network.usePublicNetwork();
StellarSdk.Network.useTestNetwork();


// http://localhost:3000/
app.get('/', function(req, res) {
    res.send("<h1>Hello World!</h1>\
    <a href='/transaction'>Transaction</a><br />\
    <a href='/trade_aggregation'>Trade Aggregation</a>");
});


// localhost:3000/transaction
app.get('/transaction', async function(req, res) {
    var str = "<h1><a href='/'>Home</a></h1>";
    str += "<p>start testing transaction...</p>";
    var transaction;

    // Transactions require a valid sequence number that is specific to this account.
    // We can fetch the current sequence number for the source account from Horizon.
    await server.loadAccount(sourcePublicKey)
        .then(function(account) {
            transaction = new StellarSdk.TransactionBuilder(account)
                // Add a payment operation to the transaction
                .addOperation(StellarSdk.Operation.payment({
                    destination: receiverPublicKey,
                    // The term native asset refers to lumens
                    asset: StellarSdk.Asset.native(),
                    // Specify 350.1234567 lumens. Lumens are divisible to seven digits past
                    // the decimal. They are represented in JS Stellar SDK in string format
                    // to avoid errors from the use of the JavaScript Number data structure.
                    amount: '8.34567',
                }))
                // Uncomment to add a memo (https://www.stellar.org/developers/learn/concepts/transactions.html)
                // .addMemo(StellarSdk.Memo.text('Hello world!'))
                .build();
            str += "<p>start signing transaction with pyament...</p>";

            // Sign this transaction with the secret key
            // NOTE: signing is transaction is network specific. Test network transactions
            // won't work in the public network. To switch networks, use the Network object
            // as explained above (look for StellarSdk.Network).
            transaction.sign(sourceKeypair);
            str += "<p>transaction signed...</p>";

            // Let's see the XDR (encoded in base64) of the transaction we just built
            console.log(transaction.toEnvelope().toXDR('base64'));
            str += "<p>transaction's XDR is:</p>";
            str += "<p>" + transaction.toEnvelope().toXDR('base64') + "</p>";

        })
        .catch(function(e) {
            console.error(e);
        });

    await server.submitTransaction(transaction)
        .then(function(transactionResult) {
            console.log(JSON.stringify(transactionResult, null, 2));
            console.log('\nSuccess! View the transaction at: ');
            console.log(transactionResult._links.transaction.href);
        })
        .catch(function(err) {
            console.log('An error has occured:');
            console.log(err);
        });

    str += "<p>transaction submitted, see console for output</p>";

    res.send(str);
});


// localhost:3000/trade_aggregation
app.get('/trade_aggregation', async function(req, res) {
    var str = "<h1><a href='/'>Home</a></h1>";
    str += "<p>start testing trade_aggregation...</p>";

    // now try trade aggregator
    const assetObject1 = StellarSdk.Asset.native();
    const assetObject2 = new StellarSdk.Asset(
        "CMA",
        "GD6OHWXPO7T46SEL2SNAFKGHLQZQ467U6MMDFKZ6BR3UXCINQ4BP3IZA"
    );
    trade_aggregation = server.tradeAggregation(
        assetObject1,
        assetObject2,
        Date.now() - (1000 * 3600 * 24), // 1 days
        Date.now(),
        1000 * 60 * 5 // 5 minutes
    );
    // console.log(trade_aggregation);
    str += "<p>transaction_aggregation builder created, check console</p>";

    console.log(trade_aggregation.url);
    str += "<p><a href='" + trade_aggregation.url + "'>Trade Agg URL</a></p>";

    res.send(str);
});


app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});

module.exports = app;
