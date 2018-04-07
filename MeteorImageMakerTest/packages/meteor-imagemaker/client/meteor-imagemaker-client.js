export const imageMakerClient = 'meteor-imagemaker';

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import './meteor-imagemaker.html';

// Meteor wraps these in a closure. These are locals & not globals.
let counter = 0;
let images = [];

/**
 * Dropzone isn't a Meteor / Atmosphere package, nor an NPM module.
 * We have to use jQuery to load it, as it's pure/native/vanilla JavaScript.
 */
$(function() {
  
  let maxFiles = 4;
  let dropzone = new Dropzone('.dropzone', { url: "/upload"});

  // Complete event occurs 1-4 times. It's per image uploaded, not per drop event.
  dropzone.on("complete", function(file) {
    if (counter <= maxFiles) {
      var reader = new FileReader();
      reader.onload = function(fileUploadEvent) {
        const image = {
          "id": counter,
          "fileName": file.name,
          "fileData": reader.result
        };

        // Zero-based
        images[counter] = image;

        // Now increment
        counter++;

        // One-based
        if (counter === maxFiles) {
          $('.uploading-msg').removeClass('hidden');
          $('.ajax-loader').removeClass('hidden');

          // Uploads the file to the server
          Meteor.call('file-upload', images, (error, response) => {
            if (response && response.filename) {
              /**
               * The timeout is to fix a problem with threading promises into the main.js file, for this demo.
               * It's a demo. Large file uploads need to finish processing, before the iframe src can be changed.
               * This delay would be removed, if we were baking this for a production run.
               */
              setTimeout(() => {
                // Dynamically inject the file names.
                $('#iframe').attr('src', '/static');
                $('#downloadLink').attr('src', '/download');

                // Show divs.
                $('.dropzone').addClass('success');
                $('.ajax-loader').addClass('hidden');
                $('.photostrip-container').removeClass('hidden');
              }, 1500);
            }
          });
        }
        $('.counter').html(counter);
      };
      reader.readAsBinaryString(file);
    }
  });
});
