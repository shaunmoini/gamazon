const express = require('express');
const validator = require('express-validator');

const app = express();
const port = 3000;

var products = require('./data/products.json');

app.use(express.json());
app.set('view engine', 'pug');

//default path 
app.get('/', (req, res) => {
  res.render('app', {products: products});
});

// get all products
app.get('/products', (req, res) => {
  res.status(200).json(products);
});

// get product by id
app.get('/products/:id', (req, res) => {
  var product = products.find((product) => {
    return product.id == (req.params.id);
  })

  if(req.headers.accept && req.headers.accept.includes('text/html')) {
    res.render('product', {
      name: product.name,
      price: product.price,
      dimensions: 'dimensions',
      x: product.dimensions.x,
      y: product.dimensions.y,
      z: product.dimensions.z,
      stock: product.stock,
      id: product.id,
      reviews: product.reviews ? product.reviews : 'No reviews.'
    })
  } else {
    res.status(200).json(product);
  }
});

// get product reviews
app.get('/products/:id/reviews', (req, res) => {
  var productReviews = {
    'id': products[req.params.id].id,
    'reviews': products[req.params.id].reviews ? products[req.params.id].reviews : []
  }

  if(req.headers.accept && req.headers.accept.includes('text/html')) {
    res.render('reviews', {
      id: productReviews.id,
      reviews: productReviews.reviews.length != 0? productReviews.reviews : 'No reviews.'
    })
  } else {
    res.status(200).json(productReviews);
  }
});

// filter products by name / stock > 0
app.get('/search', (req, res) => {
  var result = products;

  if (req.query.hasOwnProperty('name')) {
    result = result.filter((product) => {
      return product.name.toLowerCase().includes(req.query.name);
    })
  }
  if (req.query.hasOwnProperty('instock') && req.query.instock == 'true') {
    result = result.filter((product) => {
      return product.stock > 0;
    })
  }

  if(req.headers.accept && req.headers.accept.includes('text/html')) {
    res.render('app', {products: result});
  } else { 
    res.status(200).json(result);
  }
});

// get html for for adding new product
app.get('/addproduct', (req, res) => {
  res.render('addProduct');
})

// get html for for adding new review
app.get('/addreview', (req, res) => {
  res.render('addReview');
})

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