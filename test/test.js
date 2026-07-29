#!/usr/bin/env node

import { catchOutput } from '../src/index.js';

catchOutput({
  enable: true,
  mailSubject: '#FQDN# program output',
  mailBodyPrefix: 'This is my prefix - FQDN:#FQDN# / HOSTNAME: #HOSTNAME# / PROGLINE: #PROGLINE# / PROGNAME: #PROGNAME# / PROGPATH: #PROGPATH#',
});

console.log('This should go to STDOUT');
console.warn('This should go to STDERR');
