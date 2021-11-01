const express = require('express');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
var admin = require("firebase-admin");

const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

//Firebase admin initialization
var serviceAccount = require('./react-ema-john-ecommerce-firebase-adminsdk-p62ma-edd2e5792d.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// Middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sjr78.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodeUser = await admin.auth().verifyIdToken(idToken);
            req.decodeUserEmail = decodeUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('emaJohnEcommerce');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders');

        // GET API (Get all products)
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const count = await cursor.count();
            let products;
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }
            res.send({
                count,
                products
            });
        })

        // POST API to get data by keys
        app.post('/products/byKeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } };
            const result = await productCollection.find(query).toArray();
            res.json(result);
        });

        //Get All Orders
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodeUserEmail === email) {
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.json(orders);
            }
            else{
                res.status(401).json({message: 'Unauthorized User'})
            }
        })

        // POST API to add order
        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order);
            res.json(result);
        });
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Ema John server is running');
});

app.listen(port, () => {
    console.log('Server running at port,', port);
})