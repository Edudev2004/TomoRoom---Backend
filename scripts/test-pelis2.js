const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://www.pelisplus.lat/search?s=breaking').then(r => {
  const $ = cheerio.load(r.data);
  const items = $('.items-peliculas .item-pelicula');
  console.log('Found items .items-peliculas:', items.length);

  const alternative = $('.Posters a');
  console.log('Found items .Posters a:', alternative.length);
  
  if (alternative.length > 0) {
    console.log('First title alternative:', alternative.first().text().trim());
  }
}).catch(e => console.log(e.message));
