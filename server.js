console.log("starting server");

var express = require("express");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var CONTACTS_COLLECTION = "contacts";

const request = require('request');

var app = express();
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test", function (err, client) {
    if (err) {
        console.log(err);
        process.exit(1);
    }

    // Save database object from the callback for reuse.
    db = client.db();
    console.log("Database connection ready");

    // Initialize the app.
    var server = app.listen(process.env.PORT || 8080, function () {
        var port = server.address().port;
        console.log("App now running on port", port);
    });

});

// use to update IotD - needs tweaked
//  milliseconds in a day = 24 * 3600 * 1000 = 86400000

function resetAtMidnight() {
    var now = new Date();
    var night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // the next day, ...
        0, 0, 0 // ...at 00:00:00 hours
    );
    var msToMidnight = night.getTime() - now.getTime();

    setTimeout(function () {
        getNasaIotD(); //      <-- This is the function being called at midnight.
        resetAtMidnight(); //      Then, reset again next midnight.
    }, msToMidnight);
}


function getNasaIotD() {
    request('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', {
        json: true
    }, (err, res, body) => {
        if (err) {
            return console.log(err);
        }
        console.log(body);
    });

}


// CONTACTS API ROUTES BELOW

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
    console.log("ERROR: " + reason);
    res.status(code || 500).json({
        "error": message
    });
}

/*  "/api/contacts"
 *    GET: finds all contacts
 *    POST: creates a new contact
 */


app.get("/", function (req, res) {
    res.send('<p>Basic functionality</p>');
});

app.get("/api/contacts", function (req, res) {
    db.collection(CONTACTS_COLLECTION).find({}).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get contacts.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.post("/api/contacts", function (req, res) {
    var newContact = req.body;
    newContact.createDate = new Date();

    if (!req.body.name) {
        handleError(res, "Invalid user input", "Must provide a name.", 400);
    } else {
        db.collection(CONTACTS_COLLECTION).insertOne(newContact, function (err, doc) {
            if (err) {
                handleError(res, err.message, "Failed to create new contact.");
            } else {
                res.status(201).json(doc.ops[0]);
            }
        });
    }
});

/*  "/api/contacts/:id"
 *    GET: find contact by id
 *    PUT: update contact by id
 *    DELETE: deletes contact by id
 */

app.get("/api/contacts/:id", function (req, res) {
    db.collection(CONTACTS_COLLECTION).findOne({
        _id: new ObjectID(req.params.id)
    }, function (err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get contact");
        } else {
            res.status(200).json(doc);
        }
    });
});

app.put("/api/contacts/:id", function (req, res) {
    var updateDoc = req.body;
    delete updateDoc._id;

    db.collection(CONTACTS_COLLECTION).updateOne({
        _id: new ObjectID(req.params.id)
    }, updateDoc, function (err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to update contact");
        } else {
            updateDoc._id = req.params.id;
            res.status(200).json(updateDoc);
        }
    });
});

app.delete("/api/contacts/:id", function (req, res) {
    db.collection(CONTACTS_COLLECTION).deleteOne({
        _id: new ObjectID(req.params.id)
    }, function (err, result) {
        if (err) {
            handleError(res, err.message, "Failed to delete contact");
        } else {
            res.status(200).json(req.params.id);
        }
    });
});

app.all('*', function(req, res) {
    res.status(400).json({"Error":"Bad request"});
    // throw new Error({"Error":"Bad request"})
})