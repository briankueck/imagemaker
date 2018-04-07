export const imageMakerServer = 'meteor-imagemaker';

import { Meteor } from 'meteor/meteor';

const combineTiles = require('combine-tiles');
const gm = require('gm');
const fs = require('fs');
const jimp = require('jimp');

/**
 * Config section. Try toggling these & seeing what happens, when they are false! :)
 * If you use different sized files, your final photostrip might contain transparent areas in it.
 */
const config = {
  useThumbnailSizes: false, // Removes dead-space from between images, which have different sizes.
  useUnlink: true // Deletes temp files, while leaving the photostrip.png file on the server.
};

const folders = {
  public: 'public',
  static: '.#static',
  uploads: 'uploads'
};

// These aren't globals, as Meteor wraps everything in a closure. They're locals! :)
const paths = {
  file: null,
  public: null,
  static: null,
  upload: null
};

const photostripFileName = 'photostrip.png';

Meteor.startup(() => {
  createPublicFolder();
  createUploadsFolder();
});

// Internal Method(s):

function cleanName(name) {
  return name.replace(/ /g,'_');
}

function cleanPath(path1, path2) {
  let path = path1 + '/' + cleanName(path2);
  path = flipSlashes(path);
  path = path.replace(/\/\//g,'/');
  return path;
}

function createFolder(folderName, msgSuccess) {
  let rootPath = getRootPath();
  let path = cleanPath(rootPath, '/' + folderName);
  fs.access(path, fs.constants.F_OK, error => {
    if (error) fs.mkdir(path, 0o755, () => {});
  });
  return path;
}

function createPublicFolder() {
  paths.public = createFolder(folders.public);
  paths.static = createFolder(folders.public + '/' + folders.static);
}

function createSpriteMap(files) {
  /**
   * These heights & widths cut down on the amount of white-space, which would need to surround
   * each image... because we're measuring the file sizes after they are written to the disk.
   * The alternative would be to set a fixed height & width, which would space each image apart.
   * The upload process doesn't have any height nor width data for dragged & dropped files.
   */

  // const size = 300; <- We don't want to do this if we aren't resizing images, which is what the NPM docs suggest!
  let maxWidth = null;
  let maxHeight = null;

  if (config.useThumbnailSizes) {
    /**
     * Resize images. According to the JIMP documentation, this will only work on "PNG, JPEG or BMP". It won't work on GIF.
     * See: https://www.npmjs.com/package/jimp
     */
    maxWidth = 120;
    maxHeight = 120;
  } else {
    // Don't resize images, but calculate their dimensions.
    const maxWidth1 = findMax(files[0].width, files[1].width);
    const maxWidth2 = findMax(files[2].width, files[3].width);
    maxWidth = findMax(maxWidth1, maxWidth2);

    const maxHeight1 = findMax(files[0].height, files[1].height);
    const maxHeight2 = findMax(files[2].height, files[3].height);
    maxHeight = findMax(maxHeight1, maxHeight2);
  }

  const dest = paths.static + '/' + 'photostrip.png';

  /**
   * The NPM GraphicsMagick middleware software has problems. 
   * 1. It doesn't accept file options. It only accepts the file path.
   * 2. It runs asynchronously. There aren't any options to pass in, which could control the order.
   * 3. It sometimes fails to read images & kicks out a false "Improper Image Header" message.
   * 4. This would cause us to combine 2x, then write fileA to disk, combine 2x more, 
   *    then write fileB to disk. Then combine fileA with fileB & write fileC to disk.
   * 5. It's 3rd party software, which must be installed separately. JIMP is a native JavaScript
   *    Image Manipulation Program. The only caveat with JIMP is that it doesn't read .GIF files.
   * As convenient as it sounds to use this, let's not use this here. However, this illustrates
   * how it should work. Yet it will scramble the order of the montage. We'll use gm / GraphicsMagick
   * later on for the resizing, as it's better at doing that on .GIF images than JIMP is.
   *x/
  try {
    gm(paths.upload + '/' + files[0].name)
      .montage(paths.upload + '/' + files[1].name)
      .montage(paths.upload + '/' + files[2].name)
      .montage(paths.upload + '/' + files[3].name)
      .write(paths.file, err => {
        unlinkFiles(files);
      });
  }
  catch (e) {
    // Try it again! Sometimes it fails with "Improper Image Header" messages, which are wrong.
    generatePhotostrip(files);
  }
  */

  /**
   * Combine Tiles is better at combining images together. The order is maintained.
   * Documentation: https://www.npmjs.com/package/combine-tiles
   */
  const tiles = [
    {x: 0, y: 0, file: paths.upload + '/' + files[0].name},
    {x: 1, y: 0, file: paths.upload + '/' + files[1].name},
    {x: 2, y: 0, file: paths.upload + '/' + files[2].name},
    {x: 3, y: 0, file: paths.upload + '/' + files[3].name}
  ];
  combineTiles(tiles, maxWidth, maxHeight, dest, err => {
    unlinkFiles(files);
  });
}

function createUploadsFolder() {
  paths.upload = createFolder(folders.uploads);
}

function findMax(a, b) {
  return (a > b) ? a : b;
}

function flipSlashes(path) {
  return path.replace(/\\/g,'/');
}

function getRootPath() {
  const cwd = process.cwd();
  const rootPath = cwd.substr(0, cwd.indexOf('.meteor') - 1);
  return rootPath;
}

function setOutputPath () {
  paths.file = paths.static + '/' + photostripFileName;
}

/**
 * Removes temp files, which declutters the file system.
 */
function unlinkFiles(files) {
  if (config.useUnlink) {
    for (let i = 0; i < files.length; i++) {
      fs.unlink(paths.upload + '/' + files[i].name, () => {});
    }
  }
}

// External API Method(s):

Meteor.methods({
  'file-upload': images => {
    let files = [];
    let filesLoaded = 0;

    for (let i = 0; i < images.length; i++) {
      let image = images[i];
      let fileName = image.fileName;
      const uploadFilePath = cleanPath(paths.upload, fileName);
      fs.writeFile(uploadFilePath, new Buffer(image.fileData, 'binary'), {
        encoding: 'binary',
        flag: 'w',
        mode: 755
      }, (error, response) => {
        // JIMP can get the natural height & width of the images, from the server.
        jimp.read(uploadFilePath, (error, oJimpImage) => {
            let imageHeight = null;
            let imageWidth = null;

            if (config.useThumbnailSizes) {
              imageHeight = 120;
              imageWidth = 120;

              // Because JIMP can't resize .GIF files, we'll use GraphicsMagick to accomplish that for us.
              /** oJimpImage.resize(120, 120)
                .write(uploadFilePath); */

              // GraphicsMagic can resize .GIF files. It's still useful to use here.
              gm(uploadFilePath)
                .resize(120, 120)
                .write(uploadFilePath, () => {});
            } else {
              // Finds the natural height & width of the images.
              imageHeight = oJimpImage.bitmap.height;
              imageWidth = oJimpImage.bitmap.width;
            }

            /**
             * This maintains the incoming sort order, with asynchronous file writes!
             * Don't use files.push(...) here!
             */
            files[image.id] = ({
              'name': cleanName(fileName),
              'height': imageHeight,
              'width': imageWidth
            });

            filesLoaded++;
            if (filesLoaded === images.length) {
              setOutputPath();
              createSpriteMap(files);
            }
          });
      });
    }

    /**
     * Because this is simply a demo, I don't want to thread promises up above.
     * I've tried, but due to the callback chain, the output is constantly being returned as undefined.
     * So we'll simply use a timeout in the client-side code, as this is simply a demo.
     */
    return {
      'filename': photostripFileName
    };
  }
});

/**
 * A user can hit the localhost:3000/static link first before loading images.
 * If that's what's occuring, then we'll set the output path. If the file isn't there,
 * then it will bypass the file read with fs.access & the if (error) return line.
 * If it's there from a previous upload, then we should load the previous dynamically
 * created image as a static image. We don't want to see any "Unexpected error." messages.
 */
let showPhotoStrip = function(that, useAttachment) {
  if (!paths.file) {
    setOutputPath();
  }

  fs.access(paths.file, fs.constants.F_OK, error => {
    if (error) return;
    let fileStats = fs.statSync(paths.file);

    let options = {
      'Content-Type': 'image/png',
      'Content-Length': fileStats.size
    };

    if (useAttachment) {
      options['Content-Disposition'] = 'attachment; filename=' + photostripFileName;
    }

    // Writes the content header.
    that.response.writeHead(200, options);

    // Reads the file & pipe the file contents to the response.
    fs.createReadStream(paths.file).pipe(that.response);
  });
};

/**
 * Apparently, Meteor still has a problem referencing 
 * this.response.writeHead from inside of fs.access.
 */

function loadFile() {
  let that = this;
  showPhotoStrip(that, false);
}

function downloadFile() {
  let that = this;
  showPhotoStrip(that, true);
}

// Server Routes:
Router.route('/static', loadFile, {where: 'server'});
Router.route('/download', downloadFile, {where: 'server'});