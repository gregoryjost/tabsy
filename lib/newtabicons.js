/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, unused:true, curly:true, browser:true, white:true,
  moz:true, esnext:false, indent:2, maxerr:50, devel:true, node:true, boss:true,
  globalstrict:true, nomen:false, newcap:false */

"use strict";

var clipboard = require('sdk/clipboard');
var cm = require('sdk/context-menu');
var Etherpad = require('./etherpad').Etherpad;
var etherpad = new Etherpad('thumbnail-gifs');
var prefs = require('sdk/simple-prefs');
var self = require('sdk/self');
var tabs = require('sdk/tabs');
var timeout = require('sdk/timers').setTimeout;

var running = false;
var menuitem;  // Context menu item to copy thumbnail URL.

etherpad.setDefaults([
'http://37.media.tumblr.com/tumblr_ma53ul4GZY1rgpzseo1_1280.gif',
'http://24.media.tumblr.com/8590439194dd2615c85c83a4a46be726/tumblr_muesn3BS4M1rgpzseo1_1280.gif',
'http://24.media.tumblr.com/a2e8f2c90f10e463ae2c86df08e9f586/tumblr_mufd5dTduO1rgpzseo1_r1_1280.gif',
'http://37.media.tumblr.com/4c8fef750fd05c2cf726132f74d5a82a/tumblr_muesa7kLsY1rgpzseo1_1280.gif',
'http://37.media.tumblr.com/tumblr_ma53ul4GZY1rgpzseo1_1280.gif',
'http://24.media.tumblr.com/36dfa100427e94d51d96d3382e023e94/tumblr_n48pluPMFV1rgpzseo1_1280.gif',
'http://37.media.tumblr.com/5bfe3651bc19ff8620831a41bd60c1a0/tumblr_n2sr5yQgR81rgpzseo1_r2_1280.gif',
'http://31.media.tumblr.com/d27d01901530cd2d791f9d1b16d375b6/tumblr_n4rp0cHVGG1tx30c0o1_1280.gif',
'http://24.media.tumblr.com/42e2d745bed420c3ea1cac7e43aeedff/tumblr_n4roywPwA01tx30c0o1_1280.gif',
'http://24.media.tumblr.com/d8848757a01acfbb106b069e31243088/tumblr_n2eccv6Dev1rgpzseo1_r1_1280.gif',
]);

function addContentScript(tab, doneTrying) {
  if (tab.url === 'about:blank' && !doneTrying) {
    // Wait a second and see if it's better then.
    timeout(function () {
      addContentScript(tab, true);
    }, 1000);
  }
  if (tab.url === 'about:newtab') {
    let thumbs = etherpad.getRandomItems(9);
    tab.attach({
      contentScriptFile: self.data.url("newtabicons-content.js"),
      contentScriptOptions: { "thumbs" : thumbs,
                              "showAlways" : prefs.prefs.newtabicons2 === 2 }
    });
  }
}

var tabOpen = function (tab) {
  if (!tab) {
    tab = tabs.activeTab;
  }
  addContentScript(tab);
};

var run = function () {
  if (running) {
    return;
  }
  running = true;

  etherpad.loadPlaceholders();
  tabs.on('open', tabOpen);
  tabOpen();

  menuitem = cm.Item({
    label: 'Copy Thumbnail URL',
    context: [
      cm.URLContext('about:newtab'),
      cm.SelectorContext('.newtab-thumbnail')
    ],
    contentScript: 'self.on("click", function(node, data) {' +
                   '  self.postMessage(node.getAttribute("data-thumburl"));' +
                   '});',
    onMessage: function (thumbUrl) {
      clipboard.set(thumbUrl);
    }
  });
  menuitem.image = null;
};

var stop = function () {
  if (!running) {
    return;
  }
  running = false;

  tabs.removeListener('open', tabOpen);

  if (menuitem) {
    menuitem.destroy();
    menuitem = null;
  }
};

var listener = function () {
  if (prefs.prefs.newtabicons2) {
    run();
  } else {
    stop();
  }
};

exports.load = function () {
  prefs.on('newtabicons2', listener);
  listener('newtabicons2');
};

exports.unload = function () {
  prefs.removeListener('newtabicons2', listener);
};
