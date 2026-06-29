const axios = require('axios');
axios.get('https://www.pelisplus.lat/search?s=breaking').then(r => {
  console.log(r.data.substring(0, 500));
}).catch(e => console.log(e.message));
