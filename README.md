# catch-output : node module
Catch Output is a package that will send an email with any output to STDOUT or STDERR.  It's meant to capture and send output from automated programs.

# Build 
```npm run build```

# Install
```npm install git+https://github.com/jamiephill/catch-output.git```

# Usage
```
import { catchOutput } from catch-output;

catchOutput({
  // Options
});
```

# Options
- enable
  - enable / disable catchOutput
  - Default: !process.stdin.isTTY (i.e. enable if the process doesn't have a TTY)
- mailTo
  - Where to send the output
  - Default: root@#fqdn#
- mailFrom
  - Who it is from
  - Default: `"${this.hostname}" <${this.mailTo.split(',')[0].trim()}>`)
- mailSubject
  - Email subject
  - Default: #PROGNAME# output
- mailBodyPrefix
  - Prefix the output with this information
  - Default: `The following output was generated on #HOSTNAME# by '#PROGLINE#'`
- forceMail
  - Send email even if nothing was written to STDOUT or STDERR
  - Default: false
- smtpConfig
  - Object consisting of host, port, tls
  - Default
  ```
  {
    host: 'localhost',
    port: 25,
    tls : {
      rejectUnauthorized: false,
    },
  }
  ```

# Macros
- #FQDN# - Fully qualified domain name
- #DOMAIN# - Domain name
- #HOSTNAME# - Hostname w/o domain name
- #PROGLINE# - Full path to the program plus command line arguments
- #PROGNAME# - Name of the program
- #PROGPATH# - Full path to the program

# Acknowledgements
- **John Jetmore**: For the original concept and design of the Perl utility upon which this program is based.
