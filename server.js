console.log("starting server");

var express = require("express");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;
var cors = require('cors');

var CONTACTS_COLLECTION = "contacts";
var NEWS_COLLECTION = "hubblesitenews";
var NEWSDETAIL_COLLECTION = "hubblesitenewsdetail";
var IMAGES_COLLECTION = "hubblesiteimages";
var IMAGESDETAIL_COLLECTION = "hubblesiteimagesdetail";
var VIDEOS_COLLECTION = "hubblesitevideo";
var VIDEOSDETAIL_COLLECTION = "hubblesitevideodetail";

const request = require('request');

var app = express();
app.use(bodyParser.json());
app.use(cors());


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

    // fillNews();
    // updateNewsDetails();
    updateImages();
    updateVideos();

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

function fillNews() {

    request('http://hubblesite.org/api/v3/news?page=all', {
        json: true
    }, (err, res, body) => {
        if (err) {
            return console.log(err);
        }
        // console.log(body);
        console.log(body.length + " news items");

        db.collection(NEWS_COLLECTION).remove({});

        db.collection(NEWS_COLLECTION).insertMany(body);

    });

}

function updateNewsDetails() {

    // get all news index
    db.collection(NEWS_COLLECTION).find({}).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get news.");
        } else {
            docs.forEach( doc => {
                // check if doc already exists in details
                let search_id = doc.news_id;
                db.collection(NEWSDETAIL_COLLECTION).findOne({
                    news_id: search_id
                }, function (err, doc) {
                    if (err) {
                        handleError(res, err.message, "Failed to get news detail", 400);
                    } else {
                        // if null doc then query api for details and add result to collection
                        if (doc == []) {

                            request('http://hubblesite.org/api/v3/news_release/:' + search_id, {
                                json: true
                            }, (err, res, body) => {
                                if (err) {
                                    return console.log(err);
                                }
                                console.log(res);
                                console.log(body);
                                db.collection(NEWSDETAIL_COLLECTION).insertOne(body);
                            });

                        }
                    }
                });

            });
        }
    });

//     // delete news collection
//     // db.collection(NEWSDETAILS_COLLECTION).remove( { } );

//     // query hubblesite api for all news and add to collection
//     request('http://hubblesite.org/api/v3/news_release/:which', {
//         json: true
//     }, (err, res, body) => {
//         if (err) {
//             return console.log(err);
//         }
//         // console.log(body);
//         db.collection(NEWSDETAILS_COLLECTION).insertMany(body);
//     });
}

function updateImages() {
    // delete images collection
    db.collection(IMAGES_COLLECTION).remove({});

    // query hubblesite api for all images and add to collection
    request('http://hubblesite.org/api/v3/images?page=all', {
        json: true
    }, (err, res, body) => {
        if (err) {
            return console.log(err);
        }
        // console.log(body);
        console.log(body.length + " image items");
        db.collection(IMAGES_COLLECTION).insertMany(body);
    });
}

function updateImagesDetails() {

}

function updateVideos() {
    // delete images collection
    db.collection(VIDEOS_COLLECTION).remove({});

    // query hubblesite api for all images and add to collection
    request('http://hubblesite.org/api/v3/videos?page=all', {
        json: true
    }, (err, res, body) => {
        if (err) {
            return console.log(err);
        }
        // console.log(body);
        console.log(body.length + " video items");
        db.collection(VIDEOS_COLLECTION).insertMany(body);
    });
}

function updateVideosDetails() {

}


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
/*  "/api/contacts/:id"
 *    GET: find contact by id
 *    PUT: update contact by id
 *    DELETE: deletes contact by id
 */

app.get("/", function (req, res) {
    res.send('<p>Basic functionality</p>');
});

//***** HUBBLE SITE NEWS *****/

app.get("/api/news", function (req, res) {
    db.collection(NEWS_COLLECTION).find({}).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get news.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.get("/api/news/:id", function (req, res) {
    db.collection(NEWS_COLLECTION).findOne({
        // _id: new ObjectID(req.params.id)
        news_id: req.params.id
    }, function (err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get news", 400);
        } else {
            res.status(200).json(doc);
        }
    });
});

app.get("/api/newsdetails", function (req, res) {
    db.collection(NEWSDETAIL_COLLECTION).find({}).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get news.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.get("/api/newsdetails/:id", function (req, res) {
    db.collection(NEWSDETAIL_COLLECTION).findOne({
        // _id: new ObjectID(req.params.id)
        news_id: req.params.id
    }, function (err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get news", 400);
        } else {
            res.status(200).json(doc);
        }
    });
});



//***** HUBBLE SITE IMAGES *****/

app.get("/api/images", function (req, res) {
    db.collection(IMAGES_COLLECTION).find({}).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get images.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.get("/api/images/:id", function (req, res) {
    db.collection(IMAGESDETAIL_COLLECTION).findOne({
        _id: new ObjectID(req.params.id)
    }, function (err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get image", 400);
        } else {
            res.status(200).json(doc);
        }
    });
});


//***** HUBBLE SITE VIDEOS *****/

app.get("/api/videos", function (req, res) {
    db.collection(VIDEOS_COLLECTION).find({}).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get videos.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.get("/api/videos/:id", function (req, res) {
    db.collection(VIDEOSDETAIL_COLLECTION).findOne({
        _id: new ObjectID(req.params.id)
    }, function (err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get video", 400);
        } else {
            res.status(200).json(doc);
        }
    });
});

// CONTACTS API ROUTES BELOW

//***** contacts *****/

app.get("/api/contacts", function (req, res) {
    db.collection(CONTACTS_COLLECTION).find({}).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get contacts.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.get("/api/contacts/:id", function (req, res) {
    db.collection(CONTACTS_COLLECTION).findOne({
        _id: new ObjectID(req.params.id)
    }, function (err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get contact", 400);
        } else {
            res.status(200).json(doc);
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

app.put("/api/contacts/:id", function (req, res) {
    var updateDoc = req.body;
    delete updateDoc._id;

    db.collection(CONTACTS_COLLECTION).updateOne({
        _id: new ObjectID(req.params.id)
    }, {
        $set: updateDoc
    }, function (err, doc) {
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




app.all('*', function (req, res) {
    res.status(400).json({
        "Error": "Bad request"
    });
    // throw new Error({"Error":"Bad request"})
})