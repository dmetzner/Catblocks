#!/usr/bin/env node
/* eslint-env node */

/**
 * @author Andreas Karner <andreas.karner@student.tugraz.at>
 * @description generate crowdin message file based on msg/*.json files, please run first create_msg_json.js if needed
 *  
 * @changelog 2019-08-14: initial version
 *            2019-08-23: added some more comments, refactor code
 *            2019-09-06: changed logic to generate just one catblocks_msgs.js file
 *            2019-11-05: [MF] updated to new structure
 *            2020-04-09: [GS] added loadNewLocale() for lazy language loading
 *            2020-05-14: [MF] add filesLocation for i18n
 */

const fs = require('fs');
const path = require('path');

// please define config here
const SRC_DIR = path.join('src', 'js');
const MSG_DIR = path.join('i18n');
const JSON_DIR = path.join(MSG_DIR, 'json');
const MESSAGE_FILE = path.join(SRC_DIR, 'catblocks_msgs.js');
const DEFAULT_LANGUAGE = 'en';

const MESSAGE_HEADER = `// This file was automatically generated by ${path.basename(__filename)}
// Please do not modify.
/* eslint no-useless-escape: 0 */
import Blockly from "blockly";
import $ from "jquery";
`;

// generate main catblocks_msgs.js file
const message_fd = fs.openSync(MESSAGE_FILE, 'w');
fs.writeSync(message_fd, MESSAGE_HEADER);

// Blockly.CatblocksMsgs
const CATBLOCK_MSGS = `
Blockly.CatblocksMsgs = {};
Blockly.CatblocksMsgs.locales = {};

Blockly.CatblocksMsgs.currentLocale_ = '${DEFAULT_LANGUAGE}';

Blockly.CatblocksMsgs.hasLocale = function(locale) {
  return Object.keys(Blockly.CatblocksMsgs.locales).includes(locale);
};

Blockly.CatblocksMsgs.setLocale = function(locale, filesLocation = undefined) {
  if (Blockly.CatblocksMsgs.hasLocale(locale)) {
    if (Object.keys(Blockly.CatblocksMsgs.locales[locale]).length === 1) {
      return Blockly.CatblocksMsgs.loadNewLocale(locale, filesLocation).then(() => {
        Blockly.CatblocksMsgs.currentLocale_ = locale;
        Blockly.Msg = Object.assign({}, Blockly.Msg, Blockly.CatblocksMsgs.locales[locale]);
      });
    } else {
      Blockly.CatblocksMsgs.currentLocale_ = locale;
      Blockly.Msg = Object.assign({}, Blockly.Msg, Blockly.CatblocksMsgs.locales[locale]);
      return Promise.resolve();
    }
  } else {
    console.warn('Fallback to default language and ignoring unrecognized locale: ' + locale);
    return Blockly.CatblocksMsgs.setLocale(Blockly.CatblocksMsgs.currentLocale_);
  }
};

Blockly.CatblocksMsgs.reloadCurrentLocale = function() {
  return Blockly.CatblocksMsgs.setLocale(Blockly.CatblocksMsgs.currentLocale_);
};

Blockly.CatblocksMsgs.getCurrentLocale = function() {
  return Blockly.CatblocksMsgs.currentLocale_;
};

Blockly.CatblocksMsgs.getCurrentLocaleValues = function() {
  return Blockly.CatblocksMsgs.locales[Blockly.CatblocksMsgs.getCurrentLocale()];
};

Blockly.CatblocksMsgs.loadNewLocale = function(locale, filesLocation) {
  let json_object = [];
  let url = window.location.protocol + "//" + window.location.host + "/i18n/" + locale + ".json";

  if (filesLocation != null) {
    if (filesLocation.startsWith("http")) {
      url = filesLocation.replace(/\\/$/, "");
      url += "/" + locale + ".json";

    } else {
      url = filesLocation.replace(/\\/$/, "") + "/" + locale + ".json";
      url = url.replace(/^\\//, "");
      url = window.location.protocol + "//" + window.location.host + "/" + url;
    }
  }

  return $.getJSON(url, function (result) {
    json_object = result;
    Object.keys(json_object).forEach(key => {
      if (key !== "DROPDOWN_NAME")
        Blockly.CatblocksMsgs.locales[locale][key] = json_object[key];
    });
  });
};
`;
fs.writeSync(message_fd, CATBLOCK_MSGS);

// generate for each msg/*.json file a object in catblocks_msgs.js files
const langfiles = fs.readdirSync(JSON_DIR, { encoding: 'utf-8' });
fs.writeSync(message_fd, `\nBlockly.CatblocksMsgs.locales = {\n`);
langfiles.forEach(langfile => {
  if (langfile.match(/.+\.json$/)) {
    const lang_name = langfile.substr(0, langfile.indexOf('.'));
    const json_path = path.join(JSON_DIR, langfile);
    const json_object = JSON.parse(fs.readFileSync(json_path, { encoding: 'utf-8' }));

    fs.writeSync(message_fd, `  "${lang_name}": {`);
    Object.keys(json_object).forEach(key => {
      if (key === "DROPDOWN_NAME") {
        fs.writeSync(message_fd, ` "${key}": "${json_object[key]}" `);
      }
    });
    fs.writeSync(message_fd, `},\n`);
  }
});
fs.writeSync(message_fd, `};`);
fs.closeSync(message_fd);