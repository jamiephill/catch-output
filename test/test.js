#!/usr/bin/env node

import { catchOutput } from "../dist/index.js";

catchOutput({
  enable: true,
  mailTo: "root@#FQDN#",
  mailSubject: "#FQDN# program output",
  mailBodyPrefix: "This is my prefix - FQDN:#FQDN# / DOMAIN: #DOMAIN# / HOSTNAME: #HOSTNAME# / PROGLINE: #PROGLINE# / PROGNAME: #PROGNAME# / PROGPATH: #PROGPATH#",
});

console.log("This should go to STDOUT");
console.warn("This should go to STDERR");
