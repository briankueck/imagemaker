# Image Maker Demo #
#### By Brian Kueck ####

# Usage: #
In /meteor/client/main.js add:

import { imageMakerClient } from 'meteor/meteor-imagemaker';

In /meteor/server/main.js add:

import { imageMakerServer } from 'meteor/meteor-imagemaker';

# How the server-side process works: #

1. Meteor will automatically create these folders:
  /public
  /public/.#static
  /uploads
2. The 4 client images will be uploaded into the /uploads folder.
3. (Optional) If the resize option is selected, the images will be resized into 120x120 square thumbnail images.
4. The files will be combined together & the new photostrip.png image will be dropped into the /public/.#static folder. This ensures that Meteor won't auto-reload the client, when that dynamic file is created.
5. The client will load an iframe src URL with /static. The server will use Iron Router to read the photostrip.png file & serve it up via a stream buffer.
6. The client will load a hyperlink anchor tag href with /download. The server will use Iron Router to read the photostrip.png file & serve it up as an attachment, through the same stream buffer which the iframed /static method uses.