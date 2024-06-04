import express from "express"
import mongoose from 'mongoose';
import bodyParser from 'body-parser';

const app = express()

app.use(bodyParser.json());

mongoose.connect("mongodb://localhost:27017/ShoeStore", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to the database');
});

const ProductSchema = new mongoose.Schema({
    availableQuantity: Number,
    catchPhrase: String,
    category: [String],
    discountedPrice: Number,
    id: String,
    imgAlt: String,
    imgLink: String,
    name: String,
    price: Number,
    productUrl: String,
    productSize: String,
    quantity: Number,
    type: String,
    variations: String,
}, {collection : 'Products'})

const ProductModel = mongoose.model("Products", ProductSchema)

app.get("/getProducts", async (req, res) => {
    try {
        const data = await ProductModel.find()
        res.json(data)
    } catch (err) {
        res.status(500).json({message: err.message})
    }
})

const orderSchema = new mongoose.Schema({
    payment: Object,
    products: Object,
    shippingAdress: Object,
});

const Order = mongoose.model('Order', orderSchema);

app.post('/api/orders', async (req, res) => {
    try {
      const order = new Order(req.body);
      await order.save();
      res.status(201).send(order);
    } catch (error) {
      res.status(400).send(error);
    }
});

app.listen(5000, () => console.log("Server is running"))