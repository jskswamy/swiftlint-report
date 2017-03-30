const glob = require('glob');
const path = require('path');
const async = require('async');
const readline = require('readline');
const _ = require('lodash');
const fs = require('fs');

const rulesBasePath = '../SwiftLint/Source/SwiftLintFramework/Rules/';
const AttributeMatcher = /(\w*):\s*"([\w\W]*)"/
const ContinuityTester = /\+$/
const DescriptionMatcher = /"([\w\W]*)"/
const KnownAttributes = ['name', 'description', 'identifier']

const GetRuleFiles = new Promise((resolve, reject) => {
  glob(path.join(rulesBasePath, '**/*Rule.swift'), (err, files) => {
    if (err) reject(err);
    else resolve(files);
  });
});

const ExtractRule = (file) => {
  return new Promise((resolve, reject) => {
    const buffer = readline.createInterface({
      input: fs.createReadStream(file)
    });
    const result = {};
    let append = false;
    buffer.on('close', () => resolve({'source': path.basename(file), 'result': result}));
    buffer.on('line', (line) => {
      if (AttributeMatcher.test(line)) {
        let [,name,value] = AttributeMatcher.exec(line)
        if (_.includes(KnownAttributes, name)) {
          result[name] = value;
          append = ContinuityTester.test(line);
        }
      } else if (append) {
        let [,value] = DescriptionMatcher.exec(line)
        result['description'] = `${result['description']}${value}`;
        append = ContinuityTester.test(line);
      }
    })
  })
};

const ParseRules = (files) => {
  return new Promise((resolve, reject) => {
    async.map(files, (file, callback) => {
      ExtractRule(file)
      .then((result) => callback(null, result))
      .catch((err) => callback(err));
    }, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    })
  });
};

GetRuleFiles
.then((files) => ParseRules(files))
.then((result) => {
  console.log(result);
})
.catch((err) => {
  console.log(err);
});
