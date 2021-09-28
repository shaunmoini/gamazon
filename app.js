const express = require('express');
const validator = require('express-validator');
const mongoClient = require('mongodb').MongoClient; 

const app = express();
const port = 3000;
const db_url = 'mongodb://localhost:27017/';

app.use(express.json());
app.set('view engine', 'pug');

//default path 
app.get('/', (req, res) => {
  mongoClient.connect(db_url, function(err, client) {
    if (err) throw err;
    var dbo = client.db('gamazon');
    
    dbo.collection('products').find({}).toArray(function(err, result) {
      if (err) throw err;
      res.render('app', {products: result});
      client.close();
    });
  }); 
});

// get all products
app.get('/products', (req, res) => {
  mongoClient.connect(db_url, function(err, client) {
    if (err) throw err;
    var dbo = client.db('gamazon');

    dbo.collection('products').find({}).toArray(function(err, result) {
      if (err) throw err;
      res.status(200).json(result);
      client.close();
    });
  });
});

// get product by id
app.get('/products/:id', (req, res) => {
  mongoClient.connect(db_url, function(err, client) {
    if (err) throw err;
    var dbo = client.db('gamazon');

    dbo.collection('products').findOne({id: parseInt(req.params.id)}, function(err, result) {
      if (err) throw err;
      var product = result;

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

      client.close();
    });
  });
});

// get product reviews by id 
app.get('/products/:id/reviews', (req, res) => {
  mongoClient.connect(db_url, function(err, client) {
    if (err) throw err;
    var dbo = client.db('gamazon');

    dbo.collection('products').findOne({id: parseInt(req.params.id)}, function(err, result) {
      if (err) throw err;
      var product = result;

      if(req.headers.accept && req.headers.accept.includes('text/html')) {
        res.render('reviews', {
          id: product.id,
          reviews: product.reviews ? product.reviews : 'No reviews.'
        })
      } else {
        res.status(200).json({id: product.id, reviews: product.reviews ? product.reviews : []});
      }

      client.close();
    });
  });
});

// filter products by name / stock > 0
app.get('/search', (req, res) => {
  mongoClient.connect(db_url, function(err, client) {
    if (err) throw err;
    var dbo = client.db('gamazon');

    dbo.collection('products').find({}).toArray(function(err, result) {
      if (err) throw err;

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

      client.close();
    });
  });
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

    mongoClient.connect(db_url, function(err, client) {
      if (err) throw err;
      var dbo = client.db('gamazon');

      dbo.collection('products').countDocuments().then((count) => {
        var product = {
          name: req.body.name,
          price: req.body.price,
          dimensions: req.body.dimensions,
          stock: req.body.stock,
          id: count
        }

        dbo.collection('products').insertOne(product, function(err, result) {
          if (err) throw err;
          console.log(result);
          res.status(201).send('product added successfully');
          client.close();
        });
      })
    }); 
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

    mongoClient.connect(db_url, function(err, client) {
      if (err) throw err;
      var dbo = client.db('gamazon');

      dbo.collection('products').findOne({id: parseInt(req.params.id)}, function(err, result) {
        if (err) throw err;
        var product = result;
        var newValue;

        if(product.reviews) {
          product.reviews.push(req.body.rating);
          newValue = {$set: {reviews: product.reviews}};
        } else {
          let reviews = [req.body.rating];
          newValue = {$set: {reviews: reviews}};
        }
  
        dbo.collection('products').updateOne({id: parseInt(req.params.id)}, newValue, function(err, result) {
          if (err) throw err;
          console.log(result);
          res.status(201).send('rating added successfully');
          client.close();
        });
      })
    }); 
  }
);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});