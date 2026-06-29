const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://www.pelisplus.lat/search?s=breaking').then(r => {
  const $ = cheerio.load(r.data);
  const items = $('.items-peliculas .item-pelicula');
  console.log('Found items:', items.length);
  if (items.length > 0) {
    console.log('First title:', items.first().find('.item-detail p').text().trim());
  }
}).catch(e => console.log(e.message));
