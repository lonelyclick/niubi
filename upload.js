const cheerio = require('cheerio');
const childProcess = require('child_process');
const path = require('path');
const crypto = require('crypto');
// 13
// 62
// 212

const data1 = require('./data/xingganmote/201.json');
const data2 = require('./data/xingganmote/202.json');
const data3 = require('./data/xingganmote/203.json');
const data4 = require('./data/xingganmote/204.json');
const data5 = require('./data/xingganmote/205.json');
const data6 = require('./data/xingganmote/206.json');
const data7 = require('./data/xingganmote/207.json');
const data8 = require('./data/xingganmote/208.json');
const data9 = require('./data/xingganmote/209.json');
const data10 = require('./data/xingganmote/210.json');
const data11 = require('./data/xingganmote/211.json');

const bucket = 'guang-stroage';

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

function getHash(str) {
  return crypto.createHmac('md5', 'this is guang').update(str).digest('hex');
}

uploadImages(data1);
uploadImages(data2);
uploadImages(data3);
uploadImages(data4);
uploadImages(data5);
uploadImages(data6);
uploadImages(data7);
uploadImages(data8);
uploadImages(data9);
uploadImages(data10);
uploadImages(data11);
