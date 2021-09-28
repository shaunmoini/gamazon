const express = require('express');
const validator = require('express-validator');
const mongoClient = require('mongodb').MongoClient; 

const app = express();
const port = 3000;
const db_url = 'mongodb://localhost:27017/';

app.use(express.json());
app.set('view engine', 'pug');

// get html for for adding new product
app.get('/addproduct', (req, res) => {
  res.render('addProduct');
})

// get html for for adding new review
app.get('/addreview', (req, res) => {
  res.render('addReview');
})

// get html for for placing order
app.get('/placeorder', (req, res) => {
  res.render('placeOrder');
})

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

      if(result != null) {
        if(req.headers.accept && req.headers.accept.includes('text/html')) {
          res.render('product', {
            name: result.name,
            price: result.price,
            dimensions: 'dimensions',
            x: result.dimensions.x,
            y: result.dimensions.y,
            z: result.dimensions.z,
            stock: result.stock,
            id: result.id,
            reviews: result.reviews ? result.reviews : 'No reviews.'
          })
        } else {
          res.status(200).json(result);
        }
      } else {
        res.status(400).json('Invalid product id');
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

      if(result != null) {
        if(req.headers.accept && req.headers.accept.includes('text/html')) {
          res.render('reviews', {
            id: result.id,
            reviews: result.reviews ? result.reviews : 'No reviews.'
          })
        } else {
          res.status(200).json({id: result.id, reviews: result.reviews ? result.reviews : []});
        }
      } else {
        res.status(400).json('Invalid product id');
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

app.get('/orders', (req, res) => {
  mongoClient.connect(db_url, function(err, client) {
    if (err) throw err;
    var dbo = client.db('gamazon');

    dbo.collection('orders').find({}).toArray(function(err, result) {
      if (err) throw err;
      res.status(200).json(result);
      client.close();
    });
  });
})

app.get('/orders/:id', (req, res) => {
  mongoClient.connect(db_url, function(err, client) {
    if (err) throw err;
    var dbo = client.db('gamazon');

    dbo.collection('orders').findOne({id: parseInt(req.params.id)}, function(err, result) {
      if (err) throw err;

      if(result != null) {
        res.status(200).json(result);
      } else {
        res.status(400).json('Invalid order id');
      }

      client.close();
    });
  });
})

// add new product
app.post(
  '/products',
  validator.body('name').isString(),
  validator.body('price').isNumeric(),
  validator.body('dimensions').isObject(),
  validator.body('stock').isInt(),
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

app.post(
  '/orders',
  validator.body('customerName').notEmpty().isString(),
  validator.body('order.*.product_id').notEmpty().isInt(),
  validator.body('order.*.quantity').notEmpty().isInt(),
  (req, res) => {
    const errors = validator.validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json(errors.array());
    }

    mongoClient.connect(db_url, function(err, client) {
      if (err) throw err;
      var dbo = client.db('gamazon');
  
      dbo.collection('products').find({}).toArray(function(err, result) {
        if (err) throw err;
        var reqValid = true;
        var invalidResStr = [];

        for(x of req.body.order) {
          var item = result.find((product) => {
            return x.product_id == product.id;
          })
          
          if(item){
            if(x.quantity <= item.stock) {
              continue;
            } else {
              reqValid = false;
              invalidResStr.push(`product id ${x.product_id}: not enough stock`)
            }
          } else {
            reqValid = false;
            invalidResStr.push(`invalid product id: ${x.product_id}`)
          }
        }

        if(reqValid) {
          for(product of req.body.order) {
            product.product_link = `http://localhost:3000/products/${product.product_id}`;
          }
          dbo.collection('orders').countDocuments().then((count) => {
            var order = {
              id: count,
              customerName: req.body.customerName,
              order: req.body.order,
              link: `http://localhost:3000/orders/${count}`
            }
    
            dbo.collection('orders').insertOne(order, function(err, result) {
              if (err) throw err;
              console.log(result);
              updateStock(req.body.order);
              res.status(201).json('order created successfully');
              client.close();
            });
          })
        } else {
          res.status(409).json(invalidResStr);
          client.close();
        }
      });
    });
  }
)

function updateStock(order) {
  mongoClient.connect(db_url, function(err, client) {
    if (err) throw err;
    var dbo = client.db('gamazon');

    for(let i=0; i < order.length; i++) {
      dbo.collection('products').findOne({id: parseInt(order[i].product_id)}, function(err, result) {
        if (err) throw err;
        var newValue = newValue = {$set: {stock: (result.stock - order[i].quantity)}};
  
        dbo.collection('products').updateOne({id: parseInt(order[i].product_id)}, newValue, function(err, result) {
          if (err) throw err;
          console.log(result);
          if(i == order.length-1) {
            client.close();
          }
        });
      })
    }
  })
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});