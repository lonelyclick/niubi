const data = require('./data/xingganmote/1.json');

const tags = [];

data.forEach(item => {
  // console.log(item.tags);

  item.tags.forEach(tag => {
    if (tags.indexOf(tag) === -1) {
      tags.push(tag);
    }
  })
});

console.log(tags);
