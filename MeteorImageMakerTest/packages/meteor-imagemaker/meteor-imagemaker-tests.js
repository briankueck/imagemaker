// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

// Import and rename a variable exported by meteor-imagemaker.js.
import { name as packageName } from "meteor/meteor-imagemaker";

// Write your tests here!
// Here is an example.
Tinytest.add('meteor-imagemaker - example', function (test) {
  test.equal(packageName, "meteor-imagemaker");
});
