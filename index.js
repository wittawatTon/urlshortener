require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const bodyParser = require('body-parser');
const Url = require('./models/Url');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});



// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected...');
/*  
  // Drop the database
  mongoose.connection.db.dropDatabase((err, result) => {
    if (err) {
      console.error('Error dropping database:', err);
    } else {
      console.log('Database dropped successfully');
    }
  
    // Close the connection
    mongoose.connection.close((err) => {
      if (err) {
        console.error('Error closing Mongoose connection:', err);
      } else {
        console.log('Mongoose connection closed.');
      }
    });
  });*/
})
.catch(err => console.error('Error connecting to MongoDB:', err));

// Shorten URL

const findMaxShortUrl = async () => {
  try {
    const result = await Url.aggregate([
      {
        $group: {
          _id: null,
          maxShortUrl: { $max: "$short_url" }
        }
      }
    ]);

    const maxShortUrl = result.length > 0 ? result[0].maxShortUrl : 0;
    console.log('Maximum short_url:', maxShortUrl);
    return maxShortUrl;
  } catch (error) {
    console.error('Error finding maximum short_url:', error);
  }
};

app.post('/api/shorturl', async (req, res) => {
  const maxShort=await findMaxShortUrl();
  const input = req.body;
  console.log(req.body);
  console.log(input.url);
  if (!validUrl.isWebUri(input.url)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    // Check if the URL already exists
    let url = await Url.findOne({original_url:input.url});
    if (url) {
      return res.json({original_url:url.original_url, short_url:url.short_url});
    }

    // Create a new URL entry
    url = new Url({ original_url:input.url, short_url:maxShort+1});
    console.log("save:" + url.original_url + ":" + url.short_url);
    await url.save();
    console.log("saved:" + url.original_url + ":" + url.short_url);
    res.json({ original_url:url.original_url, short_url:url.short_url});
  } catch (err) {
    console.log(err);
    res.status(500).json('Server error');
  }
});

// Redirect to the original URL
app.get('/api/shorturl/:short_url', async (req, res) => {
  try {
    const url = await Url.findOne({ short_url: req.params.short_url });
    if (url) {
      return res.redirect(url.original_url);
    } else {
      return res.status(404).json({ error: 'No URL found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json('Server error');
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
