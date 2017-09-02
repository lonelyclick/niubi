const util = require('util');
const fs = require('fs');
const axios = require('axios');
const writeFile = util.promisify(fs.writeFile);
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const childProcess = require('child_process');
const crypto = require('crypto');
const path = require('path');
// const data = require('./data.json');

const domain = 'https://www.4493.com';
const bucket = 'guang-stroage';

function requestPage(type, start, limit) {
  console.log('get page: ', start, limit);
  axios.get(`${domain}/${type}/index-${start}.htm`, { responseType: 'arraybuffer' }).then(res => {
    let items = getItemsByPageHtml(res.data);

    // finish
    if (items === false || start === limit) {
      // writeFile(`${type}-${currentIndex}.json`, JSON.stringify(result, null, 2));
      return;
    }

    // items = items.slice(0, 1);

    appendImagesAndTagsToItems(items).then(result => {
      // console.log(result, '######');

      // uploadImages(result, (finalItems) => {
      //   writeFile('data.json', JSON.stringify(finalItems, null, 2));
      // });

      writeFile(`./data/${type}/${start}.json`, JSON.stringify(result, null, 2)).then(() => {
        requestPage(type, start + 1, limit);
      });

      // uploadImages(result).then(finalItems => {
      //   writeFile('data.json', JSON.stringify(finalItems, null, 2));
      // });
    });
  });
}

function appendImagesAndTagsToItems(items, type, currentIndex = 0, result = []) {
  console.log('get item images: ', currentIndex, items.length);
  let item = items[currentIndex];
  if (!item) return Promise.resolve(result);
  return requestItemById(item.id, type).then(itemAndTag => {
    item = Object.assign(item, itemAndTag);
    // console.log(item);
    result.push(item);

    return appendImagesAndTagsToItems(items, type, currentIndex + 1, result);
  });
}

function requestItemById(id, type, result = { tags: [], images: [] }, currentIndex = 1) {
  return axios.get(`${domain}/${type}/${id}/${currentIndex}.htm`, { responseType: 'arraybuffer' }).then(res => {
    htmlData = iconv.decode(res.data, 'gb2312');
    const $ = cheerio.load(htmlData, { decodeEntities: false });
    const imgEl = $('.picmainer .picsbox img');
    // const aCtEl = $('.picmainer .page a');
    const tagEl = $('.picbottomline > .pleft a');
    // console.log(tagEl);

    if (imgEl.length > 0) {
      const imageUrl = imgEl.attr('src');
      console.log('catched: ', imageUrl, currentIndex);
      result.images.push(imageUrl);
      if (currentIndex === 1) {
        const tags = [];
        tagEl.each((index, ele) => {
          tags.push(ele.children[0].data);
        });
        result.tags = tags;
      }
      return requestItemById(id, type, result, currentIndex + 1);
    } else {
      return Promise.resolve(result);
    }
  });
}

function getItemsByPageHtml(htmlData) {
  const $ = cheerio.load(iconv.decode(htmlData, 'gb2312'), { decodeEntities: false });
  const finalItems = [];

  const liEls = $('.piclist > ul').children();

  console.log(liEls.length, 'length.....');

  if (liEls.length === 0) return false;

  liEls.each((index, liEl) => {
    const linkEl = $('a', liEl);
    const href = linkEl.attr('href');
    const b1El = $('.b1', liEl);
    const linkImage = $('img', linkEl);
    const linkSpan = $('span', linkEl);
    const cover = linkImage.attr('src');
    const title = linkSpan.html();
    const datetime = b1El.html();
    const id = /^\/xingganmote\/(\d+)\/1.htm$/.exec(href)[1];
    const item = {
      id,
      cover,
      title,
      datetime,
    };

    finalItems.push(item);
  });

  return finalItems;
}

function appendHashToItems(items) {
  return items.map(item => {
    const hash = crypto.createHmac('md5', 'this is guang')
      .update(item.id)
      .digest('hex');
    return { ...item, hash };
  });
}

function getHash(str) {
  return crypto.createHmac('md5', 'this is guang').update(str).digest('hex');
}

function uploadImageToQN(imageUrl) {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      reject();
      return;
    }
    const uploadedUrl = `${getHash(imageUrl)}${path.extname(imageUrl)}`;

    // check is exist
    childProcess.exec(`qshell stat ${bucket} ${uploadedUrl}`, (err, stdout, stderr) => {
      if (err || stderr) { // not exist
        childProcess.exec(`qshell fetch ${imageUrl} ${bucket} ${uploadedUrl}`, (err, stdout, stderr) => {
          if (err || stderr) {
            reject(err || stderr);
          } else {
            console.log(`uploaded completed(new): ${uploadedUrl}`);
            console.log(stdout);
            resolve(uploadedUrl);
          }
        });
      } else { // already exist
        console.log(`uploaded completed(old): ${uploadedUrl}`);
        console.log(stdout);
        resolve(uploadedUrl);
      }
    });
  });
}

function uploadImages(items, currentIndex = 0) {
  console.log('start upload: ', currentIndex);
  const item = items[currentIndex];
  if (!item) return Promise.resolve(items);
  return Promise.all([item.cover, ...item.images].map(uploadImageToQN)).then((uploadedUrls) => {
    console.log('Promise.all completed', uploadedUrls);
    item.cover_cdn = uploadedUrls[0];
    item.images_cdn = uploadedUrls.slice(1);
    return uploadImages(items, currentIndex + 1);
  });
}

// uploadImages(data).then(items => {
//   console.log(items);
// });

// requestPage('xingganmote', 1, 100);

// console.log(process.argv)

const argvs = process.argv;

requestPage(argvs[2], parseInt(argvs[3]), parseInt(argvs[4]));
