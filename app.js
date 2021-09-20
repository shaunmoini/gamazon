const express = require('express');
const path = require('path');
const validator = require('express-validator');

const app = express();
const port = 3000;

var products = require('./data/products.json');

app.use(express.json());
app.use(express.text());

app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'client/index.html'));
});

// get all products
app.get('/products', (req, res) => {
  res.status(200).json(products);
});

// get product by id
app.get('/products/:id', (req, res) => {
  res.status(200).json(products.filter((product) => {
    return product.id == (req.params.id);
  }));
});

// get product reviews
app.get('/products/:id/reviews', (req, res) => {
  res.status(200).json(
    {
      'id': products[req.params.id].id,
      'reviews': products[req.params.id].reviews ? products[req.params.id].reviews : []
    }
  );
});

// filter products by name / stock > 0
app.get('search', (req, res) => {
  console.log(req.params)
  console.log(req.query)
  var result = products;

  if (req.query.hasOwnProperty('name')) {
    result = result.filter((product) => {
      return product.name.toLowerCase().includes(req.query.name);
    })
  }
  if (req.query.hasOwnProperty('instock')) {
    result = result.filter((product) => {
      return product.stock > 0;
    })
  }

  res.status(200).json(result);
});

// add new product
app.post(
  '/products',
  validator.body('name').isString(),
  validator.body('price').isNumeric(),
  validator.body('dimensions').isObject(),
  validator.body('stock').isNumeric(),
  (req, res) => {
    const errors = validator.validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json(errors.array());
    }

    var product = {
      name: req.body.name,
      price: req.body.price,
      dimensions: req.body.dimensions,
      stock: req.body.stock,
      id: products.length
    }

    products.push(product);
    res.status(201).send('product added successfully');
  }
);

// add product review
app.post(
  '/products/:id/reviews',
  validator.body('rating').isInt({min: 0, max: 10}),
  (req, res) => {
    const errors = validator.validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json(errors.array());
    }
    
    if(products[req.params.id].hasOwnProperty('reviews')) {
      products[req.params.id].reviews.push(req.body.rating);
    } else {
      products[req.params.id].reviews = [];
      products[req.params.id].reviews.push(req.body.rating);
    }

    res.status(201).send('rating added successfully');
  }
);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});